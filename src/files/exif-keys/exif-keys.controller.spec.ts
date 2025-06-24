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
});
