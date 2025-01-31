import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { MediaDBService } from 'src/files/mediaDB.service';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import { WebSocketActions, WSApiStatus } from './constants';
import {
  FilesDataWSActionOutputDto,
  FilesDataWSOutputDto,
} from './dto/files-data-ws-output.dto';
import { MainDir, Processors } from 'src/common/constants';
import { CustomLogger } from 'src/logger/logger.service';
import { deepCopy } from 'src/common/utils';
import type { FilesDataWSInputDto } from './dto/files-data-ws-input.dto';
import { Media } from 'src/files/entities/media.entity';
import { nanosecondsToFormattedString } from 'src/common/datesHelper';
import { CustomPromise } from 'src/common/customPromise';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import type { ExifData, GetExifJob } from 'src/jobs/exif.processor';

@Injectable()
export class UpdateExifWSService {
  private readonly logger = new CustomLogger(UpdateExifWSService.name);
  private _progress = 0;
  private _timerStartTime: bigint = 0n;
  _status = WSApiStatus.READY;

  constructor(
    private mediaDBService: MediaDBService,
    @Inject(forwardRef(() => FilesDataWSGateway))
    private readonly filesDataWSGateway: FilesDataWSGateway,
    @InjectQueue(Processors.exifProcessor)
    private exifQueue: Queue<GetExifJob>,
  ) {}

  get progress(): number {
    return this._progress;
  }

  set progress(value: number) {
    this._progress = value;
  }

  get status(): WSApiStatus {
    return this._status;
  }

  async stopProcess(): Promise<void> {
    this.commitStopStatus();
    // TODO: finish all jobs to make sure that previewJob.finished() is executed
    await this.exifQueue.obliterate({ force: true });
  }

  async startProcess(data: FilesDataWSInputDto): Promise<void> {
    if (this.status !== WSApiStatus.READY) {
      this.sendProcessIsBusy();
      return;
    }

    this.commitProcessInitStatus();

    const mediaFilesToUpdate = await this.getFilePathListToUpdate(data, 5);
    const mediaFilesWithUpdatedPreviews = await this.getExifList(
      mediaFilesToUpdate,
      90,
    );
    await this.updateMediaFilesInDB(mediaFilesWithUpdatedPreviews, 5);

    this.commitDoneStatus();
  }

  private async getFilePathListToUpdate(
    { folderPath, mimeTypes }: FilesDataWSInputDto,
    progress: number = 0,
  ): Promise<Pick<Media, '_id' | 'filePath'>[]> {
    this.commitPendingStatus('Loading total elements to update ...');

    return this.mediaDBService
      .findFilePathsForMediaInFolder({
        mimeTypes,
        folderPath,
      })
      .then((emptyPreviews) => {
        this.commitSuccessStatus(
          `Total elements to update: ${emptyPreviews.length}`,
          progress,
        );
        return emptyPreviews;
      })
      .catch((error) => {
        this.commitErrorStatus('Error loading total elements to update', error);
        return [] as Pick<Media, '_id' | 'filePath'>[];
      });
  }

  private async getExifList(
    mediaFiles: Pick<Media, '_id' | 'filePath'>[],
    progress: number = 0,
  ): Promise<Pick<Media, '_id' | 'exif'>[]> {
    if (!mediaFiles.length) {
      this.commitSuccessStatus('No media files to update', progress);
      return [];
    }
    this.commitPendingStatus('Start getting EXIF process ...');
    let previewIndex = 0;
    const currentProgress = this.progress;
    const progressForOneFile = ((progress / mediaFiles.length) * 100) / 100;

    const gettingExifPromises = mediaFiles.map((media) => {
      return new CustomPromise<Pick<Media, '_id' | 'exif'>>(
        async (resolve, reject) => {
          const exifJob = await this.exifQueue.add({
            filePaths: [media.filePath],
            mainDir: MainDir.volumes,
          });

          return exifJob
            .finished()
            .then((exifData: ExifData) => {
              this.progress =
                currentProgress + progressForOneFile * ++previewIndex;
              this.commitStatus({
                status: WSApiStatus.PENDING,
                message: `${previewIndex}/${mediaFiles.length}: Fetched EXIF data for ${media.filePath}`,
              });

              resolve({ _id: media._id, exif: exifData[media.filePath] });
            })
            .catch((error) => {
              const errorMessage = `Error getting EXIF data for ${media.filePath}`;
              this.commitStatus({
                status: WSApiStatus.PENDING_ERROR,
                message: errorMessage,
                progressInc: progressForOneFile,
                error,
              });

              reject({ errorMessage });
            });
        },
      );
    });

    const exifPromises = await CustomPromise.allSettled(gettingExifPromises, {
      dontRejectIfError: true,
    });

    const { resolvedList: exifList, errors: exifErrors } =
      CustomPromise.separateResolvedAndRejectedEntities(exifPromises);

    if (exifErrors.length) {
      this.commitStatus({
        status: WSApiStatus.PENDING_ERROR,
        message: `Error getting EXIF for ${exifErrors.length} files`,
      });
    }

    this.commitSuccessStatus(
      `Finished getting EXIF for ${exifList.length} files`,
    );

    return exifList;
  }

