import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type {
  GetFilesDBResponse,
  UpdateMedia,
  UpdatedFilesInputObject,
} from './mediaDB.service';
import { DBType, MediaDBService } from './mediaDB.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaTemp } from './entities/media-temp.entity';
import { Media } from './entities/media.entity';
import {
  MongoRepository,
  Repository,
  AggregationCursor,
  BulkWriteResult,
} from 'typeorm';
import { ObjectId } from 'mongodb';
import {
  createMediaMock,
  createMediaTempMock,
  createMockProcessFile,
  exifDataMock,
} from './__mocks__/mocks';
import type { FilePaths, GetSameFilesIfExist } from './types';
import type {
  UpdatedFieldsInputDto,
  UpdatedFilesInputDto,
} from './dto/update-files-input.dto';
import type { MongoFilterCondition } from './mediaDBQueryCreators';
import type { DBFilePath, DBPreviewPath } from 'src/common/types';
import type { Pagination } from './dto/get-files-output.dto';
import type { GetFilesInputDto } from './dto/get-files-input.dto';
import {
  SupportedImageMimetypes,
  SupportedVideoMimeTypes,
} from 'src/common/constants';

describe('MediaDB', () => {
  let service: MediaDBService;
  let tempRepository: Repository<MediaTemp>;
  let mediaRepository: MongoRepository<Media>;

  const mockedAggregationReturnValue = [
    createMediaMock({ id: new ObjectId('507f1f77bcf86cd799439011') }),
  ];

  const aggregation = {
    toArray: jest.fn().mockResolvedValue(mockedAggregationReturnValue),
  } as unknown as AggregationCursor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaDBService,
        {
          provide: getRepositoryToken(MediaTemp),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Media),
          useClass: MongoRepository,
        },
      ],
    }).compile();

    service = module.get(MediaDBService);
    tempRepository = module.get(getRepositoryToken(MediaTemp));
    mediaRepository = module.get(getRepositoryToken(Media));
    jest.spyOn(mediaRepository, 'aggregate').mockReturnValue(aggregation);
    jest.spyOn(service, 'getDynamicFoldersRecursively');
  });

  afterEach(jest.clearAllMocks);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addFileToDBTemp', () => {
    it('should create a new MediaTemp entry with the correct data', async () => {
      const filePathsMock: FilePaths = {
        filePath: '/path/to/file.jpg',
        fullSizePath: '/path/to-fullSize.jpg',
        previewPath: '/path/to-preview.jpg',
      };
      const fileMock = createMockProcessFile();

      const mediaTempMock: MediaTemp = createMediaTempMock();
      jest.spyOn(tempRepository, 'save').mockResolvedValue(mediaTempMock);

      const result = await service.addFileToDBTemp(
        exifDataMock,
        filePathsMock,
        fileMock,
      );

      expect(tempRepository.save).toMatchSnapshot();
      expect(result).toEqual(mediaTempMock);
    });
  });

  describe('addMediaToDB', () => {
    it('should call mediaRepository.save with the correct data', async () => {
      const mediaMock: Media = createMediaMock();
      jest.spyOn(mediaRepository, 'save').mockResolvedValue(mediaMock);

      await service.addMediaToDB(mediaMock);
      expect(mediaRepository.save).toHaveBeenCalledWith(mediaMock);
    });
  });

  describe('updateMediaInDB', () => {
    it('should call mediaRepository.bulkWrite with the correct data', async () => {
      const mediaMock1: Media = createMediaMock({ name: 'mediaMock1' });
      const mediaMock2: Media = createMediaMock({ name: 'mediaMock2' });
      const bulkWriteResult = {} as BulkWriteResult;
      jest
        .spyOn(mediaRepository, 'bulkWrite')
        .mockResolvedValue(bulkWriteResult);

      await service.updateMediaInDB([mediaMock1, mediaMock2]);
      expect(mediaRepository.bulkWrite).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { _id: mediaMock1._id },
            update: { $set: mediaMock1 },
          },
        },
        {
          updateOne: {
            filter: { _id: mediaMock2._id },
            update: { $set: mediaMock2 },
          },
        },
      ]);
    });
  });

  describe('replaceMediaInDB', () => {
    it('should call mediaRepository.bulkWrite with the correct data', async () => {
      const mediaMock1: Media = createMediaMock({ name: 'mediaMock1' });
      const mediaMock2: Media = createMediaMock({ name: 'mediaMock2' });
      const bulkWriteResult = {} as BulkWriteResult;
      jest
        .spyOn(mediaRepository, 'bulkWrite')
        .mockResolvedValue(bulkWriteResult);

      await service.replaceMediaInDB([mediaMock1, mediaMock2]);
      expect(mediaRepository.bulkWrite).toHaveBeenCalledWith([
        {
          replaceOne: {
            filter: { _id: mediaMock1._id },
            replacement: mediaMock1,
          },
        },
        {
          replaceOne: {
            filter: { _id: mediaMock2._id },
            replacement: mediaMock2,
          },
        },
      ]);
    });
  });

  describe('findMediaByIdsInDB', () => {
    it('should call mediaRepository.find with the correct data', async () => {
      const ids = [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];
      const expectedValue = {
        where: {
          _id: {
            $in: [
              new ObjectId(ids[0]),
              new ObjectId(ids[1]),
              new ObjectId(ids[2]),
            ],
          },
        },
      };
      jest.spyOn(mediaRepository, 'find').mockResolvedValue([]);

      await service.findMediaByIdsInDB(ids);
      expect(mediaRepository.find).toHaveBeenCalledWith(expectedValue);
    });
  });

  describe('findMediaByIdsInDBTemp', () => {
    it('should call tempRepository.find with the correct data', async () => {
      const ids = [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];
      const expectedValue = {
        where: {
          _id: {
            $in: [
              new ObjectId(ids[0]),
              new ObjectId(ids[1]),
              new ObjectId(ids[2]),
            ],
          },
        },
      };
      jest.spyOn(tempRepository, 'find').mockResolvedValue([]);

      await service.findMediaByIdsInDBTemp(ids);
      expect(tempRepository.find).toHaveBeenCalledWith(expectedValue);
    });
  });

  describe('findMediaByDirectoryInDB', () => {
    it('should call mediaRepository.find with the correct data', async () => {
      const directory = '//path/to/directory//';
      const expectedValue = {
        filePath: new RegExp('^/path/to/directory/'),
      };
      jest.spyOn(mediaRepository, 'find').mockResolvedValue([]);

      await service.findMediaByDirectoryInDB(directory);
      expect(mediaRepository.find).toHaveBeenCalledWith(expectedValue);
    });
  });

  describe('findNotEmptyPreviewsInDB', () => {
    it('should call mediaRepository.find with the correct data', async () => {
      const expectedValue = {
        where: {
          $and: [
            { preview: { $exists: true } },
            { preview: { $ne: null } },
            { preview: { $ne: '' } },
          ],
        },
        select: ['_id', 'fullSizeJpg', 'preview'],
      };
      jest.spyOn(mediaRepository, 'find').mockResolvedValue([]);

      await service.findNotEmptyPreviewsInDB();
      expect(mediaRepository.find).toHaveBeenCalledWith(expectedValue);
    });
  });

  describe('getSameFilesIfExist', () => {
    it('should return an array of files with the same original name', async () => {
      const originalNameMock: GetSameFilesIfExist = {
        originalName: 'test.jpg',
      };
      const mediaArrayMock: Media[] = [
        createMediaMock({ name: 'test1', originalNameWithoutExt: 'test' }),
        createMediaMock({ name: 'test2', originalNameWithoutExt: 'test' }),
      ];

      jest.spyOn(mediaRepository, 'find').mockResolvedValue(mediaArrayMock);

      const result = await service.getSameFilesIfExist(originalNameMock);

      expect(mediaRepository.find).toHaveBeenCalledWith({
        where: originalNameMock,
      });
      expect(result).toEqual(mediaArrayMock);
    });

    it('should return an empty array if no files with the same original name exist', async () => {
      const originalNameMock: GetSameFilesIfExist = {
        originalName: 'nonexistent.jpg',
      };
      jest.spyOn(mediaRepository, 'find').mockResolvedValue([]);

      const result = await service.getSameFilesIfExist(originalNameMock);

      expect(mediaRepository.find).toHaveBeenCalledWith({
        where: originalNameMock,
      });
      expect(result).toEqual([]);
    });
  });

  describe('getUpdatedFilesInputObject', () => {
    it('should return an object with file IDs as keys and updated fields as values', () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '507f1f77bcf86cd799439011',
            updatedFields: { originalName: 'newName1.jpg' },
          },
          {
            id: '507f1f77bcf86cd799439012',
            updatedFields: { originalName: 'newName2.jpg' },
          },
        ],
      };

      const expectedOutput: UpdatedFilesInputObject = {
        '507f1f77bcf86cd799439011': { originalName: 'newName1.jpg' },
        '507f1f77bcf86cd799439012': { originalName: 'newName2.jpg' },
      };

      const result = service['getUpdatedFilesInputObject'](filesToUpload);
      expect(result).toEqual(expectedOutput);
    });

    it('should handle an empty files array gracefully', () => {
      const filesToUpload: UpdatedFilesInputDto = { files: [] };

      const expectedOutput: UpdatedFilesInputObject = {};

      const result = service['getUpdatedFilesInputObject'](filesToUpload);
      expect(result).toEqual(expectedOutput);
    });

    it('should handle files with empty updated fields', () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '507f1f77bcf86cd799439013',
            updatedFields: {},
          },
        ],
      };

      const expectedOutput: UpdatedFilesInputObject = {
        '507f1f77bcf86cd799439013': {},
      };

      const result = service['getUpdatedFilesInputObject'](filesToUpload);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('updateDBMediaEntity', () => {
    it('should update the media entity with the provided fields', () => {
      const mediaToUpdate = createMediaMock({
        id: new ObjectId('507f1f77bcf86cd799439011'),
        originalNameWithoutExt: 'original_media',
      });

      const updatedFields: Partial<UpdatedFieldsInputDto> = {
        originalName: 'updated_media.jpg',
        filePath: '/updated/path/to/file.jpg',
        originalDate: '2010-10-10T10:10:10.000Z',
        description: 'Updated description',
        keywords: ['updated', 'keywords'],
        rating: 4,
        timeStamp: '00:00:00.500',
        changeDate: '2023-01-02T00:00:00.000Z',
      };

      const result = service['updateDBMediaEntity'](
        mediaToUpdate,
        updatedFields,
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe('validateIfMediaExists', () => {
    it('should return true if all IDs exist', () => {
      const ids = ['1', '2', '3'];
      const mediaIdList = ['1', '2', '3', '4', '5'];

      expect(service['validateIfMediaExists'](ids, mediaIdList)).toBe(true);
    });

    it('should throw NotFoundException if some IDs do not exist', () => {
      const ids = ['1', '2', '3'];
      const mediaIdList = ['1', '2'];

      expect(() => {
        service['validateIfMediaExists'](ids, mediaIdList);
      }).toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message if some IDs do not exist', () => {
      const ids = ['1', '2', '3'];
      const mediaIdList = ['1'];

      expect(() => {
        service['validateIfMediaExists'](ids, mediaIdList);
      }).toThrow(new NotFoundException('Ids not found in database: 2, 3'));
    });

    it('should return true if no IDs are provided', () => {
      const ids: string[] = [];
      const mediaIdList = ['1', '2', '3'];

      expect(service['validateIfMediaExists'](ids, mediaIdList)).toBe(true);
    });

    it('should throw NotFoundException if no media IDs are provided', () => {
      const ids = ['1', '2', '3'];
      const mediaIdList: string[] = [];

      expect(() => {
        service['validateIfMediaExists'](ids, mediaIdList);
      }).toThrow(new NotFoundException('Ids not found in database: 1, 2, 3'));
    });
  });

  describe('getMediaListByIds', () => {
    const media1 = createMediaMock({
      id: new ObjectId('507f1f77bcf86cd799439011'),
    });
    const media2 = createMediaMock({
      id: new ObjectId('507f1f77bcf86cd799439012'),
    });

    beforeEach(() => {
      jest.spyOn(mediaRepository, 'find').mockResolvedValue([media1, media2]);
      jest.spyOn(tempRepository, 'find').mockResolvedValue([media1, media2]);
    });

    it('should return the media list with the provided IDs if DBType is DBMedia', async () => {
      const mediaIds = [media1._id.toHexString(), media2._id.toHexString()];
      const result = await service['getMediaListByIds'](
        mediaIds,
        DBType.DBMedia,
      );

      expect(result).toEqual([media1, media2]);
    });

    it('should return the media list with the provided IDs if DBType is DBTemp', async () => {
      const mediaIds = [media1._id.toHexString(), media2._id.toHexString()];
      const result = await service['getMediaListByIds'](
        mediaIds,
        DBType.DBTemp,
      );

      expect(result).toEqual([media1, media2]);
    });

    it('should throw NotFoundException if no media is found with the provided IDs', async () => {
      const mediaIds = ['507f1f77bcf86cd799439013'];
      await expect(
        service['getMediaListByIds'](mediaIds, DBType.DBMedia),
      ).rejects.toThrow(
        new NotFoundException(
          'Ids not found in database: 507f1f77bcf86cd799439013',
        ),
      );
    });
  });

  describe('getUpdatedMediaList', () => {
    const initialMedia1Object = {
      id: new ObjectId('507f1f77bcf86cd799439011'),
      name: 'test1',
      originalNameWithoutExt: 'test1',
    };
    const initialMedia2Object = {
      id: new ObjectId('507f1f77bcf86cd799439012'),
      name: 'test2',
      originalNameWithoutExt: 'test2',
    };

    let media1 = new Media();
    let media2 = new Media();

    let mediaList: Media[] = [];

    let updatedMedia1 = new Media();
    let updatedMedia2 = new Media();

    beforeEach(() => {
      media1 = createMediaMock(initialMedia1Object);
      media2 = createMediaMock(initialMedia2Object);

      mediaList = [media1, media2];
      updatedMedia1 = media1;
      updatedMedia2 = media2;
    });

    afterEach(() => {
      media1 = new Media();
      media2 = new Media();

      mediaList = [];

      updatedMedia1 = new Media();
      updatedMedia2 = new Media();

      jest.clearAllMocks();
    });

    it('should update media list in media repository', async () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '507f1f77bcf86cd799439011',
            updatedFields: {
              description: 'new description',
            },
          },
          {
            id: '507f1f77bcf86cd799439012',
            updatedFields: {
              keywords: ['new keyword'],
            },
          },
        ],
      };

      updatedMedia1.description = 'new description';
      updatedMedia2.keywords = ['new keyword'];

      const expectedResult: UpdateMedia[] = [
        { oldMedia: media1, newMedia: updatedMedia1 },
        { oldMedia: media2, newMedia: updatedMedia2 },
      ];

      jest.spyOn(mediaRepository, 'find').mockResolvedValue(mediaList);

      const result = await service.getUpdatedMediaList(
        filesToUpload,
        DBType.DBMedia,
      );

      expect(result).toEqual(expectedResult);
      expect(mediaRepository.find).toHaveBeenCalledTimes(1);
      expect(mediaRepository.find).toHaveBeenCalledWith({
        where: {
          _id: {
            $in: [
              new ObjectId('507f1f77bcf86cd799439011'),
              new ObjectId('507f1f77bcf86cd799439012'),
            ],
          },
        },
      });
    });

    it('should update media list in temp repository', async () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '507f1f77bcf86cd799439011',
            updatedFields: {
              description: 'new description',
            },
          },
          {
            id: '507f1f77bcf86cd799439012',
            updatedFields: {
              keywords: ['new keyword'],
            },
          },
        ],
      };

      updatedMedia1.description = 'new description';
      updatedMedia2.keywords = ['new keyword'];

      const expectedResult: UpdateMedia[] = [
        { oldMedia: media1, newMedia: updatedMedia1 },
        { oldMedia: media2, newMedia: updatedMedia2 },
      ];

      jest.spyOn(tempRepository, 'find').mockResolvedValue(mediaList);

      const result = await service.getUpdatedMediaList(
        filesToUpload,
        DBType.DBTemp,
      );

      expect(result).toEqual(expectedResult);
      expect(tempRepository.find).toHaveBeenCalledTimes(1);
      expect(tempRepository.find).toHaveBeenCalledWith({
        where: {
          _id: {
            $in: [
              new ObjectId('507f1f77bcf86cd799439011'),
              new ObjectId('507f1f77bcf86cd799439012'),
            ],
          },
        },
      });
    });

    it('should throw an error if ids are not found in database', async () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '507f1f77bcf86cd799439011',
            updatedFields: {
              description: 'new description',
            },
          },
          {
            id: '507f1f77bcf86cd799439012',
            updatedFields: {
              keywords: ['new keyword'],
            },
          },
        ],
      };

      jest.spyOn(mediaRepository, 'find').mockResolvedValue([]);

      await expect(
        service.getUpdatedMediaList(filesToUpload, DBType.DBMedia),
      ).rejects.toThrow(
        new NotFoundException(
          `Ids not found in database: 507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012`,
        ),
      );
    });
  });

  describe('deleteMediaFromTempDB', () => {
    it('should remove media from temp repository', async () => {
      const idsToRemove = [
        new ObjectId('507f1f77bcf86cd799439011'),
        new ObjectId('507f1f77bcf86cd799439012'),
      ];

      jest
        .spyOn(tempRepository, 'delete')
        .mockResolvedValue({ raw: [], affected: 1 });

      await service.deleteMediaFromTempDB(idsToRemove);

      expect(tempRepository.delete).toHaveBeenCalledWith(idsToRemove);
    });
  });

  describe('deleteMediaFromDB', () => {
    it('should remove media from repository', async () => {
      const idsToRemove = [
        new ObjectId('507f1f77bcf86cd799439011'),
        new ObjectId('507f1f77bcf86cd799439012'),
      ];

      jest
        .spyOn(mediaRepository, 'delete')
        .mockResolvedValue({ raw: [], affected: 1 });

      await service.deleteMediaFromDB(idsToRemove);

      expect(mediaRepository.delete).toHaveBeenCalledWith(idsToRemove);
    });
  });

  describe('emptyTempDB', () => {
    it('should call tempRepository.delete with correct parameters', async () => {
      jest
        .spyOn(tempRepository, 'delete')
        .mockResolvedValue({ raw: [], affected: 1 });

      await service.emptyTempDB();

      expect(tempRepository.delete).toHaveBeenCalledWith({});
    });
  });

  describe('countFilesInDirectory', () => {
    it('should return the number of files in a given directory', async () => {
      jest.spyOn(mediaRepository, 'count').mockResolvedValueOnce(10);
      const count = await service.countFilesInDirectory('main/nestjs');
      expect(count).toEqual(10);
    });
  });

  describe('getFoldersPathsList', () => {
    const mockedReturnValue = ['/main/nestjs.jpg'];
    const mockedAggregationReturnValue = [
      {
        response: [{ filePathSet: mockedReturnValue }],
      },
    ];

    beforeEach(() => {
      jest
        .spyOn(aggregation, 'toArray')
        .mockResolvedValue(mockedAggregationReturnValue);
    });

    it('should return correct value', async () => {
      const result = await service['getFoldersPathsList']([]);

      expect(result).toEqual(mockedReturnValue);
    });

    it('should call aggregation with correct parameters', async () => {
      const conditions: MongoFilterCondition[] = [
        { filePath: { $regex: /.*\.jpg$/ } },
      ];

      const expectedResult = [
        {
          $match: {
            $and: conditions,
          },
        },
        {
          $facet: {
            response: [
              {
                $project: {
                  filePath: 1,
                },
              },
              {
                $group: {
                  _id: null,
                  filePathSet: {
                    $addToSet: '$filePath',
                  },
                },
              },
              {
                $unset: ['_id', 'items'],
              },
            ],
          },
        },
      ];
      jest.spyOn(service, 'makeAggregationQuery');

      await service['getFoldersPathsList'](conditions);

      expect(service.makeAggregationQuery).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('getDynamicFoldersRecursively', () => {
    const getMockedAggregationReturnValue = (
      mockedReturnValue: DBFilePath[],
    ) => [
      {
        response: [{ filePathSet: mockedReturnValue }],
      },
    ];

    it('should return correct dynamic folders', async () => {
      const conditions: MongoFilterCondition[] = [];
      const mockedReturnValue: DBFilePath[] = [
        '/main/subfolder/nestjs.jpg',
        '/main/test.mp4',
        '/main/subfolder/subfolder2/nestjs.jpg',
        '/main/subfolder/subfolder2/test.mp4',
        '/main2/nestjs.jpg',
        '/nestjs.jpg',
      ];
      jest
        .spyOn(aggregation, 'toArray')
        .mockResolvedValue(getMockedAggregationReturnValue(mockedReturnValue));

      const result = await service.getDynamicFoldersRecursively(conditions);

      expect(result).toEqual([
        'main',
        'main/subfolder',
        'main/subfolder/subfolder2',
        'main2',
      ]);
    });

    it('should return an empty array if there are no dynamic folders', async () => {
      const conditions: MongoFilterCondition[] = [];
      const mockedReturnValue: DBFilePath[] = [];
      jest
        .spyOn(aggregation, 'toArray')
        .mockResolvedValue(getMockedAggregationReturnValue(mockedReturnValue));

      const result = await service.getDynamicFoldersRecursively(conditions);

      expect(result).toEqual([]);
    });
  });

  describe('getUsedKeywordsList', () => {
    const mockedAggregationReturnValue = [
      {
        response: ['keyword1', 'keyword2', 'keyword3'],
      },
    ];

    beforeEach(() => {
      jest
        .spyOn(aggregation, 'toArray')
        .mockResolvedValue(mockedAggregationReturnValue);
    });

    it('should return correct list of used keywords', async () => {
      const result = await service.getUsedKeywordsList();
      expect(result).toEqual(['keyword1', 'keyword2', 'keyword3']);
    });
  });

  describe('getSearchPagination', () => {
    it('should return correct pagination', async () => {
      const defaultPagination = {
        currentPage: 34,
        resultsCount: 1234,
        totalPages: 123,
      };
      const nPerPage = 10;
      const pagination: [Omit<Pagination, 'nPerPage'>] = [defaultPagination];
      const result = service['getSearchPagination'](pagination, nPerPage);
      expect(result).toEqual({ ...defaultPagination, nPerPage });
    });

    it('should return default pagination if no pagination provided', async () => {
      const nPerPage = 10;
      const result = service['getSearchPagination']([], nPerPage);
      expect(result).toEqual({
        currentPage: 1,
        resultsCount: 0,
        totalPages: 1,
        nPerPage,
      });
    });
  });

  describe('getFiles', () => {
    const getFilesProps: GetFilesInputDto = {
      filters: { includeAllSearchTags: true, searchTags: ['01Cnt-Испания'] },
      sorting: {
        sort: {
          mimetype: -1,
          id: 1,
          originalDate: -1,
          filePath: -1,
        },
        randomSort: true,
      },
      folders: { showSubfolders: true, isDynamicFolders: false },
      pagination: { page: 1, perPage: 50 },
    };

    const mockFilesDBResponse: [GetFilesDBResponse] = [
      {
        response: [
          createMediaMock({ id: new ObjectId('507f1f77bcf86cd799439011') }),
        ],
        pagination: [
          {
            currentPage: 1,
            resultsCount: 0,
            totalPages: 1,
          },
        ],
        total: [{ filesSizeSum: 234 }],
      },
    ];

    it('should return correct files if isDynamicFolders === false', async () => {
      jest.spyOn(aggregation, 'toArray').mockResolvedValue(mockFilesDBResponse);

      const result = await service.getFiles(getFilesProps);

      expect(result).toMatchSnapshot();
      expect(service.getDynamicFoldersRecursively).not.toHaveBeenCalled();
    });

    it('should return correct files if isDynamicFolders === true', async () => {
      const mockedReturnValue: DBFilePath[] = [
        '/main/subfolder/nestjs.jpg',
        '/main/test.mp4',
        '/main/subfolder/subfolder2/nestjs.jpg',
        '/main/subfolder/subfolder2/test.mp4',
        '/main2/nestjs.jpg',
        '/nestjs.jpg',
      ];
      const mockedAggregationReturnValue = [
        {
          response: [{ filePathSet: mockedReturnValue }],
        },
      ];

      getFilesProps.folders.isDynamicFolders = true;

      jest
        .spyOn(aggregation, 'toArray')
        .mockResolvedValueOnce(mockedAggregationReturnValue);
      jest
        .spyOn(aggregation, 'toArray')
        .mockResolvedValueOnce(mockFilesDBResponse);

      const result = await service.getFiles(getFilesProps);

      expect(result).toMatchSnapshot();
      expect(service.getDynamicFoldersRecursively).toHaveBeenCalled();
    });

    it('should throw an error', async () => {
      const mockedError = 'Mocked error message';
      jest
        .spyOn(aggregation, 'toArray')
        .mockRejectedValue(new Error(mockedError));

      await expect(service.getFiles(getFilesProps)).rejects.toThrow(
        new InternalServerErrorException(mockedError),
      );
    });
  });

  describe('deleteMediaByDirectory', () => {
    const media1 = new Media();
    const media2 = new Media();
    media1._id = new ObjectId('507f1f77bcf86cd799439011');
    media2._id = new ObjectId('507f1f77bcf86cd799439012');
    media1.filePath = '/test-directory/file1.jpg';
    media2.filePath = '/test-directory/file2.jpg';

    it('should successfully delete media by directory', async () => {
      const sanitizedDirectory = 'test-directory';

      const mediaList = [media1, media2];

      jest
        .spyOn(service, 'findMediaByDirectoryInDB')
        .mockResolvedValue(mediaList);
      jest
        .spyOn(service, 'deleteMediaFromDB')
        .mockResolvedValue({ raw: [], affected: mediaList.length });

      const result = await service.deleteMediaByDirectory(sanitizedDirectory);

      expect(service.findMediaByDirectoryInDB).toHaveBeenCalledWith(
        sanitizedDirectory,
      );
      expect(service.deleteMediaFromDB).toHaveBeenCalledWith([
        new ObjectId('507f1f77bcf86cd799439011'),
        new ObjectId('507f1f77bcf86cd799439012'),
      ]);
      expect(result).toEqual(mediaList);
    });

    it('should return an empty array if no media is found in the directory', async () => {
      const sanitizedDirectory = 'empty-directory';
      const mediaList: Media[] = [];

      jest
        .spyOn(service, 'findMediaByDirectoryInDB')
        .mockResolvedValue(mediaList);
      jest
        .spyOn(service, 'deleteMediaFromDB')
        .mockResolvedValue({ raw: [], affected: 0 });

      const result = await service.deleteMediaByDirectory(sanitizedDirectory);

      expect(service.findMediaByDirectoryInDB).toHaveBeenCalledWith(
        sanitizedDirectory,
      );
      expect(service.deleteMediaFromDB).toHaveBeenCalledWith([]);
      expect(result).toEqual(mediaList);
    });

    it('should throw an error if deletion fails', async () => {
      const sanitizedDirectory = 'error-directory';
      const mediaList = [media1, media2];

      jest
        .spyOn(service, 'findMediaByDirectoryInDB')
        .mockResolvedValue(mediaList);
      jest
        .spyOn(service, 'deleteMediaFromDB')
        .mockRejectedValue(new Error('Deletion failed'));

      await expect(
        service.deleteMediaByDirectory(sanitizedDirectory),
      ).rejects.toThrow('Deletion failed');

      expect(service.findMediaByDirectoryInDB).toHaveBeenCalledWith(
        sanitizedDirectory,
      );
      expect(service.deleteMediaFromDB).toHaveBeenCalledWith([
        new ObjectId('507f1f77bcf86cd799439011'),
        new ObjectId('507f1f77bcf86cd799439012'),
      ]);
    });
  });

  describe('deleteMediaByIds', () => {
    const media1 = createMediaMock({
      id: new ObjectId('507f1f77bcf86cd799439011'),
    });
    const media2 = createMediaMock({
      id: new ObjectId('507f1f77bcf86cd799439012'),
    });

    beforeEach(() => {
      jest.spyOn(mediaRepository, 'find').mockResolvedValue([media1, media2]);
      jest
        .spyOn(mediaRepository, 'delete')
        .mockResolvedValue({ raw: [], affected: 1 });
    });

    it('should successfully delete media by ids', async () => {
      const mediaIds = [media1._id.toHexString(), media2._id.toHexString()];
      const result = await service.deleteMediaByIds(mediaIds);

      expect(result).toEqual([media1, media2]);
      expect(mediaRepository.find).toHaveBeenCalledWith({
        where: {
          _id: { $in: [media1._id, media2._id] },
        },
      });
      expect(mediaRepository.delete).toHaveBeenCalledWith([
        media1._id,
        media2._id,
      ]);
    });

    it('should throw an error if ids not exist', async () => {
      const mediaIds = [
        new ObjectId('507f1f77bcf86cd799439013').toHexString(),
        new ObjectId('507f1f77bcf86cd799439014').toHexString(),
      ];
      await expect(service.deleteMediaByIds(mediaIds)).rejects.toThrow(
        new NotFoundException(
          'Ids not found in database: 507f1f77bcf86cd799439013, 507f1f77bcf86cd799439014',
        ),
      );
      expect(mediaRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('makeAggregationQuery', () => {
    beforeEach(() => {
      jest
        .spyOn(aggregation, 'toArray')
        .mockResolvedValue(mockedAggregationReturnValue);
    });

    it('should correct response', async () => {
      const aggregationQuery = await service.makeAggregationQuery([]);

      expect(aggregationQuery).toEqual(mockedAggregationReturnValue[0]);
    });
  });

  describe('findEmptyPreviewsInDB', () => {
    it('should return media files for which preview or fullSizeJpg is empty', async () => {
      const mediaJPEG = createMediaMock({
        id: new ObjectId('66f7cb092b956392a532e556'),
        name: 'mediaJPEG.jpg',
      });
      const mediaMP4 = createMediaMock({
        id: new ObjectId('66f7cb092b956392a532e557'),
        name: 'mediaMP4.jpg',
      });
      const mediaHEIC = createMediaMock({
        id: new ObjectId('66f7cb092b956392a532e558'),
        name: 'mediaHEIC.jpg',
      });
      mediaJPEG.preview = '' as DBPreviewPath;
      mediaJPEG.fullSizeJpg = null;
      mediaMP4.preview = '' as DBPreviewPath;
      mediaMP4.mimetype = SupportedVideoMimeTypes.mp4;
      mediaMP4.fullSizeJpg = '/path/to/name-fullSize.jpg';
      mediaHEIC.preview = '/path/to/name-preview.jpg';
      mediaHEIC.mimetype = SupportedImageMimetypes.heic;
      mediaHEIC.fullSizeJpg = null;

      const requestToCheckPreviewsOnly: Media[] = [mediaJPEG, mediaMP4];
      const requestForHeicAndVideos: Media[] = [mediaMP4, mediaHEIC];
      jest
        .spyOn(mediaRepository, 'find')
        .mockResolvedValueOnce(requestToCheckPreviewsOnly)
        .mockResolvedValueOnce(requestForHeicAndVideos);

      const result = await service.findEmptyPreviewsInDB({});

      expect(result).toMatchSnapshot();
      expect(mediaRepository.find).toHaveBeenCalledTimes(2);
    });

    it('should return media files for which only preview is empty if mimeTypes does not contain heic or videos', async () => {
      const mediaJPEG = createMediaMock({
        id: new ObjectId('66f7cb092b956392a532e556'),
        name: 'mediaJPEG.jpg',
      });
      const mediaMP4 = createMediaMock({
        id: new ObjectId('66f7cb092b956392a532e557'),
        name: 'mediaMP4.jpg',
      });
      const mediaHEIC = createMediaMock({
        id: new ObjectId('66f7cb092b956392a532e558'),
        name: 'mediaHEIC.jpg',
      });
      mediaJPEG.preview = '' as DBPreviewPath;
      mediaJPEG.fullSizeJpg = null;
      mediaMP4.preview = '' as DBPreviewPath;
      mediaMP4.mimetype = SupportedVideoMimeTypes.mp4;
      mediaMP4.fullSizeJpg = '/path/to/name-fullSize.jpg';
      mediaHEIC.preview = '/path/to/name-preview.jpg';
      mediaHEIC.mimetype = SupportedImageMimetypes.heic;
      mediaHEIC.fullSizeJpg = null;

      const requestToCheckPreviewsOnly: Media[] = [mediaJPEG, mediaMP4];
      const requestForHeicAndVideos: Media[] = [mediaMP4, mediaHEIC];
      jest
        .spyOn(mediaRepository, 'find')
        .mockResolvedValueOnce(requestToCheckPreviewsOnly)
        .mockResolvedValueOnce(requestForHeicAndVideos);

      const result = await service.findEmptyPreviewsInDB({
        mimeTypes: [SupportedImageMimetypes.jpeg],
      });

      expect(result).toMatchSnapshot();
      expect(mediaRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findFilePathsForMediaInFolder', () => {
    it('should return file paths for media in the specified folder', async () => {
      const expectedDBQuery = {
        select: ['_id', 'filePath'],
        where: {
          $and: [
            {
              $expr: {
                $eq: [
                  {
                    $indexOfCP: ['$filePath', '//path/to/'],
                  },
                  0,
                ],
              },
            },
            {
              mimetype: {
                $in: ['image/jpeg'],
              },
            },
          ],
        },
      };
      const mockMediaFiles: Pick<Media, '_id' | 'filePath'>[] = [
        {
          _id: new ObjectId('507f1f77bcf86cd799439011'),
          filePath: '/path/to/file1.jpg',
        },
        {
          _id: new ObjectId('507f1f77bcf86cd799439012'),
          filePath: '/path/to/file2.jpg',
        },
      ];
      jest
        .spyOn(mediaRepository, 'find')
        .mockResolvedValue(mockMediaFiles as Media[]);

      const result = await service.findFilePathsForMediaInFolder({
        mimeTypes: [SupportedImageMimetypes.jpeg],
        folderPath: '/path/to',
      });

      expect(result).toEqual(mockMediaFiles);
      expect(mediaRepository.find).toHaveBeenCalledWith(expectedDBQuery);
    });
  });

  describe('getFilesDescriptions', () => {
    it('should return empty results when no descriptions match', async () => {
      const mockResult = undefined;
      jest.spyOn(service, 'makeAggregationQuery').mockResolvedValue(mockResult);

      const result = await service.getFilesDescriptions({
        descriptionPart: 'nonexistent',
        page: 1,
        perPage: 10,
      });

      expect(result).toEqual({
        descriptions: [],
        totalCount: 0,
      });
    });

    it('should return matching descriptions and total count', async () => {
      const mockResult = {
        descriptions: [
          { description: 'Test description 1' },
          { description: 'Test description 2' },
        ],
        totalCount: [{ count: 2 }],
      };
      jest.spyOn(service, 'makeAggregationQuery').mockResolvedValue(mockResult);

      const result = await service.getFilesDescriptions({
        descriptionPart: 'test',
        page: 1,
        perPage: 10,
      });

      expect(result).toEqual({
        descriptions: ['Test description 1', 'Test description 2'],
        totalCount: 2,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockResult = {
        descriptions: [
          { description: 'Test description 1' },
          { description: 'Test description 2' },
        ],
        totalCount: [{ count: 5 }],
      };
      jest.spyOn(service, 'makeAggregationQuery').mockResolvedValue(mockResult);

      const result = await service.getFilesDescriptions({
        descriptionPart: 'test',
        page: 1,
        perPage: 2,
      });

      expect(result).toEqual({
        descriptions: ['Test description 1', 'Test description 2'],
        totalCount: 5,
      });
    });

    it('should throw InternalServerErrorException when aggregation fails', async () => {
      const error = new Error('Aggregation failed');
      jest.spyOn(service, 'makeAggregationQuery').mockRejectedValue(error);

      await expect(
        service.getFilesDescriptions({
          descriptionPart: 'test',
          page: 1,
          perPage: 10,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
