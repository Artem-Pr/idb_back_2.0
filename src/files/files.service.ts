import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Job, Queue } from 'bull';
import { MainDir, Processors } from 'src/common/constants';
import type { FileProcessingJob } from 'src/jobs/files.processor';
import type { ExifData, GetExifJob } from 'src/jobs/exif.processor';
import type { ImageStoreServiceOutputDto } from 'src/jobs/dto/image-store-service-output.dto';
import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
} from 'src/common/types';
import { removeMainDir, resolveAllSettled } from 'src/common/utils';
import { MediaDB } from './mediaDB.service';
import type { StaticPath } from 'src/config/config.service';
import { ConfigService } from 'src/config/config.service';
import type { MediaTemp } from './entities/media-temp.entity';
import type { UploadFileOutputDto } from './dto/upload-file-output.dto';
import type { Media } from './entities/media.entity';
import type { CheckDuplicatesOriginalNamesOutputDto } from './dto/check-duplicates-original-names-output.dto';
import type { DuplicateFile, GetSameFilesIfExist, ProcessFile } from './types';
import type { CheckDuplicatesFilePathsOutputDto } from './dto/check-duplicates-file-paths-output.dto';

interface FilePaths {
  filePath: DBFilePath;
  fullSizePath?: DBFullSizePath;
  previewPath: DBPreviewPath;
}

@Injectable()
export class FilesService {
  constructor(
    @InjectQueue(Processors.fileProcessor)
    private fileQueue: Queue<FileProcessingJob>,
    @InjectQueue(Processors.exifProcessor)
    private exifQueue: Queue<GetExifJob>,
    private mediaDB: MediaDB,
    private configService: ConfigService,
  ) {}

  async processFile(file: ProcessFile): Promise<UploadFileOutputDto> {
    const { filename, mimetype } = file;

    const duplicatesPromise = this.getDuplicatesFromMediaDB({
      originalName: file.originalname,
    });

    const { exifJob, previewJob } = await this.startAllQueues({
      fileName: filename,
      fileType: mimetype,
    });

    const { exifJobResult, previewJobResult } = await this.finishAllQueues({
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
      exif: addedMediaTempFile.exif,
      properties: {
        id: addedMediaTempFile._id.toString(),
        changeDate: addedMediaTempFile.changeDate,
        duplicates,
        description: addedMediaTempFile.description,
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

  async startAllQueues({
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

  async finishAllQueues({
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
}
