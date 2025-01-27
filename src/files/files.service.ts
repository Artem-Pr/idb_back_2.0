import { InjectQueue } from '@nestjs/bull';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Job, Queue } from 'bull';
import { MainDir, PreviewPostfix, Processors } from 'src/common/constants';
import type { CreatePreviewJob } from 'src/jobs/files.processor';
import type { ExifData, GetExifJob } from 'src/jobs/exif.processor';
import type { ImageStoreServiceOutputDto } from 'src/jobs/dto/image-store-service-output.dto';
import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithVideoExt,
} from 'src/common/types';
import { shallowCopyOfMedia } from 'src/common/utils';
import { resolveAllSettled } from 'src/common/customPromise';
import {
  getFullPathWithoutNameAndFirstSlash,
  getPreviewPath,
  isSupportedVideoMimeType,
  removeExtraSlashes,
  removeMainDir,
} from 'src/common/fileNameHelpers';
import type { UpdateMedia } from './mediaDB.service';
import { DBType, MediaDBService } from './mediaDB.service';
import type { StaticPath } from 'src/config/config.service';
import { ConfigService } from 'src/config/config.service';
import type { MediaTemp } from './entities/media-temp.entity';
import type { UploadFileOutputDto } from './dto/upload-file-output.dto';
import { Media } from './entities/media.entity';
import type { CheckDuplicatesOriginalNamesOutputDto } from './dto/check-duplicates-original-names-output.dto';
import type {
  DuplicateFile,
  GetSameFilesIfExist,
  MediaOutput,
  ProcessFile,
  StaticPathsObj,
} from './types';
import type { CheckDuplicatesFilePathsOutputDto } from './dto/check-duplicates-file-paths-output.dto';
import type { UpdatedFilesInputDto } from './dto/update-files-input.dto';
import { DiscStorageService } from './discStorage.service';
import { CustomLogger } from 'src/logger/logger.service';
import { getKeywordsFromMediaList } from 'src/keywords/helpers/keywordsHelpers';
import { KeywordsService } from 'src/keywords/keywords.service';
import { PathsService } from 'src/paths/paths.service';
import type { GetFilesInputDto } from './dto/get-files-input.dto';
import { isEmpty, omit, pickBy } from 'ramda';
import type { GetFilesOutputDto } from './dto/get-files-output.dto';
import type { DeleteFilesInputDto } from './dto/delete-files-input.dto';
import { LogMethod } from 'src/logger/logger.decorator';
import { getVideoDurationInMillisecondsFromExif } from 'src/common/exifHelpers';
import { parseTimeStampToMilliseconds } from 'src/common/datesHelper';
import { CustomPromise } from 'src/common/customPromise';
import type { UpdateFilesOutputDto } from './dto/update-files-output.dto';

interface FilePaths {
  filePath: DBFilePath;
  fullSizePath?: DBFullSizePath;
  previewPath: DBPreviewPath;
}

@Injectable()
export class FilesService {
  private readonly logger = new CustomLogger(FilesService.name);
  constructor(
    @InjectQueue(Processors.fileProcessor)
    private fileQueue: Queue<CreatePreviewJob>,
    @InjectQueue(Processors.exifProcessor)
    private exifQueue: Queue<GetExifJob>,
    private mediaDB: MediaDBService,
    private configService: ConfigService,
    private diskStorageService: DiscStorageService,
    private pathsService: PathsService,
    private keywordsService: KeywordsService,
  ) {}

  private makeMediaOutputFromMedia({
    media,
    mainDirPreview,
    mainDirFilePath,
    customFields,
  }: {
    media: Media;
    mainDirPreview: MainDir;
    mainDirFilePath: MainDir;
    customFields?: Partial<MediaOutput>;
  }): MediaOutput {
    return {
      ...omit(['_id', 'preview', 'fullSizeJpg'], media),
      id: media._id.toString(),
      duplicates: customFields?.duplicates || [],
      ...this.getStaticPathsFromMedia(media, mainDirFilePath, mainDirPreview),
      ...customFields,
    };
  }

