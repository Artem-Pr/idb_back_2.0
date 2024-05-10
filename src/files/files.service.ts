import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Job, Queue } from 'bull';
import { MainDir, Processors } from 'src/common/constants';
import type { FileProcessingJob } from 'src/jobs/files.processor';
import type { ExifData, GetExifJob } from 'src/jobs/exif.processor';
import type { ImageStoreServiceOutputDto } from 'src/jobs/dto/image-store-service-output';
import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithExt,
} from 'src/common/types';
import {
  removeExtension,
  removeMainDir,
  resolveAllSettled,
} from 'src/common/utils';
import { MediaDB, ProcessFile } from './mediaDB.service';
import type { StaticDomain } from 'src/config/config.service';
import { ConfigService } from 'src/config/config.service';
import type { MediaTemp } from './entities/media-temp.entity';
import type { Tags } from 'exiftool-vendored';

type StaticPath<T extends DBFilePath = DBFilePath> =
  `${StaticDomain}/${MainDir}${T}`;

interface FilePaths {
  filePath: DBFilePath;
  fullSizePath?: DBFullSizePath;
  previewPath: DBPreviewPath;
}

export interface ProcessFileResultDeprecated {
  DBFullPath: DBPreviewPath;
  DBFullPathFullSize: DBFullSizePath | undefined;
  fullSizeJpg: StaticPath<DBFullSizePath> | undefined;
  fullSizeJpgPath: `uploadTemp(remove)${DBFullSizePath}` | undefined;
  preview: StaticPath<DBPreviewPath>;
  tempPath: `uploadTemp(remove)/${string}`;
  existedFilesArr: {
    filePath: DBFilePath;
    fullSizeJpgPath: StaticPath<DBFullSizePath> | undefined;
    originalName: FileNameWithExt;
    originalPath: StaticPath<DBFilePath>;
    preview: StaticPath<DBPreviewPath>;
  }[];
  newResponse?: ProcessFileResult;
}

export interface ProcessFileResult {
  id: string;
  staticPreview: StaticPath<DBPreviewPath>;
  staticFullSizeJpg: StaticPath<DBFullSizePath> | undefined;
  existedFilesArr: {
    filePath: DBFilePath;
    originalName: FileNameWithExt;
    staticFullSizeJpg: StaticPath<DBFullSizePath> | undefined;
  }[];
  exif: Tags;
}

export interface DuplicateFile {
  filePath: DBFilePath;
  fullSizeJpg: DBFullSizePath | undefined;
  originalName: FileNameWithExt;
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

  async processFile(file: ProcessFile): Promise<ProcessFileResultDeprecated> {
    const { filename, mimetype } = file;

    const duplicatesPromise = this.getDuplicatesFromMediaDB(file.originalname);

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

    const { _id, exif, fullSizeJpg, preview } = addedMediaTempFile;

    const fileData: ProcessFileResult = {
      id: _id.toString(),
      staticPreview: this.getStaticPath(preview, MainDir.temp),
      staticFullSizeJpg: fullSizeJpg
        ? this.getStaticPath(fullSizeJpg, MainDir.temp)
        : undefined,
      existedFilesArr: duplicates.map(
        ({ filePath, fullSizeJpg, originalName }) => ({
          filePath,
          originalName,
          staticFullSizeJpg: fullSizeJpg
            ? this.getStaticPath(fullSizeJpg, MainDir.previews)
            : undefined,
        }),
      ),
      exif,
    };

    const fileDataDeprecated = this.prepareOLDResponse(
      addedMediaTempFile,
      duplicates,
      filename,
    );

    return {
      ...fileDataDeprecated,
      newResponse: fileData,
    };
  }

  // TODO: update logic and remove this helper
  prepareOLDResponse(
    addedMediaTempFile: MediaTemp,
    duplicates: DuplicateFile[],
    filename: FileNameWithExt,
  ): ProcessFileResultDeprecated {
    const { fullSizeJpg, preview } = addedMediaTempFile;
    return {
      DBFullPath: preview,
      DBFullPathFullSize: fullSizeJpg,
      fullSizeJpg: fullSizeJpg
        ? this.getStaticPath(fullSizeJpg, MainDir.temp)
        : undefined,
      fullSizeJpgPath: fullSizeJpg
        ? `uploadTemp(remove)${fullSizeJpg}`
        : undefined,
      preview: this.getStaticPath(preview, MainDir.temp),
      tempPath: `uploadTemp(remove)/${removeExtension(filename)}`,
      existedFilesArr: duplicates.map(
        ({ filePath, fullSizeJpg, originalName }) => ({
          filePath,
          originalName,
          fullSizeJpgPath: fullSizeJpg
            ? this.getStaticPath(fullSizeJpg, MainDir.previews)
            : undefined,
          originalPath: this.getStaticPath(filePath, MainDir.previews),
          preview: this.getStaticPath(preview, MainDir.previews),
        }),
      ),
    };
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

  async getDuplicatesFromMediaDB(
    originalname: FileNameWithExt,
  ): Promise<DuplicateFile[]> {
    const duplicates = await this.mediaDB.getSameFilesIfExist(originalname);
    const preparedDuplicates = duplicates.map(
      ({ filePath, fullSizeJpg, originalName }) => ({
        filePath,
        fullSizeJpg,
        originalName,
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
