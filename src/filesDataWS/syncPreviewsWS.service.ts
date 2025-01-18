import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { PreviewListEntity } from 'src/files/mediaDB.service';
import { MediaDBService } from 'src/files/mediaDB.service';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import { WebSocketActions, WSApiStatus } from './constants';
import {
  FilesDataWSActionOutputDto,
  FilesDataWSOutputDto,
} from './dto/files-data-ws-output.dto';
import { DiscStorageService } from 'src/files/discStorage.service';
import { MainDir } from 'src/common/constants';
import { removeExtraFirstSlash } from 'src/common/fileNameHelpers';
import { CustomLogger } from 'src/logger/logger.service';
import { deepCopy } from 'src/common/utils';
import { ObjectId } from 'mongodb';
import { DBPreviewPath } from 'src/common/types';

@Injectable()
export class SyncPreviewsWSService {
  private readonly logger = new CustomLogger(SyncPreviewsWSService.name);
  private _progress = 0;
  _status = WSApiStatus.READY;

  constructor(
    private mediaDBService: MediaDBService,
    private diskStorageService: DiscStorageService,
    @Inject(forwardRef(() => FilesDataWSGateway))
    private readonly filesDataWSGateway: FilesDataWSGateway,
  ) {}

  get progress(): number {
    return this._progress;
  }

  get status(): WSApiStatus {
    return this._status;
  }

  async startProcess(): Promise<void> {
    if (this.status !== WSApiStatus.READY) {
      this.sendProcessIsBusy();
      return;
    }

    const previewsObjectDBList = await this.getTotalDBElementsWithPreview(10);
    const filesDiskList = await this.getTotalDiskPreviewFiles(20);
    const notFoundPreviewIds = this.calculateListOfNotFoundPreviewIds(
      previewsObjectDBList,
      filesDiskList,
      50,
    );
    await this.removeNotFoundPreviewsFromDB(notFoundPreviewIds, 20);

    this.commitDoneStatus();
    this.resetProgress();
  }

  private async getTotalDBElementsWithPreview(
    progress: number = 0,
  ): Promise<PreviewListEntity[]> {
    this.commitPendingStatus('Loading total elements with preview in DB ...');

    return this.mediaDBService
      .findNotEmptyPreviewsInDB()
      .then((previewsObjectList) => {
        this.commitSuccessStatus(
          progress,
          `Total elements with preview in DB: ${previewsObjectList.length}`,
        );

        return previewsObjectList;
      })
      .catch((error) => {
        this.commitErrorStatus(
          'Error loading total elements with preview in DB',
          error,
        );
        return [] as PreviewListEntity[];
      });
  }

  private async getTotalDiskPreviewFiles(
    progress: number = 0,
  ): Promise<string[]> {
    this.commitPendingStatus('Loading total preview files on disk ...');

    return this.diskStorageService
      .getAllFilesOnDisk(MainDir.previews)
      .then(({ filesList }) => {
        const normalizedFilesList = this.normalizedPathsArr(filesList);

        this.commitSuccessStatus(
          progress,
          `Total preview files on disk: ${normalizedFilesList.length}`,
        );

        return normalizedFilesList;
      })
      .catch((error): string[] => {
        this.commitErrorStatus(
          'Error loading total preview files on disk',
          error,
        );
        return [];
      });
  }

  private calculateListOfNotFoundPreviewIds(
    previewsObjectDBList: PreviewListEntity[],
    filesDiskList: string[],
    progress: number = 0,
  ): ObjectId[] {
    this.commitPendingStatus('Calculating list of not found previews ...');

    const process = this.logger.startProcess({
      processName: 'calculateListOfNotFoundPreviewIds',
    });
    const notFoundPreviews = previewsObjectDBList
      .filter(({ preview, fullSizeJpg }) => {
        const isPreviewFound = filesDiskList.includes(
          removeExtraFirstSlash(preview).normalize(),
        );
        const isFullSizePreviewFound =
          !fullSizeJpg ||
          filesDiskList.includes(
            removeExtraFirstSlash(fullSizeJpg).normalize(),
          );

        const isFound = isPreviewFound && isFullSizePreviewFound;
        return !isFound;
      })
      .map(({ _id }) => _id);
    this.logger.finishProcess(process);

    this.commitSuccessStatus(
      progress,
      `List of not found previews: ${notFoundPreviews.length}`,
    );

    return notFoundPreviews;
  }

  private async removeNotFoundPreviewsFromDB(
    notFoundPreviews: ObjectId[],
    progress: number = 0,
  ): Promise<void> {
    this.commitPendingStatus('Removing not found previews from DB ...');

    if (!notFoundPreviews.length) {
      this.commitSuccessStatus(
        progress,
        'Number of not-found previews removed from DB: 0',
      );
      return;
    }

    const updatingDataWithEmptyFields: PreviewListEntity[] =
      notFoundPreviews.map((id) => ({
        _id: id,
        preview: '' as DBPreviewPath,
        fullSizeJpg: null,
      }));

    await this.mediaDBService
      .updateMediaInDB(updatingDataWithEmptyFields)
      .then((updatedData) => {
        this.logger.debug('modified data', deepCopy(updatedData));

        this.commitSuccessStatus(
          progress,
          `Number of not-found previews removed from DB: ${updatedData.modifiedCount}`,
        );
      })
      .catch((error) => {
        this.commitErrorStatus(
          'Error removing not found previews from DB',
          error,
        );
      });
  }

  private commitPendingStatus(message: string) {
    this.commitStatus({
      status: WSApiStatus.PENDING,
      message,
    });
  }

  private commitSuccessStatus(progressInc: number, message: string) {
    this.commitStatus({
      status: WSApiStatus.PENDING_SUCCESS,
      message,
      progressInc,
    });
  }

  private commitErrorStatus(message: string, error?: Error) {
    this.commitStatus({
      status: WSApiStatus.PENDING_ERROR,
      message,
      error,
    });
  }

  private commitDoneStatus() {
    this.resetProgress();
    this.commitStatus({
      status: WSApiStatus.DONE,
      message: 'Preview sync is complete',
      progressInc: 100,
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
    const filesData = new FilesDataWSOutputDto(this.status, message);
    filesData.progress = this.progress;
    error && (filesData.developerMessage = error?.message || String(error));

    this.sendEvent(filesData);
  }

  private increaseProgress(progress: number) {
    this._progress = this.progress + Math.round(progress);
  }

  private resetProgress() {
    this._progress = 0;
    this._status = WSApiStatus.READY;
  }

  private sendProcessIsBusy() {
    const filesData = new FilesDataWSOutputDto(
      WSApiStatus.BUSY,
      'Process is already started',
    );
    filesData.progress = this.progress;

    this.sendEvent(filesData);
  }

  private sendEvent(eventData: FilesDataWSActionOutputDto['data']) {
    const filesDataAction = new FilesDataWSActionOutputDto(
      WebSocketActions.CREATE_PREVIEWS,
      eventData,
    );

    this.filesDataWSGateway.send(filesDataAction);
  }

  private normalizedPathsArr<T extends string>(paths: T[]): T[] {
    return paths.map((path) => path.normalize() as T);
  }
}