  private async updateMediaFilesInDB(
    mediaFiles: Pick<Media, '_id' | 'exif'>[],
    progress: number = 0,
  ): Promise<void> {
    if (!mediaFiles.length) {
      this.commitSuccessStatus('No media files to update in DB', progress);
      return;
    }
    this.commitPendingStatus('Start updating media files in DB ...');

    await this.mediaDBService
      .updateMediaInDB(mediaFiles)
      .then((result) => {
        this.logger.debug('modified data', deepCopy(result));

        this.commitSuccessStatus(
          `Number of updated media files in DB: ${result.modifiedCount}`,
          progress,
        );
      })
      .catch((error) => {
        this.commitErrorStatus('Error updating media files in DB', error);
      });
  }

  private commitPendingStatus(message: string) {
    this.commitStatus({
      status: WSApiStatus.PENDING,
      message,
    });
  }

  private commitSuccessStatus(message: string, progressInc?: number) {
    this.commitStatus({
      status: WSApiStatus.PENDING_SUCCESS,
      message,
      progressInc,
    });
  }

  private commitErrorStatus(message: string, error?: Error) {
    const time = this.endTimer();
    this.logger.logError({
      message: `The process has failed in ${time}`,
    });
    this.commitStatus({
      status: WSApiStatus.ERROR,
      message,
      error,
    });
  }

  private commitDoneStatus() {
    const time = this.endTimer();
    this.progress = 100;
    this.commitStatus({
      status: WSApiStatus.DONE,
      message: `Preview sync is complete in ${time}`,
    });
    this.resetProgress();
  }

  private commitStopStatus() {
    const time = this.endTimer();
    this.commitStatus({
      status: WSApiStatus.STOPPED,
      message: `Preview sync is stopped in ${time}`,
    });
    this.resetProgress();
  }

  private commitProcessInitStatus() {
    this.startTimer();
    this.commitStatus({
      status: WSApiStatus.INIT,
      message: 'Process started',
    });
  }

  private commitStatus({
    status,
    message,
    progressInc,
    error,
  }: {
    status: WSApiStatus;
    message: string;
    progressInc?: number;
    error?: Error;
  }) {
    this._status = status;
    progressInc && this.increaseProgress(progressInc);
    const progress = Math.round(this.progress);
    const filesData = new FilesDataWSOutputDto(
      this.status,
      `progress: ${progress}%, ${message}`,
    );
    filesData.progress = progress;
    error && (filesData.developerMessage = error?.message || String(error));

    this.sendEvent(filesData);
  }

  private startTimer(): void {
    this._timerStartTime = process.hrtime.bigint();
  }

  private endTimer(): string {
    const startTime = this._timerStartTime;
    if (startTime) {
      const processEndTime = process.hrtime.bigint();
      const duration = processEndTime - startTime;
      this._timerStartTime = 0n;
      const time = nanosecondsToFormattedString(duration);
      return time || '';
    } else {
      return '';
    }
  }

  private increaseProgress(progress: number) {
    this.progress = this.progress + progress;
  }

  private resetProgress() {
    this.progress = 0;
    this._status = WSApiStatus.READY;
  }

  private sendProcessIsBusy() {
    const filesData = new FilesDataWSOutputDto(
      WSApiStatus.BUSY,
      'Process is already started',
    );
    filesData.progress = Math.round(this.progress);

    this.sendEvent(filesData);
  }

  private sendEvent(eventData: FilesDataWSActionOutputDto['data']) {
    const filesDataAction = new FilesDataWSActionOutputDto(
      WebSocketActions.CREATE_PREVIEWS,
      eventData,
    );

    this.filesDataWSGateway.send(filesDataAction);
  }
}
