import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import type { Job, Queue } from 'bull';
import type { GetFilesResponse, UpdateMedia } from './mediaDB.service';
import { DBType, MediaDBService } from './mediaDB.service';
import { getQueueToken } from '@nestjs/bull';
import {
  Processors,
  MainDir,
  SupportedImageMimetypes,
} from 'src/common/constants';
import type { FileProcessingJob } from 'src/jobs/files.processor';
import type { ExifData, GetExifJob } from 'src/jobs/exif.processor';
import { ConfigService } from 'src/config/config.service';
import { MediaTemp } from './entities/media-temp.entity';
import type { ImageStoreServiceOutputDto } from 'src/jobs/dto/image-store-service-output.dto';
import * as utils from 'src/common/utils';
import {
  createMediaMock,
  createMediaTempMock,
  exifDataMock,
  UploadFileMock,
} from './__mocks__/mocks';
import { ObjectId } from 'mongodb';
import type { GetSameFilesIfExist, MediaOutput, ProcessFile } from './types';
import { Media } from './entities/media.entity';
import { DiscStorageService } from './discStorage.service';
import { PathsService } from 'src/paths/paths.service';
import { KeywordsService } from 'src/keywords/keywords.service';
import type { UpdatedFilesInputDto } from './dto/update-files-input.dto';
import { GetFilesInputDto } from './dto/get-files-input.dto';
import { omit } from 'ramda';
import { InternalServerErrorException } from '@nestjs/common';

const exifJobResult: ExifData = {
  'test.jpg': exifDataMock,
};

const previewJobResult: ImageStoreServiceOutputDto = {
  previewPath: 'temp/path/to-preview.jpg',
  fullSizePath: 'temp/path/to-fullSize.jpg',
};

const mockExifJob = {
  finished: jest.fn().mockResolvedValue(exifJobResult),
} as Partial<Job<GetExifJob>> as Job<GetExifJob>;
const mockPreviewJob = {
  finished: jest.fn().mockResolvedValue(previewJobResult),
} as Partial<Job<FileProcessingJob>> as Job<FileProcessingJob>;

const mockDuplicateOriginalname = 'duplicate';
const mockDuplicates = [
  createMediaMock({
    name: 'duplicate1',
    originalNameWithoutExt: mockDuplicateOriginalname,
  }),
  createMediaMock({
    name: 'duplicate2',
    originalNameWithoutExt: mockDuplicateOriginalname,
  }),
];
const mediaTempResponseMock = createMediaTempMock({
  id: new ObjectId('662eb6a4aece4209057aa5d0'),
});
const mockUpload = new UploadFileMock();

const resetMockUpload = () => {
  mockUpload.updateFromMedia(mediaTempResponseMock);
  mockUpload.staticPath =
    'http://localhost:3000/temp/path/to/mockTempFile-fullSize.jpg';
  mockUpload.staticPreview =
    'http://localhost:3000/temp/path/to/mockTempFile-preview.jpg';
  mockUpload.duplicates = [
    {
      filePath: '/path/to/duplicate1.jpg',
      mimetype: SupportedImageMimetypes.jpg,
      originalName: 'duplicate.jpg',
      staticPath:
        'http://localhost:3000/previews/path/to/duplicate1-fullSize.jpg',
      staticPreview:
        'http://localhost:3000/previews/path/to/duplicate1-preview.jpg',
    },
    {
      filePath: '/path/to/duplicate2.jpg',
      mimetype: SupportedImageMimetypes.jpg,
      originalName: 'duplicate.jpg',
      staticPath:
        'http://localhost:3000/previews/path/to/duplicate2-fullSize.jpg',
      staticPreview:
        'http://localhost:3000/previews/path/to/duplicate2-preview.jpg',
    },
  ];
};