  async getFiles(getFilesInput: GetFilesInputDto): Promise<GetFilesOutputDto> {
    const mediaDBResponse = await this.mediaDB.getFiles(getFilesInput);
    if (!mediaDBResponse) {
      return {
        dynamicFolders: [],
        files: [],
        filesSizeSum: 0,
        searchPagination: {
          currentPage: 1,
          nPerPage: 0,
          resultsCount: 0,
          totalPages: 1,
        },
      };
    }

    const mediaOutputList = mediaDBResponse.files.map((media) =>
      this.makeMediaOutputFromMedia({
        media,
        mainDirFilePath: MainDir.volumes,
        mainDirPreview: MainDir.previews,
      }),
    );

    return {
      ...mediaDBResponse,
      files: mediaOutputList,
    };
  }

  private async updateKeywordsList(mediaList: UpdateMedia[]): Promise<void> {
    const newKeywords = getKeywordsFromMediaList(
      mediaList.map(({ newMedia }) => newMedia),
    );
    await this.keywordsService.addKeywords(newKeywords);
  }

  private async saveNewDirectories(mediaList: Media[]): Promise<void> {
    const newDirectoriesSet = new Set(
      mediaList.map(({ filePath }) =>
        getFullPathWithoutNameAndFirstSlash(filePath),
      ),
    );
    const newDirectoriesWithSubDirs =
      this.pathsService.getDirAndSubfoldersFromArray(
        Array.from(newDirectoriesSet),
      );
    await this.pathsService.addPathsToDB(newDirectoriesWithSubDirs);
  }

  private async saveMediaListToDB(mediaList: UpdateMedia[]): Promise<Media[]> {
    const mewMediaList = mediaList.map(({ newMedia }) => newMedia);
    const updatedMediaList = await this.mediaDB.addMediaToDB(mewMediaList);

    return updatedMediaList;
  }

  private generatePreviewPathsForNewMedia(
    updatedMediaList: UpdateMedia[],
  ): UpdateMedia[] {
    return updatedMediaList.map(({ oldMedia, newMedia }) => ({
      oldMedia,
      newMedia: {
        ...newMedia,
        preview: getPreviewPath({
          originalName: newMedia.originalName,
          mimeType: newMedia.mimetype,
          postFix: PreviewPostfix.preview,
          date: newMedia.originalDate,
        }),
        fullSizeJpg:
          oldMedia.fullSizeJpg && newMedia.fullSizeJpg
            ? getPreviewPath({
                originalName: newMedia.originalName,
                mimeType: newMedia.mimetype,
                postFix: PreviewPostfix.fullSize,
                date: newMedia.originalDate,
              })
            : null,
      },
    }));
  }

  @LogMethod('saveFiles')
  async saveFiles(filesToUpload: UpdatedFilesInputDto): Promise<Media[]> {
    let mediaDataForRestore: Media[] = [];

    try {
      const updatedMediaList: UpdateMedia[] =
        await this.mediaDB.getUpdatedMediaList(filesToUpload, DBType.DBTemp);
      const mediaListWithUpdatedPaths: UpdateMedia[] =
        this.generatePreviewPathsForNewMedia(updatedMediaList);
      mediaDataForRestore = await this.saveMediaListToDB(
        mediaListWithUpdatedPaths,
      );
      await this.updateKeywordsList(mediaListWithUpdatedPaths);
      await this.saveNewDirectories(mediaDataForRestore);
      await this.diskStorageService.moveMediaToNewDir(
        mediaListWithUpdatedPaths,
        MainDir.temp,
      );
      await this.mediaDB.deleteMediaFromTempDB(
        mediaDataForRestore.map(({ _id }) => _id),
      );

      return mediaDataForRestore;
    } catch (error) {
      this.logger.logError({ message: error.message, method: 'saveFiles' });
      mediaDataForRestore.length &&
        this.restoreDBDataIfCreationError(mediaDataForRestore);
      throw new InternalServerErrorException(error?.message);
    }
  }

  @LogMethod('stopAllPreviewJobs')
  async stopAllPreviewJobs(): Promise<void> {
    // TODO: finish all jobs to make sure that previewJob.finished() is executed
    return this.fileQueue.obliterate({ force: true });
  }

