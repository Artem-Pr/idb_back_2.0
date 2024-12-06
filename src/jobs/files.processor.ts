import { Process, Processor } from '@nestjs/bull';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Job } from 'bull';
import ffmpeg from 'fluent-ffmpeg';
import { ensureDir } from 'fs-extra';
import { basename, dirname, resolve as pathResolve } from 'path';
import {
  Concurrency,
  IMAGE_STORE_SERVICE_ENDPOINT,
  MainDir,
  PreviewOptions,
  PreviewPostfix,
  Processors,
  SupportedImageMimetypes,
  VideoPreviewOptions,
} from 'src/common/constants';
import type {
  FileNameWithExt,
  FileNameWithImageExt,
  FileNameWithVideoExt,
  SupportedMimetypes,
} from 'src/common/types';
import {
  addPreviewPostfix,
  getPreviewPath,
  isSupportedImageExtension,
  isSupportedImageMimeType,
  isSupportedVideoExtension,
  isSupportedVideoMimeType,
} from 'src/common/fileNameHelpers';
import { ConfigService } from 'src/config/config.service';
import type { ImageStoreServiceInputDto } from './dto/image-store-service-input.dto';
import type { ImageStoreServiceOutputDto } from './dto/image-store-service-output.dto';
import { CustomLogger } from 'src/logger/logger.service';
import { DiscStorageService } from 'src/files/discStorage.service';

export interface ImagePreviewJob extends CreatePreviewJob {
  fileName: FileNameWithImageExt;
  fileType: SupportedMimetypes['image'];
}

export interface VideoPreviewJob extends CreatePreviewJob {
  fileName: FileNameWithVideoExt;
  fileType: SupportedMimetypes['video'];
}

export interface CreatePreviewJob {
  dirName: MainDir;
  fileName: FileNameWithExt;
  fileType: SupportedMimetypes['allFiles'];
  date?: Date;
  videoPreviewOptions?: VideoPreviewOptions;
}

export interface CreateImagePreview extends ImagePreviewJob {
  outputPreviewFilePath: string;
  outputFullSizeFilePath?: string;
}

@Processor(Processors.fileProcessor)
export class FileProcessor {
  private readonly logger = new CustomLogger(FileProcessor.name);
  constructor(
    private configService: ConfigService,
    private diskStorageService: DiscStorageService,
  ) {}

  readyForImagePreview(jobData: CreatePreviewJob): jobData is ImagePreviewJob {
    return (
      isSupportedImageMimeType(jobData.fileType) &&
      isSupportedImageExtension(jobData.fileName)
    );
  }

  readyForVideoPreview(jobData: CreatePreviewJob): jobData is VideoPreviewJob {
    return (
      isSupportedVideoMimeType(jobData.fileType) &&
      isSupportedVideoExtension(jobData.fileName)
    );
  }

