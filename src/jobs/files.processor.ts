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
} from 'src/common/constants';
import type {
  FileNameWithExt,
  FileNameWithImageExt,
  FileNameWithVideoExt,
  NormalizedVideoPath,
  PreviewPath,
  SupportedMimetypes,
} from 'src/common/types';
import {
  addPreviewPostfix,
  isSupportedImageExtension,
  isSupportedImageMimeType,
  isSupportedVideoExtension,
  isSupportedVideoMimeType,
} from 'src/common/fileNameHelpers';
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

export interface FileProcessingJob {
  fileName: FileNameWithExt;
  fileType: SupportedMimetypes['allFiles'];
  dirName: MainDir;
}

export class FileProcessorBasic {
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
}

@Processor(Processors.fileProcessor)
export class FileProcessor extends FileProcessorBasic {
  private readonly logger = new CustomLogger(FileProcessor.name);
  constructor(private configService: ConfigService) {
    super();
  }

  @Process({ concurrency: Concurrency[Processors.fileProcessor] })
  async ProcessingFileJob(
    job: Job<FileProcessingJob>,
  ): Promise<ImageStoreServiceOutputDto> {
    const processData = this.logger.startProcess({
      processId: job.id,
      processName: 'FileJob 🌄',
      data: job.data.fileName,
    });

    try {
      if (this.readyForImagePreview(job.data)) {
        const response = await this.createImagePreview(job.data);
        this.logger.finishProcess(processData);
        return response;
      }

      if (this.readyForVideoPreview(job.data)) {
        const previewPath = await this.createVideoPreview(
          job.data.fileName,
          job.data.dirName,
        );
        this.logger.finishProcess(processData);
        return { previewPath };
      }

      throw new BadRequestException('Unsupported file type');
    } catch (error) {
      this.logger.errorProcess(
        {
          processId: job.id,
          processName: 'Error processing file 🌄',
        },
        error,
      );
      throw error;
    }
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
      this.logger.errorProcess(
        {
          processName: 'Error processing file 🌄',
        },
        error,
      );
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
      `${this.configService.rootPaths[mainDir]}/${videoPath}`;
    const previewPath = addPreviewPostfix(filePath, PreviewPostfix.preview);

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .screenshots({
          timestamps: PreviewOptions.timestamps,
          size: PreviewOptions.thumbnailSize,
          filename: previewPath,
          folder: this.configService.rootPaths[mainDir],
        })
        .on('end', () => {
          const pathWithoutMainRoot = addPreviewPostfix(
            `${mainDir}/${videoPath}`,
            PreviewPostfix.preview,
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