  async updatePreviews(
    mediaWithNewTimeStamp: Media,
    originalFilePath: DBFilePath, // in case filePath is updated
    outputDirName?: MainDir, // not needed for Video, dirName will be used
  ): Promise<Media> {
    const { mimetype, timeStamp, originalDate } = mediaWithNewTimeStamp;
    const previewJob = await this.fileQueue.add({
      dirName: MainDir.volumes,
      outputDirName,
      fileName: removeExtraSlashes(originalFilePath) as FileNameWithVideoExt,
      fileType: mimetype,
      date: originalDate,
      videoPreviewOptions: {
        timestamps: timeStamp ? [timeStamp] : undefined,
      },
    });

    const previewJobResult: ImageStoreServiceOutputDto =
      await previewJob.finished();

    const preview = removeMainDir(previewJobResult.previewPath);
    const fullSize = previewJobResult.fullSizePath
      ? removeMainDir(previewJobResult.fullSizePath)
      : null;

    const newMediaWithUpdatedPreviews = shallowCopyOfMedia(
      mediaWithNewTimeStamp,
    );
    newMediaWithUpdatedPreviews.preview = preview;
    newMediaWithUpdatedPreviews.fullSizeJpg = fullSize;

    return newMediaWithUpdatedPreviews;
  }

  @LogMethod('updateVideoPreviewsWithNewTimeStamp')
  private async updateVideoPreviewsWithNewTimeStamp(
    updatedMediaList: UpdateMedia[],
  ): Promise<{
    updatedMediaList: UpdateMedia[];
    errors: UpdateFilesOutputDto['errors'];
  }> {
    const previewJobsPromises = updatedMediaList.map(
      ({ newMedia, oldMedia }) => {
        return new CustomPromise<UpdateMedia>(async (resolve, reject) => {
          const needToUpdatePreview = (
            newMedia: Media,
          ): newMedia is Media & { timeStamp: string } =>
            Boolean(
              newMedia.timeStamp && newMedia.timeStamp !== oldMedia.timeStamp,
            );

          if (!needToUpdatePreview(newMedia)) {
            resolve({ newMedia, oldMedia });
            return;
          }

          const isVideoShorterThenTimeStamp =
            parseTimeStampToMilliseconds(newMedia.timeStamp) >
            (getVideoDurationInMillisecondsFromExif(newMedia.exif) || Infinity);

          if (isVideoShorterThenTimeStamp) {
            oldMedia.timeStamp && (newMedia.timeStamp = oldMedia.timeStamp);
            reject({
              originalValue: { newMedia, oldMedia },
              errorMessage: `TimeStamp is not updated, video is shorter then timeStamp: ${newMedia.filePath}`,
            });
            return;
          }

          resolve({
            newMedia: await this.updatePreviews(newMedia, oldMedia.filePath),
            oldMedia,
          });
        });
      },
    );

    const results = await CustomPromise.allSettled(previewJobsPromises, {
      dontRejectIfError: true,
    });

    return CustomPromise.separateResolvedAndRejectedEntities(results);
  }

  private async removeAbandonedPreviews(updatedMediaList: UpdateMedia[]) {
    const mediasWithAbandonedPreviews = updatedMediaList
      .filter(
        ({ oldMedia, newMedia }) =>
          oldMedia.preview &&
          newMedia.timeStamp &&
          newMedia.timeStamp !== oldMedia.timeStamp,
      )
      .map(({ oldMedia }) => oldMedia);

    await this.diskStorageService.removePreviews(
      this.pathsService.getPreviewsAndFullPathsFormMediaList(
        mediasWithAbandonedPreviews,
      ),
    );
  }

  @LogMethod('updateFiles')
  async updateFiles(
    filesToUpdate: UpdatedFilesInputDto,
  ): Promise<UpdateFilesOutputDto> {
    let mediaDataForRestore: Media[] = [];

    await this.validateDuplicates(filesToUpdate);

    try {
      const updatedMediaListWithoutUpdatingPreviews: UpdateMedia[] =
        await this.mediaDB.getUpdatedMediaList(filesToUpdate, DBType.DBMedia);

      mediaDataForRestore = updatedMediaListWithoutUpdatingPreviews.map(
        ({ oldMedia }) => oldMedia,
      );

      const { updatedMediaList, errors } =
        await this.updateVideoPreviewsWithNewTimeStamp(
          updatedMediaListWithoutUpdatingPreviews,
        );

      const updatedMediaDBList = updatedMediaList.map(
        ({ newMedia }) => newMedia,
      );
      await this.mediaDB.replaceMediaInDB(updatedMediaDBList);
      await this.updateKeywordsList(updatedMediaList);
      await this.saveNewDirectories(updatedMediaDBList);
      await this.diskStorageService.moveMediaToNewDir(
        updatedMediaList,
        MainDir.volumes,
      );
      await this.removeAbandonedPreviews(updatedMediaList);

      return { response: updatedMediaDBList, errors };
    } catch (error) {
      this.logger.logError({ message: error.message, method: 'updateFiles' });
      mediaDataForRestore.length &&
        this.restoreDBDataIfUpdatingError(mediaDataForRestore);
      throw new InternalServerErrorException(error?.message);
    }
  }

