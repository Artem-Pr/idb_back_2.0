import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Job, Queue } from 'bull';
import { MainDir, PreviewPostfix, Processors } from 'src/common/constants';
import type { FileProcessingJob } from 'src/jobs/files.processor';
import type { ExifData, GetExifJob } from 'src/jobs/exif.processor';
import type { ImageStoreServiceOutputDto } from 'src/jobs/dto/image-store-service-output.dto';
import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
} from 'src/common/types';
import { resolveAllSettled } from 'src/common/utils';
import {
  getFullPathWithoutName,
  getPreviewPath,
  removeMainDir,
} from 'src/common/fileNameHelpers';
import type { UpdateMedia } from './mediaDB.service';
import { DBType, MediaDBService } from './mediaDB.service';
import type { StaticPath } from 'src/config/config.service';
import { ConfigService } from 'src/config/config.service';
import type { MediaTemp } from './entities/media-temp.entity';
import type { UploadFileOutputDto } from './dto/upload-file-output.dto';
import type { Media } from './entities/media.entity';
import type { CheckDuplicatesOriginalNamesOutputDto } from './dto/check-duplicates-original-names-output.dto';
import type { DuplicateFile, GetSameFilesIfExist, ProcessFile } from './types';
import type { CheckDuplicatesFilePathsOutputDto } from './dto/check-duplicates-file-paths-output.dto';
import type { UpdatedFilesInputDto } from './dto/update-files-input.dto';
import { DiscStorageService } from './discStorage.service';
import { CustomLogger } from 'src/logger/logger.service';
import { getKeywordsFromMediaList } from 'src/keywords/helpers/keywordsHelpers';
import { KeywordsService } from 'src/keywords/keywords.service';
import { PathsService } from 'src/paths/paths.service';

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
    private fileQueue: Queue<FileProcessingJob>,
    @InjectQueue(Processors.exifProcessor)
    private exifQueue: Queue<GetExifJob>,
    private mediaDB: MediaDBService,
    private configService: ConfigService,
    private diskStorageService: DiscStorageService,
    private pathsService: PathsService,
    private keywordsService: KeywordsService,
  ) {}

  async saveFiles(filesToUpload: UpdatedFilesInputDto) {
    try {
      const updatedMediaList: UpdateMedia[] =
        await this.updateMediaTempWithNewData(filesToUpload);
      const mediaListWithUpdatedPaths: UpdateMedia[] =
        this.updateMediaPaths(updatedMediaList);
      await this.updateKeywordsList(mediaListWithUpdatedPaths);
      await this.saveUpdatedMediaToDisc(mediaListWithUpdatedPaths);
      const updatedMediaDBList = await this.updateMediaDB(
        mediaListWithUpdatedPaths,
      );
      await this.saveNewDirectories(updatedMediaDBList);
      await this.mediaDB.removeMediaFromTempDB(
        updatedMediaDBList.map(({ _id }) => _id),
      );

      return updatedMediaDBList;
    } catch (error) {
      this.logger.logError({ message: error.message, method: 'saveFiles' });
      throw error;
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

    // TODO: remove this
    if (addedMediaTempFile.originalName === 'fail.HEIC') {
      throw new Error('Failed to read EXIF data');
    }

    const fileData: UploadFileOutputDto = {
      properties: {
        id: addedMediaTempFile._id.toString(),
        changeDate: addedMediaTempFile.changeDate,
        duplicates,
        description: addedMediaTempFile.description,
        exif: addedMediaTempFile.exif,
        filePath: null, // We dont need it for upload
        imageSize: addedMediaTempFile.imageSize,
        keywords: addedMediaTempFile.keywords,
        megapixels: addedMediaTempFile.megapixels,
        mimetype: addedMediaTempFile.mimetype,
        originalDate: addedMediaTempFile.originalDate,
        originalName: addedMediaTempFile.originalName,
        rating: addedMediaTempFile.rating,
        size: addedMediaTempFile.size,
        staticPath: addedMediaTempFile.fullSizeJpg
          ? this.getStaticPath(addedMediaTempFile.fullSizeJpg, MainDir.temp)
          : this.getStaticPath(addedMediaTempFile.filePath, MainDir.temp),
        staticPreview: this.getStaticPath(
          addedMediaTempFile.preview,
          MainDir.temp,
        ),
        timeStamp: addedMediaTempFile.timeStamp,
      },
    };

    return fileData;
  }

  async startAllProcessFileQueues({
    fileName,
    fileType,
  }: Pick<FileProcessingJob, 'fileName' | 'fileType'>): Promise<{
    exifJob: Job<GetExifJob>;
    previewJob: Job<FileProcessingJob>;
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
    previewJob: Job<FileProcessingJob>;
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
    const preparedDuplicates = duplicates.map(
      ({ filePath, fullSizeJpg, originalName, mimetype, preview }) => ({
        filePath,
        mimetype,
        originalName,
        staticPreview: this.getStaticPath(preview, MainDir.previews),
        staticPath: fullSizeJpg
          ? this.getStaticPath(fullSizeJpg, MainDir.previews)
          : this.getStaticPath(filePath, MainDir.volumes),
      }),
    );

    return preparedDuplicates;
  }

  getStaticPath<T extends DBFilePath>(
    filePath: T,
    mainDir: MainDir,
  ): StaticPath<T> {
    return `${this.configService.domain}/${mainDir}${filePath}`;
  }

  private async updateMediaTempWithNewData(
    filesToUpload: UpdatedFilesInputDto,
  ): Promise<UpdateMedia[]> {
    const processData = this.logger.startProcess({
      processName: 'updateMediaTempWithNewData',
    });
    const updatedMediaList = await this.mediaDB.updateMediaList(
      filesToUpload,
      DBType.DBTemp,
    );
    this.logger.finishProcess(processData);

    return updatedMediaList;
  }

  private updateMediaPaths(updatedMediaList: UpdateMedia[]): UpdateMedia[] {
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

  private async saveUpdatedMediaToDisc(
    mediaList: UpdateMedia[],
  ): Promise<void> {
    const processData = this.logger.startProcess({
      processName: 'saveUpdatedMediaToDisc',
    });
    await this.diskStorageService.saveFilesArrToDisk(mediaList, true);
    this.logger.finishProcess(processData);
  }

  private async updateMediaDB(mediaList: UpdateMedia[]): Promise<Media[]> {
    const processData = this.logger.startProcess({
      processName: 'updateMediaDB',
    });
    const mewMediaList = mediaList.map(({ newMedia }) => newMedia);
    const updatedMediaList = await this.mediaDB.addMediaToDB(mewMediaList);
    this.logger.finishProcess(processData);

    return updatedMediaList;
  }

  private async saveNewDirectories(mediaList: Media[]): Promise<void> {
    const processData = this.logger.startProcess({
      processName: 'saveNewDirectories',
    });
    const newDirectoriesSet = new Set(
      mediaList.map(({ filePath }) => getFullPathWithoutName(filePath)),
    );
    await this.pathsService.addPaths(Array.from(newDirectoriesSet));
    this.logger.finishProcess(processData);
  }

  private async updateKeywordsList(mediaList: UpdateMedia[]): Promise<void> {
    const processData = this.logger.startProcess({
      processName: 'updateKeywordsList',
    });

    const newKeywords = getKeywordsFromMediaList(
      mediaList.map(({ newMedia }) => newMedia),
    );
    await this.keywordsService.addKeywords(newKeywords);
    this.logger.finishProcess(processData);
  }
}
