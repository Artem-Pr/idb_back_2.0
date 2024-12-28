import type { MatchNumbersOfFilesTestInputDto } from './match-numbers-of-files-test-input.dto';

class TestType {
  progress: number;
  pid: MatchNumbersOfFilesTestInputDto['pid'];

  constructor() {
    this.progress = 0;
    this.pid = 0;
  }
}

export class MatchNumbersOfFilesTestOutputDto extends TestType {
  foldersInConfig: number;
  excessiveFolders__Config_DB: string[];
  excessiveFolders__Config_Disk: string[];
  foldersInDBFiles: number;
  excessiveFolders__DB_Config: string[];
  excessiveFolders__DB_Disk: string[];
  foldersInDirectory: number;
  excessiveFolders__Disk_Config: string[];
  excessiveFolders__Disk_DB: string[];
  filesInDB: number;
  excessiveFiles__DB_Disk: string[];
  filesInDirectory: number;
  excessiveFiles__Disk_DB: string[];

  constructor() {
    super();
    this.foldersInConfig = 0;
    this.excessiveFolders__Config_DB = [];
    this.excessiveFolders__Config_Disk = [];
    this.foldersInDBFiles = 0;
    this.excessiveFolders__DB_Config = [];
    this.excessiveFolders__DB_Disk = [];
    this.foldersInDirectory = 0;
    this.excessiveFolders__Disk_Config = [];
    this.excessiveFolders__Disk_DB = [];
    this.filesInDB = 0;
    this.excessiveFiles__DB_Disk = [];
    this.filesInDirectory = 0;
    this.excessiveFiles__Disk_DB = [];
  }
}
