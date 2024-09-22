import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import type { Job, Queue } from 'bull';
import type { UpdateMedia } from './mediaDB.service';
import { MediaDBService } from './mediaDB.service';
import { getQueueToken } from '@nestjs/bull';
import { Processors, MainDir } from 'src/common/constants';
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
import type { GetSameFilesIfExist, ProcessFile } from './types';
import { Media } from './entities/media.entity';
import { DiscStorageService } from './discStorage.service';
import { PathsService } from 'src/paths/paths.service';
import { KeywordsService } from 'src/keywords/keywords.service';
import type { UpdatedFilesInputDto } from './dto/update-files-input.dto';

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
      mimetype: 'image/jpeg',
      originalName: 'duplicate.jpg',
      staticPath:
        'http://localhost:3000/previews/path/to/duplicate1-fullSize.jpg',
      staticPreview:
        'http://localhost:3000/previews/path/to/duplicate1-preview.jpg',
    },
    {
      filePath: '/path/to/duplicate2.jpg',
      mimetype: 'image/jpeg',
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
  let mediaDB: MediaDBService;
  let service: FilesService;
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
            getSameFilesIfExist,
            removeMediaFromTempDB: jest.fn(),
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
            saveFilesArrToDisk: jest.fn(),
          },
        },
        {
          provide: PathsService,
          useValue: {
            addPaths: jest.fn(),
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
    fileQueue = module.get<Queue<FileProcessingJob>>(
      getQueueToken(Processors.fileProcessor),
    );
    exifQueue = module.get<Queue<GetExifJob>>(
      getQueueToken(Processors.exifProcessor),
    );
    mediaDB = module.get<MediaDBService>(MediaDBService);
  });

  beforeEach(() => {
    jest
      .spyOn(mediaDB, 'addFileToDBTemp')
      .mockReturnValue(
        new Promise((resolve) => resolve(mediaTempResponseMock)),
      );
    jest
      .spyOn(mediaDB, 'getSameFilesIfExist')
      .mockReturnValue(new Promise((resolve) => resolve(mockDuplicates)));

    resetMockUpload();
  });

  afterEach(jest.clearAllMocks);

  it('should be defined', () => {
    expect(service).toBeDefined();
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
        .spyOn(mediaDB, 'updateMediaList')
        .mockReturnValue(
          new Promise((resolve) => resolve(mediaDB_UpdateMediaList)),
        );
    });

    it('should save files', async () => {
      const result = await service.saveFiles(filesToUpload);

      const responseMedia1 = createMediaMock({
        id: new ObjectId('00000001f80f825d51300844'),
        name: 'test1-updated',
        originalNameWithoutExt: 'test1-updated',
      });
      responseMedia1.keywords = ['keyword1', 'keyword2'];
      responseMedia1.fullSizeJpg =
        '/image-jpeg/fullSize/2020.01.01 - originalDate/test1-updated-fullSize.jpg';
      responseMedia1.preview =
        '/image-jpeg/preview/2020.01.01 - originalDate/test1-updated-preview.jpg';

      const responseMedia2 = createMediaMock({
        id: new ObjectId('00000001f80f825d51300845'),
        name: 'test2-updated',
        originalNameWithoutExt: 'test2-updated',
      });
      responseMedia2.originalDate = new Date('2024-09-20T17:00:00.000Z');
      responseMedia2.keywords = [];
      responseMedia2.fullSizeJpg =
        '/image-jpeg/fullSize/2024.09.20 - originalDate/test2-updated-fullSize.jpg';
      responseMedia2.preview =
        '/image-jpeg/preview/2024.09.20 - originalDate/test2-updated-preview.jpg';

      expect(JSON.stringify(result)).toEqual(
        JSON.stringify([responseMedia1, responseMedia2]),
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
        .spyOn(mediaDB, 'addFileToDBTemp')
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

  describe('startAllQueues', () => {
    it('should add jobs to fileQueue and exifQueue', async () => {
      const fileName = 'testFile.jpg';
      const fileType = 'image/jpeg';

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

  describe('finishAllQueues', () => {
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

      expect(mediaDB.addFileToDBTemp).toHaveBeenCalledWith(
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

      expect(mediaDB.addFileToDBTemp).toHaveBeenCalledWith(
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
      expect(mediaDB.getSameFilesIfExist).toHaveBeenCalledTimes(
        originalNameList.length,
      );
      originalNameList.forEach((originalName) => {
        expect(mediaDB.getSameFilesIfExist).toHaveBeenCalledWith({
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
      expect(mediaDB.getSameFilesIfExist).toHaveBeenCalledTimes(
        filePathList.length,
      );
      filePathList.forEach((filePath) => {
        expect(mediaDB.getSameFilesIfExist).toHaveBeenCalledWith({
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
        .spyOn(mediaDB, 'getSameFilesIfExist')
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

      expect(mediaDB.getSameFilesIfExist).toHaveBeenCalledWith({
        originalName: 'duplicate.jpg',
      });
      expect(duplicates).toEqual(expectedDuplicates);
    });

    it('should return filePath in StaticPath if fullSizePath is not provided', async () => {
      const expectedDuplicates = mockDuplicatesWithoutFullSizeJpg();

      const duplicates =
        await service.getDuplicatesFromMediaDB(whereOriginalName);

      expect(mediaDB.getSameFilesIfExist).toHaveBeenCalledWith({
        originalName: 'duplicate.jpg',
      });
      expect(duplicates).toEqual(expectedDuplicates);
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
