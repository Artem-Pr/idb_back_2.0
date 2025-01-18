import { Test, TestingModule } from '@nestjs/testing';
import { SystemTestsService } from './systemTests.service';
import { ConfigService } from 'src/config/config.service';
import { MediaDBService } from 'src/files/mediaDB.service';
import { PathsService } from 'src/paths/paths.service';
import { MatchNumbersOfFilesTestOutputDto } from './dto/match-numbers-of-files-test-output.dto';
import { MainDir } from 'src/common/constants';
import { Stats } from 'fs-extra';
import { DiscStorageService } from 'src/files/discStorage.service';

jest.mock('fs/promises', () => ({
  readdir: jest.fn(() => []),
  stat: jest.fn(() => {
    const stats = new Stats();
    stats.isDirectory = jest.fn(() => true);
    return stats;
  }),
}));

describe('SystemTestsService', () => {
  let service: SystemTestsService;
  let configService: ConfigService;
  let mediaDBService: MediaDBService;
  let pathsService: PathsService;
  let discStorageService: DiscStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemTestsService,
        {
          provide: ConfigService,
          useValue: {
            rootPaths: {
              [MainDir.volumes]: '/mock/path',
            },
          },
        },
        {
          provide: MediaDBService,
          useValue: {
            getDynamicFoldersRecursively: jest.fn(() => []),
            getFoldersPathsList: jest.fn(() => []),
          },
        },
        {
          provide: PathsService,
          useValue: {
            getAllPathsFromDB: jest.fn(() => []),
          },
        },
        {
          provide: DiscStorageService,
          useValue: {
            getAllFilesOnDisk: jest.fn(() => ({
              filesList: [],
              directoriesList: [],
            })),
          },
        },
      ],
    }).compile();

    service = module.get<SystemTestsService>(SystemTestsService);
    configService = module.get<ConfigService>(ConfigService);
    mediaDBService = module.get<MediaDBService>(MediaDBService);
    pathsService = module.get<PathsService>(PathsService);
    discStorageService = module.get<DiscStorageService>(DiscStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(configService).toBeDefined();
    expect(mediaDBService).toBeDefined();
    expect(pathsService).toBeDefined();
    expect(discStorageService).toBeDefined();
  });

  it('should run matching number of files test', async () => {
    const pid = 123456;
    const result = await service.runMatchingNumberOfFilesTest(pid);
    expect(result).toBeInstanceOf(MatchNumbersOfFilesTestOutputDto);
    expect(result.pid).toBe(pid);
  });
});
