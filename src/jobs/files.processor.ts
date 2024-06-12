import { Process, Processor } from '@nestjs/bull';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Job } from 'bull';
import * as ffmpeg from 'fluent-ffmpeg';
import {
  Concurrency,
  Envs,
  IMAGE_STORE_SERVICE_ENDPOINT,
  MainDir,
  PreviewOptions,
  PreviewPostfix,
  Processors,
  SupportedImageExtensions,
} from 'src/common/constants';
import type {
  FileNameWithExt,
  FileNameWithImageExt,
  FileNameWithVideoExt,
  NormalizedVideoPath,
  PreviewPath,
  RemoveExtension,
  SupportedMimetypes,
} from 'src/common/types';
import {
  isSupportedImageExtension,
  isSupportedImageMimeType,
  isSupportedVideoExtension,
  isSupportedVideoMimeType,
} from 'src/common/utils';
import { ConfigService } from 'src/config/config.service';
import type { ImageStoreServiceInputDto } from './dto/image-store-service-input.dto';
import type { ImageStoreServiceOutputDto } from './dto/image-store-service-output.dto';
import { CustomLogger } from 'src/logger/logger.service';

export interface ImagePreviewJob extends FileProcessingJob {
  fileName: FileNameWithImageExt;
  fileType: SupportedMimetypes['image'];
}

export interface VideoPreviewJob extends FileProcessingJob {
  fileName: FileNameWithVideoExt;
  fileType: SupportedMimetypes['video'];
}

export type NameWithPreviewPostfix<T extends FileNameWithExt> =
  `${RemoveExtension<T>}${PreviewPostfix.preview}.${SupportedImageExtensions.jpg}`;

export interface FileProcessingJob {
  fileName: FileNameWithExt;
  fileType: SupportedMimetypes['allFiles'];
  dirName: MainDir;
}
@Processor(Processors.fileProcessor)
export class FileProcessor {
  private readonly logger = new CustomLogger(FileProcessor.name);
  constructor(private configService: ConfigService) {}

  @Process({ concurrency: Concurrency[Processors.fileProcessor] })
  async ProcessingFileJob(
    job: Job<FileProcessingJob>,
  ): Promise<ImageStoreServiceOutputDto> {
    this.logger.startProcess(job.id, 'FileJob 🌄', job.data.fileName);

    try {
      if (this.readyForImagePreview(job.data)) {
        const response = await this.createImagePreview(job.data);
        this.logger.finishProcess(job.id, 'FileJob 🌄', job.data.fileName);
        return response;
      }

      if (this.readyForVideoPreview(job.data)) {
        const previewPath = await this.createVideoPreview(
          job.data.fileName,
          job.data.dirName,
        );
        this.logger.finishProcess(job.id, 'FileJob 🌄', job.data.fileName);
        return { previewPath };
      }

      throw new BadRequestException('Unsupported file type');
    } catch (error) {
      this.logger.errorProcess({
        processId: job.id,
        processName: 'Error processing file 🌄',
        errorData: error,
      });
      throw error;
    }
  }

  addPreviewPostfix<T extends FileNameWithExt>(
    fileName: T,
  ): NameWithPreviewPostfix<T> {
    return `${fileName.replace(/\.\w+$/, `${PreviewPostfix.preview}.${SupportedImageExtensions.jpg}`)}` as NameWithPreviewPostfix<T>;
  }

  readyForImagePreview(jobData: FileProcessingJob): jobData is ImagePreviewJob {
    return (
      isSupportedImageMimeType(jobData.fileType) &&
      isSupportedImageExtension(jobData.fileName)
    );
  }

  readyForVideoPreview(jobData: FileProcessingJob): jobData is VideoPreviewJob {
    return (
      isSupportedVideoMimeType(jobData.fileType) &&
      isSupportedVideoExtension(jobData.fileName)
    );
  }

  async createImagePreview(
    jobData: ImagePreviewJob,
  ): Promise<ImageStoreServiceOutputDto> {
    const url = `${this.configService.imageStoreServiceUrl}/${IMAGE_STORE_SERVICE_ENDPOINT}`;

    const imagePreviewParams: ImageStoreServiceInputDto = {
      inputMainDirName: MainDir.temp,
      fileNameWithExtension: jobData.fileName,
      fileType: jobData.fileType,
      resizeOptionsWidth: PreviewOptions.width,
      resizeOptionsHeight: PreviewOptions.height,
      resizeOptionsFit: PreviewOptions.fit,
      jpegOptionsQuality: PreviewOptions.quality,
    };

    try {
      const response = await axios.get<ImageStoreServiceOutputDto>(url, {
        params: imagePreviewParams,
      });
      return response.data;
    } catch (error) {
      this.logger.errorProcess({
        processName: 'Error processing file 🌄',
        errorData: error,
      });
      throw new HttpException(
        'Error processing image:',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createVideoPreview(
    videoPath: FileNameWithVideoExt,
    mainDir: MainDir,
  ): Promise<PreviewPath> {
    const filePath: NormalizedVideoPath<Envs, MainDir> =
      `${this.configService.rootPaths[MainDir[mainDir]]}/${videoPath}`;
    const previewPath =
      this.addPreviewPostfix<NormalizedVideoPath<Envs, MainDir>>(filePath);

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .screenshots({
          timestamps: PreviewOptions.timestamps,
          size: PreviewOptions.thumbnailSize,
          filename: previewPath,
          folder: this.configService.rootPaths[MainDir[mainDir]],
        })
        .on('end', () => {
          const pathWithoutMainRoot = this.addPreviewPostfix(
            `${MainDir[mainDir]}/${videoPath}`,
          );
          resolve(pathWithoutMainRoot);
        })
        .on('error', (err) => {
          console.error('Error creating video preview:', err.message);
          reject(
            new HttpException(
              'Error creating video preview:',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        });
    });
  }
}
