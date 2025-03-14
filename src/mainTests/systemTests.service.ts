import { Injectable } from '@nestjs/common';
import { MatchNumbersOfFilesTestOutputDto } from './dto/match-numbers-of-files-test-output.dto';
import type { MatchNumbersOfFilesTestInputDto } from './dto/match-numbers-of-files-test-input.dto';
import { PathsService } from 'src/paths/paths.service';
import { MediaDBService } from 'src/files/mediaDB.service';
import { MainDir } from 'src/common/constants';
import { LogMethod } from 'src/logger/logger.decorator';
import { removeExtraFirstSlash } from 'src/common/fileNameHelpers';
import { difference } from 'ramda';
import { CustomLogger } from 'src/logger/logger.service';
import { generatePidNumber } from 'src/common/utils';
import { DiscStorageService } from 'src/files/discStorage.service';

@Injectable()
export class SystemTestsService {
  private readonly logger = new CustomLogger(SystemTestsService.name);
  private tests: {
    [
      pid: MatchNumbersOfFilesTestOutputDto['pid']
    ]: MatchNumbersOfFilesTestOutputDto;
  } = {};

  constructor(
    private diskStorageService: DiscStorageService,
    private mediaDBService: MediaDBService,
    private pathsService: PathsService,
  ) {}

  async runMatchingNumberOfFilesTest(
    currentPid: MatchNumbersOfFilesTestInputDto['pid'],
  ): Promise<MatchNumbersOfFilesTestOutputDto> {
    const pid = currentPid || generatePidNumber();

    if (this.tests[pid]) {
      return this.tests[pid];
    }

    const test = new MatchNumbersOfFilesTestOutputDto();
    test.pid = pid;
    this.tests[pid] = test;

    this.processAllTests(pid);

    return this.tests[pid];
  }

  async processAllTests(
    pid: MatchNumbersOfFilesTestInputDto['pid'],
  ): Promise<void> {
    const configFolders = await this.processConfigFolders(pid, 10);
    const mediaDBFolders = await this.processMediaDbFolders(pid, 10);
    const mediaDBFiles = await this.processMediaDbFiles(pid, 10);
    const diskData = await this.processDiskFolders(pid, 60);

    this.checkExcessiveFoldersFromConfig(
      pid,
      configFolders,
      mediaDBFolders,
      diskData.directoriesList,
      2,
    );

    this.checkExcessiveFoldersInDBFiles(
      pid,
      configFolders,
      mediaDBFolders,
      diskData.directoriesList,
      2,
    );

    this.checkExcessiveFoldersInDirectories(
      pid,
      configFolders,
      mediaDBFolders,
      diskData.directoriesList,
      2,
    );

    this.checkExcessiveFilesInDB(pid, mediaDBFiles, diskData.filesList, 2);
    this.checkExcessiveFilesOnDisk(pid, mediaDBFiles, diskData.filesList, 2);
  }

  @LogMethod('checkExcessiveFoldersFromConfig')
  checkExcessiveFoldersFromConfig(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    configFolders: string[],
    mediaDBFolders: string[],
    diskFolders: string[],
    progress: number,
  ): void {
    const difList__Config_DB = difference(configFolders, mediaDBFolders);
    const difList__Config_Disk = difference(configFolders, diskFolders);

    this.tests[pid].excessiveFolders__Config_DB = difList__Config_DB;
    this.tests[pid].excessiveFolders__Config_Disk = difList__Config_Disk;
    this.increaseProgress('checkExcessiveFoldersFromConfig', pid, progress);
  }

  @LogMethod('checkExcessiveFoldersInDBFiles')
  checkExcessiveFoldersInDBFiles(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    configFolders: string[],
    mediaDBFolders: string[],
    diskFolders: string[],
    progress: number,
  ): void {
    const difList__DB_Config = difference(mediaDBFolders, configFolders);
    const difList__DB_Disk = difference(mediaDBFolders, diskFolders);

    this.tests[pid].excessiveFolders__DB_Config = difList__DB_Config;
    this.tests[pid].excessiveFolders__DB_Disk = difList__DB_Disk;
    this.increaseProgress('checkExcessiveFoldersInDBFiles', pid, progress);
  }

