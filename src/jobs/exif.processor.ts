import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import type { Tags } from 'exiftool-vendored';
import { ExifTool } from 'exiftool-vendored';
import { keys } from 'ramda';
import {
  EXIFTOOL_TASK_TIMEOUT_MILLIS,
  Concurrency,
  Processors,
  MainDir,
} from 'src/common/constants';
import type { FileNameWithExt, NormalizedMediaPath } from 'src/common/types';
import { ConfigService } from 'src/config/config.service';
import { CustomLogger } from 'src/logger/logger.service';

export type ExifData = Record<FileNameWithExt, Tags>;

export interface GetExifJob {
  filePaths: FileNameWithExt[];
  mainDir: MainDir;
}

@Processor(Processors.exifProcessor)
export class ExifProcessor {
  private readonly logger = new CustomLogger(ExifProcessor.name);
  private readonly exiftool = new ExifTool({
    taskTimeoutMillis: EXIFTOOL_TASK_TIMEOUT_MILLIS,
  });

  constructor(private configService: ConfigService) {}

  async onModuleDestroy() {
    await this.exiftool.end();
  }

  @Process({ concurrency: Concurrency[Processors.exifProcessor] })
  async processGetExifJob(job: Job<GetExifJob>): Promise<ExifData> {
    this.logger.startProcess({
      processId: job.id,
      processName: 'getExif 📄',
      data: job.data.filePaths,
    });

    const exifData = await this.getExifFromPhoto(job.data);

    this.logger.finishProcess({
      processId: job.id,
      processName: 'getExif 📄',
      data: keys(exifData).map((key) => ({
        [key]: `${keys(exifData[key]).length} fields`,
      })),
    });

    return exifData;
  }

  private async getExifFromPhoto(
    { filePaths, mainDir }: GetExifJob,
    processId?: string | number,
  ): Promise<ExifData> {
    const exifData: ExifData = {};

    try {
      for (const filePath of filePaths) {
        const previewPath: NormalizedMediaPath = `${this.configService.mainDirPath}/${mainDir}/${filePath}`;

        const exif = await this.exiftool.read(previewPath);
        exifData[filePath] = exif;
      }
    } catch (error) {
      this.logger.errorProcess(
        {
          processId,
          processName: 'Error reading EXIF data 📄',
        },
        error.message || error,
      );
      throw new Error('Failed to read EXIF data');
    }

    return exifData;
  }
}