  async processFile(file: ProcessFile): Promise<UploadFileOutputDto> {
    const { filename, mimetype } = file;

    const duplicatesPromise = this.getDuplicatesFromMediaDB({
      originalName: file.originalname,
    });

    const { exifJob, previewJob } = await this.startAllProcessFileQueues({
      fileName: filename,
      fileType: mimetype,
    });

    const { exifJobResult, previewJobResult } =
      await this.finishAllProcessFileQueues({
        exifJob,
        previewJob,
      });

    const addedMediaTempFilePromise = this.pushFileToMediaDBTemp(
      file,
      previewJobResult,
      exifJobResult,
    );

    const [duplicates, addedMediaTempFile] = await resolveAllSettled([
      duplicatesPromise,
      addedMediaTempFilePromise,
    ]);

    const properties = this.makeMediaOutputFromMedia({
      media: addedMediaTempFile,
      mainDirFilePath: MainDir.temp,
      mainDirPreview: MainDir.temp,
      customFields: { duplicates },
    });

    const fileData: UploadFileOutputDto = {
      properties: {
        ...properties,
        filePath: null,
      },
    };

    return fileData;
  }

  async startAllProcessFileQueues({
    fileName,
    fileType,
  }: Pick<CreatePreviewJob, 'fileName' | 'fileType'>): Promise<{
    exifJob: Job<GetExifJob>;
    previewJob: Job<CreatePreviewJob>;
  }> {
    const exifJob = await this.exifQueue.add({
      filePaths: [fileName],
      mainDir: MainDir.temp,
    });

    const previewJob = await this.fileQueue.add({
      fileName,
      fileType,
      dirName: MainDir.temp,
    });

    return { exifJob, previewJob };
  }

  async finishAllProcessFileQueues({
    exifJob,
    previewJob,
  }: {
    exifJob: Job<GetExifJob>;
    previewJob: Job<CreatePreviewJob>;
  }): Promise<{
    exifJobResult: ExifData;
    previewJobResult: ImageStoreServiceOutputDto;
  }> {
    const exifJobResult: ExifData = await exifJob.finished();
    const previewJobResult: ImageStoreServiceOutputDto =
      await previewJob.finished();

    return { exifJobResult, previewJobResult };
  }

  async pushFileToMediaDBTemp(
    file: ProcessFile,
    previewJobResult: ImageStoreServiceOutputDto,
    exifJobResult: ExifData,
  ): Promise<MediaTemp> {
    const preparedFilePaths: FilePaths = {
      filePath: `/${file.filename}`,
      previewPath: removeMainDir(previewJobResult.previewPath),
      fullSizePath: previewJobResult.fullSizePath
        ? removeMainDir(previewJobResult.fullSizePath)
        : undefined,
    };

    const mediaTempResponse = await this.mediaDB.addFileToDBTemp(
      exifJobResult[file.filename],
      preparedFilePaths,
      file,
    );

    return mediaTempResponse;
  }

  async getDuplicatesFromMediaDBByOriginalNames(
    originalNameList: Media['originalName'][],
  ): Promise<CheckDuplicatesOriginalNamesOutputDto> {
    const duplicatesPromise = originalNameList.map((originalName) =>
      this.getDuplicatesFromMediaDB({ originalName }),
    );

    const duplicates = await resolveAllSettled(duplicatesPromise);

    return originalNameList.reduce<
      Record<string, UploadFileOutputDto['properties']['duplicates']>
    >(
      (acc, originalName, index) => ({
        ...acc,
        [originalName]: duplicates[index],
      }),
      {},
    );
  }

