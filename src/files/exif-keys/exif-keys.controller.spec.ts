import { Test, TestingModule } from '@nestjs/testing';
import { ExifKeysController } from './exif-keys.controller';
import { SyncExifKeysHandler } from './handlers/sync-exif-keys.handler';
import { ExifKeysQueryService } from './services/exif-keys-query.service';
import { ExifKeys, ExifValueType } from './entities/exif-keys.entity';
import { SyncExifKeysOutputDto } from './dto/sync-exif-keys-output.dto';
import { ObjectId } from 'mongodb';

describe('ExifKeysController', () => {
  let controller: ExifKeysController;
  let syncHandler: SyncExifKeysHandler;
  let queryService: ExifKeysQueryService;

  const mockExifKeys: ExifKeys[] = [
    {
      _id: new ObjectId(),
      name: 'Make',
      type: ExifValueType.STRING,
    },
    {
      _id: new ObjectId(),
      name: 'DateTimeOriginal',
      type: ExifValueType.STRING,
    },
    {
      _id: new ObjectId(),
      name: 'ISO',
      type: ExifValueType.NUMBER,
    },
  ];

  const mockSyncResult = {
    totalMediaProcessed: 100,
    totalExifKeysDiscovered: 25,
    newExifKeysSaved: 5,
    mediaWithoutExif: 2,
    processingTimeMs: 1500,
    batchesProcessed: 2,
    collectionCleared: true,
  };

  const mockSyncExifKeysHandler = {
    handle: jest.fn().mockResolvedValue(mockSyncResult),
  };

  const mockExifKeysQueryService = {
    getAllExifKeys: jest.fn().mockResolvedValue(mockExifKeys),
    getExifKeysPaginated: jest.fn().mockResolvedValue({
      exifKeys: [],
      page: 1,
      perPage: 50,
      resultsCount: 10,
      totalPages: 1,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExifKeysController],
      providers: [
        {
          provide: SyncExifKeysHandler,
          useValue: mockSyncExifKeysHandler,
        },
        {
          provide: ExifKeysQueryService,
          useValue: mockExifKeysQueryService,
        },
      ],
    }).compile();

    controller = module.get<ExifKeysController>(ExifKeysController);
    syncHandler = module.get<SyncExifKeysHandler>(SyncExifKeysHandler);
    queryService = module.get<ExifKeysQueryService>(ExifKeysQueryService);

    // Reset mock calls between tests
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllExifKeys', () => {
    it('should return an array of exif keys', async () => {
      const result = await controller.getAllExifKeys();

      expect(result).toEqual(mockExifKeys);
      expect(queryService.getAllExifKeys).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no exif keys exist', async () => {
      mockExifKeysQueryService.getAllExifKeys.mockResolvedValueOnce([]);

      const result = await controller.getAllExifKeys();

      expect(result).toEqual([]);
      expect(queryService.getAllExifKeys).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncExifKeys', () => {
    it('should return sync result with metrics', async () => {
      const result = await controller.syncExifKeys();

      const expectedResult: SyncExifKeysOutputDto = {
        totalMediaProcessed: 100,
        totalExifKeysDiscovered: 25,
        newExifKeysSaved: 5,
        mediaWithoutExif: 2,
        processingTimeMs: 1500,
        batchesProcessed: 2,
        collectionCleared: true,
      };

      expect(result).toEqual(expectedResult);
      expect(syncHandler.handle).toHaveBeenCalledTimes(1);
      expect(syncHandler.handle).toHaveBeenCalledWith({
        batchSize: 500,
      });
    });

    it('should handle sync errors gracefully', async () => {
      const error = new Error('Sync failed');
      mockSyncExifKeysHandler.handle.mockRejectedValueOnce(error);

      await expect(controller.syncExifKeys()).rejects.toThrow('Sync failed');
      expect(syncHandler.handle).toHaveBeenCalledTimes(1);
    });
  });

  describe('getExifKeys', () => {
    it('should return paginated EXIF keys with default parameters', async () => {
      const mockExifKeys = [
        { _id: 'id1' as any, name: 'Aperture', type: ExifValueType.NUMBER },
        { _id: 'id2' as any, name: 'Camera', type: ExifValueType.STRING },
      ];

      const mockResponse = {
        exifKeys: mockExifKeys,
        page: 1,
        perPage: 50,
        resultsCount: 10,
        totalPages: 1,
      };

      jest
        .spyOn(queryService, 'getExifKeysPaginated')
        .mockResolvedValue(mockResponse);

      const result = await controller.getExifKeys({});

      expect(queryService.getExifKeysPaginated).toHaveBeenCalledWith({});
      expect(result).toBe(mockResponse);
    });

    it('should return paginated EXIF keys with custom parameters', async () => {
      const query = {
        page: 2,
        perPage: 10,
        type: ExifValueType.STRING,
      };

      const mockResponse = {
        exifKeys: [],
        page: 2,
        perPage: 10,
        resultsCount: 3,
        totalPages: 1,
      };

      jest
        .spyOn(queryService, 'getExifKeysPaginated')
        .mockResolvedValue(mockResponse);

      const result = await controller.getExifKeys(query);

      expect(queryService.getExifKeysPaginated).toHaveBeenCalledWith(query);
      expect(result).toBe(mockResponse);
    });

    it('should handle errors from query service', async () => {
      const error = new Error('Database error');
      jest.spyOn(queryService, 'getExifKeysPaginated').mockRejectedValue(error);

      await expect(controller.getExifKeys({})).rejects.toThrow(
        'Database error',
      );
    });
  });
});