describe('FilesService', () => {
  let addFileToDBTemp: jest.Mock<MediaTemp>;
  let exifQueue: Queue<GetExifJob>;
  let fileQueue: Queue<FileProcessingJob>;
  let getSameFilesIfExist: jest.Mock<GetSameFilesIfExist>;
  let mediaDBService: MediaDBService;
  let service: FilesService;
  let keywordsService: KeywordsService;
  let diskStorageService: DiscStorageService;
  let pathsService: PathsService;
  let updateMediaList: jest.Mock<UpdateMedia[]>;

  beforeAll(async () => {
    addFileToDBTemp = jest.fn().mockReturnValue(mediaTempResponseMock);
    getSameFilesIfExist = jest.fn().mockReturnValue(mockDuplicates);
    updateMediaList = jest.fn().mockReturnValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getQueueToken(Processors.fileProcessor),
          useValue: { add: jest.fn(() => mockPreviewJob) },
        },
        {
          provide: getQueueToken(Processors.exifProcessor),
          useValue: { add: jest.fn(() => mockExifJob) },
        },
        {
          provide: MediaDBService,
          useValue: {
            addFileToDBTemp,
            addMediaToDB: jest.fn((mediaList: Media[]) => mediaList),
            deleteMediaByIds: jest.fn(),
            deleteMediaFromTempDB: jest.fn(),
            emptyTempDB: jest.fn(),
            getFiles: jest.fn(),
            getSameFilesIfExist,
            updateMediaList,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            domain: 'http://localhost:3000',
          },
        },
        {
          provide: DiscStorageService,
          useValue: {
            emptyDirectory: jest.fn(),
            removeFilesAndPreviews: jest.fn(),
            saveFilesArrToDisk: jest.fn(),
          },
        },
        {
          provide: PathsService,
          useValue: {
            addPathsToDB: jest.fn(),
            getDirAndSubfoldersFromArray: jest.fn(),
          },
        },
        {
          provide: KeywordsService,
          useValue: {
            addKeywords: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    mediaDBService = module.get<MediaDBService>(MediaDBService);
    keywordsService = module.get<KeywordsService>(KeywordsService);
    pathsService = module.get<PathsService>(PathsService);
    diskStorageService = module.get<DiscStorageService>(DiscStorageService);
    fileQueue = module.get<Queue<FileProcessingJob>>(
      getQueueToken(Processors.fileProcessor),
    );
    exifQueue = module.get<Queue<GetExifJob>>(
      getQueueToken(Processors.exifProcessor),
    );
  });

  beforeEach(() => {
    jest
      .spyOn(mediaDBService, 'addFileToDBTemp')
      .mockReturnValue(
        new Promise((resolve) => resolve(mediaTempResponseMock)),
      );
    jest
      .spyOn(mediaDBService, 'getSameFilesIfExist')
      .mockReturnValue(new Promise((resolve) => resolve(mockDuplicates)));

    resetMockUpload();
  });

  afterEach(jest.clearAllMocks);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('makeMediaOutputFromMedia', () => {
    let media: Media;
    let mainDirPreview: MainDir;
    let mainDirFilePath: MainDir;
    let customFields: Partial<MediaOutput>;

    beforeEach(() => {
      mainDirPreview = MainDir.temp;
      mainDirFilePath = MainDir.volumes;
      media = createMediaTempMock({
        id: new ObjectId('662eb6a4aece4209057aa5d0'),
      });
      customFields = {};
    });

    it('should return MediaOutput with the correct properties', () => {
      const result = service['makeMediaOutputFromMedia']({
        media,
        mainDirPreview,
        mainDirFilePath,
      });

      expect(result).toMatchSnapshot();
    });

    it('should return MediaOutput with custom fields', () => {
      customFields = {
        id: 'custom-id',
      };

      const result = service['makeMediaOutputFromMedia']({
        media,
        mainDirPreview,
        mainDirFilePath,
        customFields,
      });

      expect(result).toMatchSnapshot();
    });

    it('should handle media without fullSizeJpg', () => {
      media.fullSizeJpg = null;

      const result = service['makeMediaOutputFromMedia']({
        media,
        mainDirPreview,
        mainDirFilePath,
      });

      expect(result.staticPath).toEqual(
        service.getStaticPath(media.filePath, mainDirFilePath),
      );
    });
  });

  describe('getFiles', () => {
    const mediaDBGetFilesMock: Awaited<GetFilesResponse> = {
      dynamicFolders: [],
      files: [
        createMediaMock({
          id: new ObjectId('66f7cb092b956392a532e556'),
          name: 'test1.jpg',
        }),
        createMediaMock({
          id: new ObjectId('66f7cb092b956392a532e557'),
          name: 'test2.jpg',
        }),
      ],
      filesSizeSum: 1234567,
      searchPagination: {
        currentPage: 4,
        nPerPage: 10,
        resultsCount: 45,
        totalPages: 5,
      },
    };

    const filesOutput = [
      {
        ...omit(
          ['_id', 'preview', 'fullSizeJpg'],
          mediaDBGetFilesMock.files[0],
        ),
        id: '66f7cb092b956392a532e556',
        duplicates: [],
        staticPath:
          'http://localhost:3000/previews/path/to/test1.jpg-fullSize.jpg',
        staticPreview:
          'http://localhost:3000/previews/path/to/test1.jpg-preview.jpg',
      },
      {
        ...omit(
          ['_id', 'preview', 'fullSizeJpg'],
          mediaDBGetFilesMock.files[1],
        ),
        id: '66f7cb092b956392a532e557',
        duplicates: [],
        staticPath:
          'http://localhost:3000/previews/path/to/test2.jpg-fullSize.jpg',
        staticPreview:
          'http://localhost:3000/previews/path/to/test2.jpg-preview.jpg',
      },
    ];

    const getFilesOutputMock = {
      ...mediaDBGetFilesMock,
      files: filesOutput,
    };

    const filesInput: GetFilesInputDto = {
      filters: { rating: 2 },
      sorting: { sort: { originalDate: -1, filePath: 1 } },
      folders: { showSubfolders: true },
      pagination: { page: 1, perPage: 10 },
      settings: { dontSavePreview: true },
    };

    it('should return correct response', async () => {
      jest
        .spyOn(mediaDBService, 'getFiles')
        .mockReturnValue(
          new Promise((resolve) => resolve(mediaDBGetFilesMock)),
        );

      const result = await service.getFiles(filesInput);

      expect(result).toEqual(getFilesOutputMock);
    });

    it('should return an empty template if no files found', async () => {
      const mediaDBGetFilesEmptyMock = {
        dynamicFolders: [],
        files: [],
        filesSizeSum: 0,
        searchPagination: {
          currentPage: 1,
          nPerPage: 0,
          resultsCount: 0,
          totalPages: 1,
        },
      };

      jest
        .spyOn(mediaDBService, 'getFiles')
        .mockReturnValue(new Promise((resolve) => resolve(undefined)));

      const result = await service.getFiles(filesInput);

      expect(result).toEqual(mediaDBGetFilesEmptyMock);
    });
  });

  describe('updateKeywordsList', () => {
    const oldMedia1 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300844'),
    });
    const newMedia1 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300844'),
    });
    oldMedia1.keywords = ['keyword2'];
    newMedia1.keywords = ['keyword1', 'keyword2', 'keyword3'];

    const oldMedia2 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300845'),
    });
    const newMedia2 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300845'),
    });
    oldMedia2.keywords = ['keyword1', 'keyword3'];
    newMedia2.keywords = [];

    const mediaDB_UpdateMediaList: UpdateMedia[] = [
      {
        oldMedia: oldMedia1,
        newMedia: newMedia1,
      },
      {
        oldMedia: oldMedia2,
        newMedia: newMedia2,
      },
    ];

    it('should call keywordsService.addKeywords with the new keywords', async () => {
      jest.spyOn(keywordsService, 'addKeywords');
      await service['updateKeywordsList'](mediaDB_UpdateMediaList);

      expect(keywordsService.addKeywords).toHaveBeenCalledWith([
        'keyword1',
        'keyword2',
        'keyword3',
      ]);
    });
  });

  describe('saveNewDirectories', () => {
    const media1 = createMediaMock();
    media1.filePath = '/path/to/mockFile.jpg';
    const media2 = createMediaMock();
    media2.filePath = '/path/to2/mockFile.jpg';

    it('should call pathsService.getDirAndSubfoldersFromArray with correct params', async () => {
      jest.spyOn(pathsService, 'getDirAndSubfoldersFromArray');

      await service['saveNewDirectories']([media1, media2]);

      expect(pathsService.getDirAndSubfoldersFromArray).toHaveBeenCalledWith([
        'path/to',
        'path/to2',
      ]);
    });
  });

  describe('saveUpdatedMediaToDisc', () => {
    it('should call diskStorageService.saveFilesArrToDisk with correct params', async () => {
      jest.spyOn(diskStorageService, 'saveFilesArrToDisk');
      await service['saveUpdatedMediaToDisc']([]);
      expect(diskStorageService.saveFilesArrToDisk).toHaveBeenCalledWith(
        [],
        true,
      );
    });
  });

  describe('updateMediaDB', () => {
    const oldMedia1 = createMediaMock();
    const newMedia1 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300844'),
    });

    const oldMedia2 = createMediaMock();
    const newMedia2 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300845'),
    });

    const mediaDB_UpdateMediaList: UpdateMedia[] = [
      {
        oldMedia: oldMedia1,
        newMedia: newMedia1,
      },
      {
        oldMedia: oldMedia2,
        newMedia: newMedia2,
      },
    ];

    it('should call mediaDB.addMediaToDB with correct params', async () => {
      jest.spyOn(mediaDBService, 'addMediaToDB');
      await service['updateMediaDB'](mediaDB_UpdateMediaList);
      expect(mediaDBService.addMediaToDB).toHaveBeenCalledWith([
        newMedia1,
        newMedia2,
      ]);
    });
  });

  describe('generatePreviewPathsForNewMedia', () => {
    const oldMedia1 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300843'),
    });
    const newMedia1 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300844'),
    });
    newMedia1.originalName = 'test1.jpg';
    newMedia1.mimetype = SupportedImageMimetypes.gif;
    newMedia1.originalDate = new Date('2010-10-10 10:10:10');
    newMedia1.fullSizeJpg = null;

    const oldMedia2 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300845'),
    });
    const newMedia2 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300846'),
    });
    newMedia2.originalName = 'test2.jpg';
    newMedia2.mimetype = SupportedImageMimetypes.gif;
    newMedia2.originalDate = new Date('2010-10-10 10:10:10');

    const mediaDB_UpdateMediaList: UpdateMedia[] = [
      {
        oldMedia: oldMedia1,
        newMedia: newMedia1,
      },
      {
        oldMedia: oldMedia2,
        newMedia: newMedia2,
      },
    ];

    beforeAll(() => {
      jest
        .spyOn(ObjectId.prototype, 'toHexString')
        .mockReturnValue('mockedHexString');
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should generate media with correct preview paths', () => {
      const result = service['generatePreviewPathsForNewMedia'](
        mediaDB_UpdateMediaList,
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe('updateMediaTempWithNewData', () => {
    it('should call mediaDB.updateMediaList with correct params', async () => {
      jest.spyOn(mediaDBService, 'updateMediaList');
      await service['updateMediaTempWithNewData']({ files: [] });
      expect(mediaDBService.updateMediaList).toHaveBeenCalledWith(
        {
          files: [],
        },
        DBType.DBTemp,
      );
    });
  });

  describe('saveFiles', () => {
    const filesToUpload: UpdatedFilesInputDto = {
      files: [
        {
          id: '00000001f80f825d51300844',
          updatedFields: {
            originalName: 'test1-updated.jpg',
            keywords: ['keyword1', 'keyword2'],
          },
        },
        {
          id: '00000001f80f825d51300845',
          updatedFields: {
            originalName: 'test2-updated.jpg',
            originalDate: '2024-09-20T17:00:00.000Z',
            keywords: [],
          },
        },
      ],
    };

    const oldMedia1 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300844'),
      name: 'test1',
      originalNameWithoutExt: 'test1',
    });
    const newMedia1 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300844'),
      name: 'test1-updated',
      originalNameWithoutExt: 'test1-updated',
    });
    newMedia1.keywords = ['keyword1', 'keyword2'];

    const oldMedia2 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300845'),
      name: 'test2',
      originalNameWithoutExt: 'test2',
    });
    const newMedia2 = createMediaMock({
      id: new ObjectId('00000001f80f825d51300845'),
      name: 'test2-updated',
      originalNameWithoutExt: 'test2-updated',
    });
    newMedia2.originalDate = new Date('2024-09-20T17:00:00.000Z');
    newMedia2.keywords = [];

    const mediaDB_UpdateMediaList: UpdateMedia[] = [
      {
        oldMedia: oldMedia1,
        newMedia: newMedia1,
      },
      {
        oldMedia: oldMedia2,
        newMedia: newMedia2,
      },
    ];

    beforeEach(() => {
      jest
        .spyOn(mediaDBService, 'updateMediaList')
        .mockReturnValue(
          new Promise((resolve) => resolve(mediaDB_UpdateMediaList)),
        );
    });

    it('should save files', async () => {
      jest
        .spyOn(ObjectId.prototype, 'toHexString')
        .mockReturnValueOnce('00000001f80f825d51300844') // mock preview creation of first file
        .mockReturnValueOnce('00000001f80f825d51300844') // mock full size creation of first file
        .mockReturnValueOnce('00000001f80f825d51300845') // mock preview creation of second file
        .mockReturnValueOnce('00000001f80f825d51300845'); // mock full size creation of second file

      const result = await service.saveFiles(filesToUpload);
      expect(result).toMatchSnapshot();
    });

    it('should throw error if save files failed', async () => {
      jest
        .spyOn(mediaDBService, 'updateMediaList')
        .mockRejectedValue(new Error('Failed to save files'));

      await expect(service.saveFiles(filesToUpload)).rejects.toThrow(
        new InternalServerErrorException('Failed to save files'),
      );
    });
  });

  describe('processFile', () => {
    const file = {
      filename: 'test.jpg',
      mimetype: 'image/jpeg',
      originalname: 'original_test.jpg',
    } as Partial<ProcessFile> as ProcessFile;

    let startAllQueues: jest.SpyInstance<
      Promise<{ exifJob: Job<GetExifJob>; previewJob: Job<FileProcessingJob> }>,
      [Pick<FileProcessingJob, 'fileName' | 'fileType'>],
      any
    >;
    let finishAllQueues: jest.SpyInstance<
      Promise<{
        exifJobResult: ExifData;
        previewJobResult: ImageStoreServiceOutputDto;
      }>,
      [
        {
          exifJob: Job<GetExifJob>;
          previewJob: Job<FileProcessingJob>;
        },
      ],
      any
    >;
    let pushFileToMediaDBTemp: jest.SpyInstance<
      Promise<MediaTemp>,
      [ProcessFile, ImageStoreServiceOutputDto, ExifData],
      any
    >;
    let resolveAllSettledSpy: jest.SpyInstance;

    beforeEach(() => {
      startAllQueues = jest.spyOn(service, 'startAllProcessFileQueues');
      finishAllQueues = jest.spyOn(service, 'finishAllProcessFileQueues');
      pushFileToMediaDBTemp = jest.spyOn(service, 'pushFileToMediaDBTemp');
      resolveAllSettledSpy = jest.spyOn(utils, 'resolveAllSettled');
    });

    it('should process a file correctly and return the result', async () => {
      const result = await service.processFile(file);

      expect(result).toEqual(mockUpload.uploadFile);
    });

    it('should process a file and return the result when staticPath creates from filePath', async () => {
      const newMediaTempResponseMock = {
        ...mediaTempResponseMock,
        fullSizeJpg: null,
      };

      mockUpload.staticPath =
        'http://localhost:3000/temp/path/to/mockTempFile.jpg';

      jest
        .spyOn(mediaDBService, 'addFileToDBTemp')
        .mockReturnValue(
          new Promise((resolve) => resolve(newMediaTempResponseMock)),
        );

      const fileHeic = {
        filename: 'test.heic',
        mimetype: 'image/heic',
        originalname: 'original_test.heic',
      } as Partial<ProcessFile> as ProcessFile;

      const result = await service.processFile(fileHeic);

      expect(result).toEqual(mockUpload.uploadFile);
    });

    it('should start all queues', async () => {
      await service.processFile(file);

      expect(startAllQueues).toHaveBeenCalledWith({
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
      });
    });

    it('should finish all queues', async () => {
      await service.processFile(file);

      expect(finishAllQueues).toHaveBeenCalledWith({
        exifJob: mockExifJob,
        previewJob: mockPreviewJob,
      });
    });

    it('should push file to MediaDBTemp', async () => {
      const mockedPreviewJobResult = {
        fullSizePath: 'temp/path/to-fullSize.jpg',
        previewPath: 'temp/path/to-preview.jpg',
      };

      await service.processFile(file);

      expect(pushFileToMediaDBTemp).toHaveBeenCalledWith(
        file,
        mockedPreviewJobResult,
        exifJobResult,
      );
    });

    it('should call resolveAllSettled with params', async () => {
      const duplicatesPromise = Promise.resolve([]);
      const mediaTempPromise = Promise.resolve({});

      await service.processFile(file);

      expect(resolveAllSettledSpy).toHaveBeenCalledWith([
        duplicatesPromise,
        mediaTempPromise,
      ]);
    });
  });

  describe('startAllProcessFileQueues', () => {
    it('should add jobs to fileQueue and exifQueue', async () => {
      const fileName = 'testFile.jpg';
      const fileType = SupportedImageMimetypes.jpg;

      const result = await service.startAllProcessFileQueues({
        fileName,
        fileType,
      });

      expect(result).toHaveProperty('exifJob');
      expect(result).toHaveProperty('previewJob');
      expect(fileQueue.add).toHaveBeenCalledWith({
        fileName,
        fileType,
        dirName: MainDir.temp,
      });
      expect(exifQueue.add).toHaveBeenCalledWith({
        filePaths: [fileName],
        mainDir: MainDir.temp,
      });
    });
  });

  describe('finishAllProcessFileQueues', () => {
    it('should await the completion of exifJob and previewJob', async () => {
      const result = await service.finishAllProcessFileQueues({
        exifJob: mockExifJob,
        previewJob: mockPreviewJob,
      });

      expect(result).toEqual({ exifJobResult, previewJobResult });
      expect(mockExifJob.finished).toHaveBeenCalled();
      expect(mockPreviewJob.finished).toHaveBeenCalled();
    });
  });

  describe('pushFileToMediaDBTemp', () => {
    const file = {
      filename: 'test.jpg',
      mimetype: 'image/jpeg',
      originalname: 'original_test.jpg',
    } as Partial<ProcessFile> as ProcessFile;

    it('should correctly push file data to MediaDB and return the result', async () => {
      const mediaTempResponse = await service.pushFileToMediaDBTemp(
        file,
        previewJobResult,
        exifJobResult,
      );

      expect(mediaDBService.addFileToDBTemp).toHaveBeenCalledWith(
        exifJobResult[file.filename],
        {
          filePath: `/${file.filename}`,
          previewPath: '/path/to-preview.jpg',
          fullSizePath: '/path/to-fullSize.jpg',
        },
        file,
      );
      expect(mediaTempResponse).toBe(mediaTempResponseMock);
    });

    it('should correctly push file data to MediaDB and return the result if no fullSizePath is provided', async () => {
      const mockPreviewJobResult: ImageStoreServiceOutputDto = {
        previewPath: 'temp/path/to-preview.jpg',
      };

      const mediaTempResponse = await service.pushFileToMediaDBTemp(
        file,
        mockPreviewJobResult,
        exifJobResult,
      );

      expect(mediaDBService.addFileToDBTemp).toHaveBeenCalledWith(
        exifJobResult[file.filename],
        {
          filePath: `/${file.filename}`,
          previewPath: '/path/to-preview.jpg',
        },
        file,
      );
      expect(mediaTempResponse).toBe(mediaTempResponseMock);
    });
  });

  describe('getDuplicatesFromMediaDBByOriginalNames', () => {
    const originalNameList: Media['originalName'][] = [
      'duplicate.jpg',
      'unique.jpg',
    ];

    it('should return duplicates mapped by original names', async () => {
      const expectedDuplicatesResult = {
        'duplicate.jpg': mockUpload.uploadFile.properties.duplicates,
        'unique.jpg': mockUpload.uploadFile.properties.duplicates,
      };

      const duplicates =
        await service.getDuplicatesFromMediaDBByOriginalNames(originalNameList);

      expect(duplicates).toEqual(expectedDuplicatesResult);
      expect(mediaDBService.getSameFilesIfExist).toHaveBeenCalledTimes(
        originalNameList.length,
      );
      originalNameList.forEach((originalName) => {
        expect(mediaDBService.getSameFilesIfExist).toHaveBeenCalledWith({
          originalName,
        });
      });
    });
  });

  describe('getDuplicatesFromMediaDBByFilePaths', () => {
    const filePathList: Media['filePath'][] = [
      '/path/to/duplicate.jpg',
      '/path/to/unique.jpg',
    ];

    it('should return duplicates mapped by file paths', async () => {
      const expectedDuplicatesResult = {
        '/path/to/duplicate.jpg': mockUpload.uploadFile.properties.duplicates,
        '/path/to/unique.jpg': mockUpload.uploadFile.properties.duplicates,
      };

      const duplicates =
        await service.getDuplicatesFromMediaDBByFilePaths(filePathList);

      expect(duplicates).toEqual(expectedDuplicatesResult);
      expect(mediaDBService.getSameFilesIfExist).toHaveBeenCalledTimes(
        filePathList.length,
      );
      filePathList.forEach((filePath) => {
        expect(mediaDBService.getSameFilesIfExist).toHaveBeenCalledWith({
          filePath,
        });
      });
    });
  });

  describe('getDuplicatesFromMediaDB', () => {
    const whereOriginalName: GetSameFilesIfExist = {
      originalName: 'duplicate.jpg',
      // filePath: '/path/to/duplicate.jpg', // can be used instead of originalName
    };

    const mockDuplicatesWithoutFullSizeJpg = () => {
      const newMockDuplicates = [
        createMediaMock({
          name: 'duplicate1',
          originalNameWithoutExt: mockDuplicateOriginalname,
        }),
        createMediaMock({
          name: 'duplicate2',
          originalNameWithoutExt: mockDuplicateOriginalname,
        }),
      ];

      newMockDuplicates[0].fullSizeJpg = null;

      jest
        .spyOn(mediaDBService, 'getSameFilesIfExist')
        .mockReturnValue(new Promise((resolve) => resolve(newMockDuplicates)));

      const expectedDuplicates = utils.deepCopy(
        mockUpload.uploadFile.properties.duplicates,
      );
      expectedDuplicates[0].staticPath =
        'http://localhost:3000/volumes/path/to/duplicate1.jpg'; // static path without fullSize postfix

      return expectedDuplicates;
    };

    it('should call getSameFilesIfExist and return processed duplicates', async () => {
      const expectedDuplicates = mockUpload.uploadFile.properties.duplicates;

      const duplicates =
        await service.getDuplicatesFromMediaDB(whereOriginalName);

      expect(mediaDBService.getSameFilesIfExist).toHaveBeenCalledWith({
        originalName: 'duplicate.jpg',
      });
      expect(duplicates).toEqual(expectedDuplicates);
    });

    it('should return filePath in StaticPath if fullSizePath is not provided', async () => {
      const expectedDuplicates = mockDuplicatesWithoutFullSizeJpg();

      const duplicates =
        await service.getDuplicatesFromMediaDB(whereOriginalName);

      expect(mediaDBService.getSameFilesIfExist).toHaveBeenCalledWith({
        originalName: 'duplicate.jpg',
      });
      expect(duplicates).toEqual(expectedDuplicates);
    });
  });

  describe('restoreDataIfDeletionError', () => {
    it('should call mediaDB.addMediaToDB with correct params', async () => {
      jest.spyOn(mediaDBService, 'addMediaToDB');

      await service['restoreDataIfDeletionError'](mockDuplicates);

      expect(mediaDBService.addMediaToDB).toHaveBeenCalledWith(mockDuplicates);
    });
  });

  describe('deleteFilesByIds', () => {
    const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
    const mediaList = mockDuplicates;

    beforeEach(() => {
      jest
        .spyOn(mediaDBService, 'deleteMediaByIds')
        .mockResolvedValue(mediaList);
      jest
        .spyOn(diskStorageService, 'removeFilesAndPreviews')
        .mockResolvedValue([]);
      jest.spyOn(mediaDBService, 'addMediaToDB');
    });

    it('should delete files by ids', async () => {
      await service.deleteFilesByIds(ids);

      expect(mediaDBService.deleteMediaByIds).toHaveBeenCalledWith(ids);
      expect(diskStorageService.removeFilesAndPreviews).toHaveBeenCalledWith(
        mediaList,
      );
      expect(mediaDBService.addMediaToDB).not.toHaveBeenCalled();
    });

    it('should restore not deleted files', async () => {
      jest
        .spyOn(diskStorageService, 'removeFilesAndPreviews')
        .mockResolvedValue(mediaList);

      await service.deleteFilesByIds(ids);

      expect(mediaDBService.addMediaToDB).toHaveBeenCalledWith(mediaList);
    });

    it('should throw InternalServerErrorException if deletion failed', async () => {
      jest
        .spyOn(mediaDBService, 'deleteMediaByIds')
        .mockRejectedValue(new Error('Test error'));

      await expect(service.deleteFilesByIds(ids)).rejects.toThrow(
        new InternalServerErrorException('Test error'),
      );
    });
  });

  describe('cleanTemp', () => {
    beforeEach(() => {
      jest.spyOn(diskStorageService, 'emptyDirectory').mockResolvedValue();
      jest
        .spyOn(mediaDBService, 'emptyTempDB')
        .mockResolvedValue({ raw: [], affected: 1 });
    });

    it('should call emptyDirectory and emptyTempDB', async () => {
      await service.cleanTemp();

      expect(diskStorageService.emptyDirectory).toHaveBeenCalled();
      expect(mediaDBService.emptyTempDB).toHaveBeenCalled();
    });
  });

  describe('getStaticPath', () => {
    const domain = 'http://localhost:3000';

    it('should return the correct static path for a given file and directory', () => {
      const filePath = '/image.jpg';
      const mainDir = MainDir.temp;
      const expectedStaticPath = `${domain}/${mainDir}${filePath}`;

      const result = service.getStaticPath(filePath, mainDir);

      expect(result).toBe(expectedStaticPath);
    });
  });
});