  async getDuplicatesFromMediaDBByFilePaths(
    filePathList: Media['filePath'][],
  ): Promise<CheckDuplicatesFilePathsOutputDto> {
    const duplicatesPromise = filePathList.map((filePath) =>
      this.getDuplicatesFromMediaDB({ filePath }),
    );

    const duplicates = await resolveAllSettled(duplicatesPromise);

    return filePathList.reduce<
      Record<string, UploadFileOutputDto['properties']['duplicates']>
    >(
      (acc, filePathList, index) => ({
        ...acc,
        [filePathList]: duplicates[index],
      }),
      {},
    );
  }

  async getDuplicatesFromMediaDB(
    where: GetSameFilesIfExist,
  ): Promise<DuplicateFile[]> {
    const duplicates = await this.mediaDB.getSameFilesIfExist(where);
    const preparedDuplicates = duplicates.map((media) => {
      const { exif, filePath, mimetype, originalName } = media;
      return {
        exif,
        filePath,
        mimetype,
        originalName,
        ...this.getStaticPathsFromMedia(
          media,
          MainDir.volumes,
          MainDir.previews,
        ),
      };
    });

    return preparedDuplicates;
  }

  private async validateDuplicates(
    filesToUpdate: UpdatedFilesInputDto,
  ): Promise<void> {
    const newFilePaths = filesToUpdate.files
      .map(({ updatedFields }) => updatedFields.filePath)
      .filter(Boolean);
    const mappedNewFilePathsWithDuplicates =
      await this.getDuplicatesFromMediaDBByFilePaths(newFilePaths);

    const duplicates = pickBy<
      CheckDuplicatesFilePathsOutputDto,
      CheckDuplicatesFilePathsOutputDto
    >((value) => value.length, mappedNewFilePathsWithDuplicates);

    if (!isEmpty(duplicates)) {
      throw new ConflictException('Files already exist', {
        cause: duplicates,
      });
    }
  }

  async deleteFilesByIds(ids: DeleteFilesInputDto['ids']): Promise<void> {
    try {
      const mediaList = await this.mediaDB.deleteMediaByIds(ids);
      const notDeletedMediaList: Media[] =
        await this.diskStorageService.removeFilesAndPreviews(mediaList);

      if (notDeletedMediaList.length) {
        await this.restoreDataIfDeletionError(notDeletedMediaList);
      }
    } catch (error) {
      this.logger.logError({
        message: error.message || error,
        method: 'deleteFilesByIds',
        errorData: { ids },
      });
      throw new InternalServerErrorException(error.message || error);
    }
  }

  async cleanTemp(): Promise<void> {
    const emptyDirPromise = this.diskStorageService.emptyDirectory();
    const emptyDBPromise = this.mediaDB.emptyTempDB();

    await resolveAllSettled([emptyDirPromise, emptyDBPromise]);
  }

  private async restoreDataIfDeletionError(mediaList: Media[]): Promise<void> {
    await this.mediaDB.addMediaToDB(mediaList);
  }
  private async restoreDBDataIfCreationError(
    mediaList: Media[],
  ): Promise<void> {
    await this.mediaDB.deleteMediaByIds(
      mediaList.map(({ _id }) => _id.toHexString()),
    );
  }

  private async restoreDBDataIfUpdatingError(
    mediaList: Media[],
  ): Promise<void> {
    await this.mediaDB.updateMediaInDB(mediaList);
  }

  getStaticPath<T extends DBFilePath>(
    filePath: T,
    mainDir: MainDir,
  ): StaticPath<T> {
    return `${this.configService.domain}/${mainDir}${filePath}`;
  }

  getStaticPathsFromMedia(
    media: Media,
    mainDirFilePath: MainDir,
    mainDirPreview: MainDir,
  ): StaticPathsObj {
    const isVideo = isSupportedVideoMimeType(media.mimetype);

    return {
      staticPath:
        !isVideo && media.fullSizeJpg
          ? this.getStaticPath(media.fullSizeJpg, mainDirPreview)
          : this.getStaticPath(media.filePath, mainDirFilePath),
      staticPreview: this.getStaticPath(media.preview, mainDirPreview),
      staticVideoFullSize:
        isVideo && media.fullSizeJpg
          ? this.getStaticPath(media.fullSizeJpg, mainDirPreview)
          : null,
    };
  }
}