  @Process({ concurrency: Concurrency[Processors.fileProcessor] })
  async CreatePreviewsJob(
    job: Job<CreatePreviewJob>,
  ): Promise<ImageStoreServiceOutputDto> {
    const processData = this.logger.startProcess({
      processId: job.id,
      processName: 'FileJob 🌄',
      data: job.data.fileName,
    });

    try {
      if (this.readyForImagePreview(job.data)) {
        const previewPaths = {
          outputPreviewFilePath: this.getPreviewPathWithoutPostfix(
            job.data,
            PreviewPostfix.preview,
          ),
          outputFullSizeFilePath: this.getPreviewPathWithoutPostfix(
            job.data,
            PreviewPostfix.fullSize,
          ),
        };
        const response = await this.createImagePreview({
          ...job.data,
          ...previewPaths,
        });
        this.logger.finishProcess(processData);
        return response;
      }

      if (this.readyForVideoPreview(job.data)) {
        const response = await this.createVideoPreview(job.data);
        this.logger.finishProcess(processData);
        return response;
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

  async createImagePreview({
    dirName,
    fileName,
    fileType,
    outputFullSizeFilePath,
    outputPreviewFilePath,
  }: CreateImagePreview): Promise<ImageStoreServiceOutputDto> {
    const url = `${this.configService.imageStoreServiceUrl}/${IMAGE_STORE_SERVICE_ENDPOINT}`;

    const imagePreviewParams: ImageStoreServiceInputDto = {
      fileNameWithExtension: fileName,
      fileType: fileType,
      inputMainDirName: dirName,
      jpegOptionsQuality: PreviewOptions.quality,
      outputFullSizeFilePath,
      outputPreviewFilePath,
      resizeOptionsFit: PreviewOptions.fit,
      resizeOptionsHeight: PreviewOptions.height,
      resizeOptionsWidth: PreviewOptions.width,
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

  private getPreviewPathWithoutPostfix = <T extends PreviewPostfix>(
    { dirName, fileName, fileType, date }: CreatePreviewJob,
    reviewPostfix: T,
  ) => {
    if (dirName === MainDir.volumes) {
      const previewPathRelative = getPreviewPath({
        originalName: basename(fileName) as FileNameWithExt,
        mimeType: fileType,
        postFix: reviewPostfix,
        date,
      });

      return previewPathRelative;
    }

    return addPreviewPostfix(`/${fileName}`, reviewPostfix);
  };

  async createFullSizePreviewFromVideo(
    resolvedVideoFilePath: string,
    resolvedFullSizePreviewPath: string,
    options?: VideoPreviewOptions,
  ): Promise<void> {
    const resolvedPreviewFolderPath = dirname(resolvedFullSizePreviewPath);
    const fileName = basename(resolvedFullSizePreviewPath);

    await ensureDir(resolvedPreviewFolderPath);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(resolvedVideoFilePath)
        .on('end', () => {
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          this.logger.error(err);
          this.logger.error('ffmpeg stdout:', stdout);
          this.logger.error('ffmpeg stderr:', stderr);
          reject(
            new HttpException(
              'Error creating video preview',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        })
        .takeScreenshots(
          {
            count: 1,
            timemarks: options?.timestamps || PreviewOptions.timestamps,
            // size: options?.thumbnailSize || PreviewOptions.thumbnailSize,
            filename: fileName,
          },
          resolvedPreviewFolderPath,
        );
    });
  }

  async createVideoPreview(
    jobData: VideoPreviewJob,
  ): Promise<ImageStoreServiceOutputDto> {
    const {
      date,
      dirName,
      fileName,
      fileType,
      videoPreviewOptions: options,
    } = jobData;

    const {
      filePathWithRoot,
      fullSizePathWithMainDir,
      fullSizePathWithRoot,
      fullSizePathWithoutRoot,
      previewPathWithoutRoot,
    } = this.diskStorageService.getPreviewPaths({
      date,
      dirName,
      filePath: fileName,
      mimeType: fileType,
    });

    await this.createFullSizePreviewFromVideo(
      pathResolve(filePathWithRoot),
      pathResolve(fullSizePathWithRoot),
      options,
    );

    const preview = await this.createImagePreview({
      dirName: this.diskStorageService.getPreviewMainDir(dirName),
      fileName: fullSizePathWithoutRoot,
      fileType: SupportedImageMimetypes.jpg,
      outputPreviewFilePath: previewPathWithoutRoot,
    });

    return {
      fullSizePath: fullSizePathWithMainDir,
      previewPath: preview.previewPath,
    };
  }

  // async createPreviewFromFullSizePreview(
  //   resolvedFullSizePreviewPath: string,
  //   resolvedPreviewPath: string,
  // ) {
  //   const resolvedPreviewFolderPath = dirname(resolvedFullSizePreviewPath);

  //   await ensureDir(dirname(resolvedPreviewPath));
  //   await ensureDir(resolvedPreviewFolderPath);
  //   await sharp(resolvedFullSizePreviewPath)
  //     .withMetadata()
  //     .jpeg({
  //       quality: PreviewOptions.quality,
  //     })
  //     .resize({
  //       width: PreviewOptions.width,
  //       height: PreviewOptions.height,
  //       fit: PreviewOptions.fit,
  //     })
  //     .toFile(resolvedPreviewPath)
  //     .catch((err) => {
  //       this.logger.logError({
  //         message: 'Error creating video preview',
  //         method: 'createVideoPreview',
  //         errorData: err,
  //       });
  //       throw new HttpException(
  //         'Error creating video preview',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     });
  // }
}
