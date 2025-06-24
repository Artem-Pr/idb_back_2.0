import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import type { Job, Queue } from 'bull';
import type { GetFilesResponse, UpdateMedia } from './mediaDB.service';
import { MediaDBService } from './mediaDB.service';
import { getQueueToken } from '@nestjs/bull';
import {
  Processors,
  MainDir,
  SupportedImageMimetypes,
  SupportedVideoMimeTypes,
} from 'src/common/constants';
import type { CreatePreviewJob } from 'src/jobs/files.processor';
import type { ExifData, GetExifJob } from 'src/jobs/exif.processor';
import { ConfigService } from 'src/config/config.service';
import { MediaTemp } from './entities/media-temp.entity';
import type { ImageStoreServiceOutputDto } from 'src/jobs/dto/image-store-service-output.dto';
import * as customPromise from 'src/common/customPromise';
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
import { omit, clone } from 'ramda';
import { InternalServerErrorException } from '@nestjs/common';
import { ProcessExifKeysHandler } from '../exif-keys/handlers/process-exif-keys.handler';

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
} as Partial<Job<CreatePreviewJob>> as Job<CreatePreviewJob>;

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
      exif: exifDataMock,
      filePath: '/path/to/duplicate1.jpg',
      mimetype: SupportedImageMimetypes.jpg,
      originalName: 'duplicate.jpg',
      staticVideoFullSize: null,
      staticPath:
        'http://localhost:3000/previews/path/to/duplicate1-fullSize.jpg',
      staticPreview:
        'http://localhost:3000/previews/path/to/duplicate1-preview.jpg',
    },
    {
      exif: exifDataMock,
      filePath: '/path/to/duplicate2.jpg',
      mimetype: SupportedImageMimetypes.jpg,
      originalName: 'duplicate.jpg',
      staticVideoFullSize: null,
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
  let fileQueue: Queue<CreatePreviewJob>;
  let getSameFilesIfExist: jest.Mock<GetSameFilesIfExist>;
  let mediaDBService: MediaDBService;
  let service: FilesService;
  let keywordsService: KeywordsService;
  let diskStorageService: DiscStorageService;
  let pathsService: PathsService;
  let processExifKeysHandler: ProcessExifKeysHandler;
  let getUpdatedMediaList: jest.Mock<UpdateMedia[]>;
  let module: TestingModule;

  beforeAll(async () => {
    addFileToDBTemp = jest.fn().mockReturnValue(mediaTempResponseMock);
    getSameFilesIfExist = jest.fn().mockReturnValue(mockDuplicates);
    getUpdatedMediaList = jest.fn().mockReturnValue([]);

    module = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getQueueToken(Processors.fileProcessor),
          useValue: {
            add: jest.fn(() => mockPreviewJob),
            obliterate: jest.fn(),
          },
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
            getFilesDescriptions: jest.fn(),
            getSameFilesIfExist,
            getUpdatedMediaList,
            replaceMediaInDB: jest.fn(),
            updateMediaInDB: jest.fn(),
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
            moveMediaToNewDir: jest.fn(),
            removeFilesAndPreviews: jest.fn(),
            removePreviews: jest.fn(),
          },
        },
        {
          provide: PathsService,
          useValue: {
            addPathsToDB: jest.fn(),
            getDirAndSubfoldersFromArray: jest.fn(),
            getPreviewsAndFullPathsFormMediaList: jest.fn(),
          },
        },
        {
          provide: KeywordsService,
          useValue: {
            addKeywords: jest.fn(),
          },
        },
        {
          provide: ProcessExifKeysHandler,
          useValue: {
            handle: jest.fn().mockResolvedValue({ success: true, data: 0 }),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    mediaDBService = module.get<MediaDBService>(MediaDBService);
    keywordsService = module.get<KeywordsService>(KeywordsService);
    pathsService = module.get<PathsService>(PathsService);
    diskStorageService = module.get<DiscStorageService>(DiscStorageService);
    processExifKeysHandler = module.get<ProcessExifKeysHandler>(
      ProcessExifKeysHandler,
    );
    fileQueue = module.get<Queue<CreatePreviewJob>>(
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
    fileQueue.obliterate = jest.fn();

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
        staticVideoFullSize: null,
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
        staticVideoFullSize: null,
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

  describe('saveMediaListToDB', () => {
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
      await service['saveMediaListToDB'](mediaDB_UpdateMediaList);
      expect(mediaDBService.addMediaToDB).toHaveBeenCalledWith([
        newMedia1,
        newMedia2,
      ]);
    });

    it('should call processExifKeysHandler.handle with saved media', async () => {
      const savedMedia = [newMedia1, newMedia2];
      jest.spyOn(mediaDBService, 'addMediaToDB').mockResolvedValue(savedMedia);

      await service['saveMediaListToDB'](mediaDB_UpdateMediaList);

      expect(processExifKeysHandler.handle).toHaveBeenCalledWith({
        mediaList: savedMedia,
      });
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
        .spyOn(mediaDBService, 'getUpdatedMediaList')
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
        .spyOn(mediaDBService, 'getUpdatedMediaList')
        .mockRejectedValue(new Error('Failed to save files'));

      await expect(service.saveFiles(filesToUpload)).rejects.toThrow(
        new InternalServerErrorException('Failed to save files'),
      );
    });

    it('should restore DB data if creation failed', async () => {
      jest.spyOn(mediaDBService, 'deleteMediaByIds');
      jest
        .spyOn(diskStorageService, 'moveMediaToNewDir')
        .mockRejectedValue(new Error('Failed to save files'));

      await expect(service.saveFiles(filesToUpload)).rejects.toThrow(
        new InternalServerErrorException('Failed to save files'),
      );
      expect(mediaDBService.deleteMediaByIds).toHaveBeenCalledWith([
        '00000001f80f825d51300844',
        '00000001f80f825d51300845',
      ]);
    });
  });

  describe('stopAllPreviewJobs', () => {
    it('should stop all preview jobs', async () => {
      await service.stopAllPreviewJobs();
      expect(fileQueue.obliterate).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('updatePreviews', () => {
    it('should update video previews', async () => {
      const mediaToUpdate: Media = new Media();
      mediaToUpdate.mimetype = SupportedVideoMimeTypes.mov;
      mediaToUpdate.originalDate = new Date('2010-10-10 10:10:10');
      mediaToUpdate.timeStamp = '00:01:02.000';
      const originalFilePath = '/path/to/file.mov';

      const result = await service['updatePreviews'](
        mediaToUpdate,
        originalFilePath,
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe('updateVideoPreviewsWithNewTimeStamp', () => {
    it('should update video previews with new timestamp', async () => {
      const oldMedia = new Media();
      oldMedia.mimetype = SupportedVideoMimeTypes.mov;
      oldMedia.originalDate = new Date('2010-10-10 10:10:10');
      oldMedia.filePath = '/path/to/updatedFilePath.mov';
      oldMedia.originalName = 'updatedFilePath.mov';
      oldMedia.timeStamp = '00:00:00.000';

      const newMedia = new Media();
      newMedia.mimetype = SupportedVideoMimeTypes.mov;
      newMedia.originalDate = new Date('2010-10-10 10:10:10');
      newMedia.originalName = 'updatedFilePath.mov';
      newMedia.timeStamp = '00:01:02.000';
      newMedia.exif = { Duration: 200 };

      const updatedMediaList: UpdateMedia[] = [
        {
          oldMedia,
          newMedia,
        },
      ];

      const result =
        await service['updateVideoPreviewsWithNewTimeStamp'](updatedMediaList);

      expect(result).not.toEqual(updatedMediaList);
      expect(result).toMatchSnapshot();
    });

    it('should not update video previews if timeStamp is not changed', async () => {
      const oldMedia = new Media();
      oldMedia.mimetype = SupportedVideoMimeTypes.mov;
      oldMedia.originalDate = new Date('2010-10-10 10:10:10');
      oldMedia.filePath = '/path/to/updatedFilePath.mov';
      oldMedia.originalName = 'updatedFilePath.mov';
      oldMedia.timeStamp = '00:00:00.000';

      const newMedia = new Media();
      newMedia.mimetype = SupportedVideoMimeTypes.mov;
      newMedia.originalDate = new Date('2010-10-10 10:10:10');
      newMedia.originalName = 'updatedFilePath.mov';
      oldMedia.timeStamp = '00:00:00.000';

      const resolvedList: UpdateMedia[] = [
        {
          oldMedia,
          newMedia,
        },
      ];

      const result =
        await service['updateVideoPreviewsWithNewTimeStamp'](resolvedList);

      expect(result).toEqual({ resolvedList, errors: [] });
    });

    it('should return errors if timestamp is larger than video duration', async () => {
      const oldMedia = new Media();
      oldMedia.mimetype = SupportedVideoMimeTypes.mov;
      oldMedia.originalDate = new Date('2010-10-10 10:10:10');
      oldMedia.filePath = '/path/to/updatedFilePath.mov';
      oldMedia.originalName = 'updatedFilePath.mov';
      oldMedia.timeStamp = '00:00:00.000';

      const newMedia = new Media();
      newMedia.mimetype = SupportedVideoMimeTypes.mov;
      newMedia.originalDate = new Date('2010-10-10 10:10:10');
      newMedia.originalName = 'updatedFilePath.mov';
      newMedia.timeStamp = '00:01:02.000';
      newMedia.exif = { Duration: 20 };

      const updatedMediaList: UpdateMedia[] = [
        {
          oldMedia,
          newMedia,
        },
      ];

      const result =
        await service['updateVideoPreviewsWithNewTimeStamp'](updatedMediaList);

      expect(result).toMatchSnapshot();
    });
  });

  describe('removeAbandonedPreviews', () => {
    it('should remove abandoned previews if timeStamp is changed', async () => {
      const oldMedia = new Media();
      oldMedia.mimetype = SupportedVideoMimeTypes.mov;
      oldMedia.originalDate = new Date('2010-10-10 10:10:10');
      oldMedia.filePath = '/path/to/updatedFilePath.mov';
      oldMedia.originalName = 'updatedFilePath.mov';
      oldMedia.preview = '/path/to/updatedFilePath-preview.jpg';
      oldMedia.timeStamp = '00:00:00.000';

      const newMedia = new Media();
      newMedia.mimetype = SupportedVideoMimeTypes.mov;
      newMedia.originalDate = new Date('2010-10-10 10:10:10');
      newMedia.originalName = 'updatedFilePath.mov';
      newMedia.timeStamp = '00:01:02.000';

      const updatedMediaList: UpdateMedia[] = [
        {
          oldMedia,
          newMedia,
        },
      ];

      await service['removeAbandonedPreviews'](updatedMediaList);

      expect(
        pathsService.getPreviewsAndFullPathsFormMediaList,
      ).toHaveBeenCalledWith([oldMedia]);
    });
  });

  describe('updateFiles', () => {
    const filesToUpdate: UpdatedFilesInputDto = {
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
        .spyOn(mediaDBService, 'getUpdatedMediaList')
        .mockReturnValue(
          new Promise((resolve) => resolve(mediaDB_UpdateMediaList)),
        );
      jest.spyOn(diskStorageService, 'moveMediaToNewDir').mockResolvedValue();
    });

    it('should update files', async () => {
      const result = await service.updateFiles(filesToUpdate);
      expect(result).toMatchSnapshot();
    });

    it('should throw error if update files failed', async () => {
      jest
        .spyOn(mediaDBService, 'getUpdatedMediaList')
        .mockRejectedValue(new Error('Failed to update files'));

      await expect(service.updateFiles(filesToUpdate)).rejects.toThrow(
        new InternalServerErrorException('Failed to update files'),
      );
    });

    it('should restore DB data if updating failed', async () => {
      jest.spyOn(mediaDBService, 'updateMediaInDB');
      jest
        .spyOn(diskStorageService, 'moveMediaToNewDir')
        .mockRejectedValue(new Error('Failed to update files'));

      await expect(service.updateFiles(filesToUpdate)).rejects.toThrow(
        new InternalServerErrorException('Failed to update files'),
      );
      expect(mediaDBService.updateMediaInDB).toHaveBeenCalledWith([
        oldMedia1,
        oldMedia2,
      ]);
    });
  });

  describe('processFile', () => {
    const file = {
      filename: 'test.jpg',
      mimetype: 'image/jpeg',
      originalname: 'original_test.jpg',
    } as Partial<ProcessFile> as ProcessFile;

    let startAllQueues: jest.SpyInstance<
      Promise<{ exifJob: Job<GetExifJob>; previewJob: Job<CreatePreviewJob> }>,
      [Pick<CreatePreviewJob, 'fileName' | 'fileType'>],
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
          previewJob: Job<CreatePreviewJob>;
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
      resolveAllSettledSpy = jest.spyOn(customPromise, 'resolveAllSettled');
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

      const expectedDuplicates = clone(
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

  describe('getFilesDescriptions', () => {
    let getFilesDescriptions: jest.Mock;

    beforeEach(() => {
      getFilesDescriptions = jest.fn().mockResolvedValue({
        descriptions: ['test description 1', 'test description 2'],
        totalCount: 2,
      });
      jest
        .spyOn(mediaDBService, 'getFilesDescriptions')
        .mockImplementation(getFilesDescriptions);
    });

    it('should return descriptions with default pagination', async () => {
      const result = await service.getFilesDescriptions({});

      expect(result).toEqual({
        descriptions: ['test description 1', 'test description 2'],
        page: 1,
        perPage: 10,
        resultsCount: 2,
        totalPages: 1,
      });
      expect(getFilesDescriptions).toHaveBeenCalledWith({
        descriptionPart: undefined,
        page: 1,
        perPage: 10,
      });
    });

    it('should return descriptions with custom pagination', async () => {
      const result = await service.getFilesDescriptions({
        page: 2,
        perPage: 5,
      });

      expect(result).toEqual({
        descriptions: ['test description 1', 'test description 2'],
        page: 2,
        perPage: 5,
        resultsCount: 2,
        totalPages: 1,
      });
      expect(getFilesDescriptions).toHaveBeenCalledWith({
        descriptionPart: undefined,
        page: 2,
        perPage: 5,
      });
    });

    it('should return descriptions with search term', async () => {
      const result = await service.getFilesDescriptions({
        descriptionPart: 'test',
      });

      expect(result).toEqual({
        descriptions: ['test description 1', 'test description 2'],
        page: 1,
        perPage: 10,
        resultsCount: 2,
        totalPages: 1,
      });
      expect(getFilesDescriptions).toHaveBeenCalledWith({
        descriptionPart: 'test',
        page: 1,
        perPage: 10,
      });
    });

    it('should calculate total pages correctly', async () => {
      getFilesDescriptions.mockResolvedValueOnce({
        descriptions: ['test description 1', 'test description 2'],
        totalCount: 15,
      });

      const result = await service.getFilesDescriptions({
        perPage: 5,
      });

      expect(result).toEqual({
        descriptions: ['test description 1', 'test description 2'],
        page: 1,
        perPage: 5,
        resultsCount: 15,
        totalPages: 3,
      });
    });
  });
});
