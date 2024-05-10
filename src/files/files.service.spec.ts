import { Test, TestingModule } from '@nestjs/testing';
import type {
  DuplicateFile,
  ProcessFileResultDeprecated,
} from './files.service';
import { FilesService } from './files.service';
import type { Job, Queue } from 'bull';
import type { ProcessFile } from './mediaDB.service';
import { MediaDB } from './mediaDB.service';
import { getQueueToken } from '@nestjs/bull';
import { Processors, MainDir } from 'src/common/constants';
import type { FileProcessingJob } from 'src/jobs/files.processor';
import type { ExifData, GetExifJob } from 'src/jobs/exif.processor';
import { ConfigService } from 'src/config/config.service';
import { MediaTemp } from './entities/media-temp.entity';
import type { FileNameWithExt } from 'src/common/types';
import type { ImageStoreServiceOutputDto } from 'src/jobs/dto/image-store-service-output';
import * as utils from 'src/common/utils';
import {
  createMediaMock,
  createMediaTempMock,
  exifDataMock,
} from './__mocks__/mocks';
import { ObjectId } from 'mongodb';

const exifJobResult: ExifData = {
  'test.jpg': exifDataMock,
};

const fileProcessingResult: ProcessFileResultDeprecated = {
  DBFullPath: '/path/to/mockTempFile-preview.jpg',
  DBFullPathFullSize: '/path/to/mockTempFile-fullSize.jpg',
  fullSizeJpg: 'http://localhost:3000/temp/path/to/mockTempFile-fullSize.jpg',
  fullSizeJpgPath: 'uploadTemp(remove)/path/to/mockTempFile-fullSize.jpg',
  preview: 'http://localhost:3000/temp/path/to/mockTempFile-preview.jpg',
  tempPath: `uploadTemp(remove)/test`,
  existedFilesArr: [
    {
      filePath: '/path/to/duplicate1.jpg',
      fullSizeJpgPath:
        'http://localhost:3000/previews/path/to/duplicate1-fullSize.jpg',
      originalName: 'duplicate.jpg',
      originalPath: 'http://localhost:3000/previews/path/to/duplicate1.jpg',
      preview:
        'http://localhost:3000/previews/path/to/mockTempFile-preview.jpg',
    },
    {
      filePath: '/path/to/duplicate2.jpg',
      fullSizeJpgPath:
        'http://localhost:3000/previews/path/to/duplicate2-fullSize.jpg',
      originalName: 'duplicate.jpg',
      originalPath: 'http://localhost:3000/previews/path/to/duplicate2.jpg',
      preview:
        'http://localhost:3000/previews/path/to/mockTempFile-preview.jpg',
    },
  ],
  newResponse: {
    exif: exifDataMock,
    existedFilesArr: [
      {
        filePath: '/path/to/duplicate1.jpg',
        originalName: 'duplicate.jpg',
        staticFullSizeJpg:
          'http://localhost:3000/previews/path/to/duplicate1-fullSize.jpg',
      },
      {
        filePath: '/path/to/duplicate2.jpg',
        originalName: 'duplicate.jpg',
        staticFullSizeJpg:
          'http://localhost:3000/previews/path/to/duplicate2-fullSize.jpg',
      },
    ],
    id: '662eb6a4aece4209057aa5d0',
    staticFullSizeJpg:
      'http://localhost:3000/temp/path/to/mockTempFile-fullSize.jpg',
    staticPreview:
      'http://localhost:3000/temp/path/to/mockTempFile-preview.jpg',
  },
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

describe('FilesService', () => {
  let service: FilesService;
  let fileQueue: Queue<FileProcessingJob>;
  let exifQueue: Queue<GetExifJob>;
  let mediaDB: MediaDB;

  beforeEach(async () => {
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
          provide: MediaDB,
          useValue: {
            getSameFilesIfExist: jest.fn(() => mockDuplicates),
            addFileToDBTemp: jest.fn(() => mediaTempResponseMock),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            domain: 'http://localhost:3000',
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
    mediaDB = module.get<MediaDB>(MediaDB);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
    let prepareOLDResponse: jest.SpyInstance;
    let resolveAllSettledSpy: jest.SpyInstance;

    beforeEach(() => {
      startAllQueues = jest.spyOn(service, 'startAllQueues');
      finishAllQueues = jest.spyOn(service, 'finishAllQueues');
      pushFileToMediaDBTemp = jest.spyOn(service, 'pushFileToMediaDBTemp');
      resolveAllSettledSpy = jest.spyOn(utils, 'resolveAllSettled');
      prepareOLDResponse = jest.spyOn(service, 'prepareOLDResponse');
    });

    it('should process a file correctly and return the result', async () => {
      const result = await service.processFile(file);

      expect(result).toEqual(fileProcessingResult);
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

    it('should call prepareOLDResponse with params', async () => {
      const expectedDuplicates = mockDuplicates.map(
        ({ filePath, fullSizeJpg, originalName }) => ({
          filePath,
          fullSizeJpg,
          originalName,
        }),
      );

      await service.processFile(file);

      expect(prepareOLDResponse).toHaveBeenCalledWith(
        mediaTempResponseMock,
        expectedDuplicates,
        'test.jpg',
      );
    });
  });

  describe('prepareOLDResponse', () => {
    const mockedAddedMediaTempFile = {
      fullSizeJpg: '/path/to-fullSize.jpg',
      preview: '/path/to-preview.jpg',
    } as Partial<MediaTemp> as Required<MediaTemp>;
    const duplicates: DuplicateFile[] = []; // Assuming no duplicates for the basic test
    const filename: FileNameWithExt = 'image_temp.jpg';
    const filenameWithoutExt = 'image_temp';

    it('should return a deprecated response format', async () => {
      const expectedResult: ProcessFileResultDeprecated = {
        DBFullPath: mockedAddedMediaTempFile.preview,
        DBFullPathFullSize: mockedAddedMediaTempFile.fullSizeJpg,
        fullSizeJpg: service.getStaticPath(
          mockedAddedMediaTempFile.fullSizeJpg,
          MainDir.temp,
        ),
        fullSizeJpgPath: `uploadTemp(remove)${mockedAddedMediaTempFile.fullSizeJpg}`,
        preview: service.getStaticPath(
          mockedAddedMediaTempFile.preview,
          MainDir.temp,
        ),
        tempPath: `uploadTemp(remove)/${filenameWithoutExt}`,
        existedFilesArr: [],
      };

      const result = service.prepareOLDResponse(
        mockedAddedMediaTempFile,
        duplicates,
        filename,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  describe('startAllQueues', () => {
    it('should add jobs to fileQueue and exifQueue', async () => {
      const fileName = 'testFile.jpg';
      const fileType = 'image/jpeg';

      const result = await service.startAllQueues({ fileName, fileType });

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
      const result = await service.finishAllQueues({
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

  describe('getDuplicatesFromMediaDB', () => {
    it('should call getSameFilesIfExist and return processed duplicates', async () => {
      const expectedDuplicates = mockDuplicates.map(
        ({ filePath, fullSizeJpg, originalName }) => ({
          filePath,
          fullSizeJpg,
          originalName,
        }),
      );

      const duplicates =
        await service.getDuplicatesFromMediaDB('duplicate.jpg');

      expect(mediaDB.getSameFilesIfExist).toHaveBeenCalledWith('duplicate.jpg');
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