  @LogMethod('checkExcessiveFoldersInDirectories')
  checkExcessiveFoldersInDirectories(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    configFolders: string[],
    mediaDBFolders: string[],
    diskFolders: string[],
    progress: number,
  ) {
    const difList__Disk_Config = difference(diskFolders, configFolders);
    const difList__Disk_DB = difference(diskFolders, mediaDBFolders);

    this.tests[pid].excessiveFolders__Disk_Config = difList__Disk_Config;
    this.tests[pid].excessiveFolders__Disk_DB = difList__Disk_DB;
    this.increaseProgress('checkExcessiveFoldersInDirectories', pid, progress);
  }

  @LogMethod('checkExcessiveFilesInDB')
  checkExcessiveFilesInDB(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    filesListFromDB: string[],
    filesListFromDisk: string[],
    progress: number,
  ) {
    const difList__DB_Disk = difference(filesListFromDB, filesListFromDisk);

    this.tests[pid].excessiveFiles__DB_Disk = difList__DB_Disk;
    this.increaseProgress('checkExcessiveFilesInDB', pid, progress);
  }

  @LogMethod('checkExcessiveFilesOnDisk')
  checkExcessiveFilesOnDisk(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    filesListFromDB: string[],
    filesListFromDisk: string[],
    progress: number,
  ) {
    const difList__Disk_DB = difference(filesListFromDisk, filesListFromDB);

    this.tests[pid].excessiveFiles__Disk_DB = difList__Disk_DB;
    this.increaseProgress('checkExcessiveFilesOnDisk', pid, progress);
  }

  @LogMethod('processDiskFolders')
  async processDiskFolders(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    progress: number,
  ): Promise<{
    filesList: string[];
    directoriesList: string[];
  }> {
    const filesOnDisk = await this.diskStorageService.getAllFilesOnDisk(
      MainDir.volumes,
    );

    this.tests[pid].foldersInDirectory = filesOnDisk.directoriesList.length;
    this.tests[pid].filesInDirectory = filesOnDisk.filesList.length;
    this.increaseProgress('processDiskFolders', pid, progress);

    return filesOnDisk;
  }

  @LogMethod('processConfigFolders')
  async processConfigFolders(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    progress: number,
  ): Promise<string[]> {
    const configFolders = await this.pathsService.getAllPathsFromDB();
    this.tests[pid].foldersInConfig = configFolders.length;
    this.increaseProgress('processConfigFolders', pid, progress);

    return this.normalizedPathsArr(configFolders);
  }

  @LogMethod('processMediaDbFolders')
  async processMediaDbFolders(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    progress: number,
  ): Promise<string[]> {
    const mediaDBFolders =
      await this.mediaDBService.getDynamicFoldersRecursively();
    this.tests[pid].foldersInDBFiles = mediaDBFolders.length;
    this.increaseProgress('processMediaDbFolders', pid, progress);

    return this.normalizedPathsArr(mediaDBFolders);
  }

  @LogMethod('processMediaDbFiles')
  async processMediaDbFiles(
    pid: MatchNumbersOfFilesTestOutputDto['pid'],
    progress: number,
  ): Promise<string[]> {
    const mediaDBFiles = await this.mediaDBService.getFoldersPathsList();
    this.tests[pid].filesInDB = mediaDBFiles.length;
    this.increaseProgress('processMediaDbFiles', pid, progress);

    return this.normalizedPathsArr(
      mediaDBFiles.map((path) => removeExtraFirstSlash(path)),
    );
  }

  increaseProgress(
    processName: string,
    pid: MatchNumbersOfFilesTestInputDto['pid'],
    percent: number,
  ): void {
    if (!this.tests[pid]) {
      return;
    }

    const newProgress = this.tests[pid].progress + percent;

    this.tests[pid].progress = newProgress >= 100 ? 100 : newProgress;
    this.logger.debug('Progress:', {
      [`${processName} - progress`]: this.tests[pid].progress,
    });
  }

  normalizedPathsArr<T extends string>(paths: T[]): T[] {
    return paths.map((path) => path.normalize() as T);
  }
}
