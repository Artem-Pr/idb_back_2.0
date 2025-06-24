import { Test, TestingModule } from '@nestjs/testing';
import { SyncExifKeysHandler } from './sync-exif-keys.handler';
import { IExifKeysRepository } from '../repositories/exif-keys.repository';
import { MediaDBService } from '../../files/mediaDB.service';
import { ExifKeysFactory } from '../factories/exif-keys.factory';
import { ExifDataExtractor } from '../services/exif-data-extractor.service';
import { ExifKeysValidationService } from '../services/exif-keys-validation.service';
import { CustomLogger } from 'src/logger/logger.service';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import { Media } from '../../files/entities/media.entity';
import { success, failure } from '../types/result.type';
import { ObjectId } from 'mongodb';

describe('SyncExifKeysHandler', () => {
  let handler: SyncExifKeysHandler;
  let mockRepository: jest.Mocked<IExifKeysRepository>;
  let mockMediaDbService: jest.Mocked<MediaDBService>;
  let mockFactory: jest.Mocked<ExifKeysFactory>;
  let mockExtractor: jest.Mocked<ExifDataExtractor>;
  let mockValidation: jest.Mocked<ExifKeysValidationService>;
  let mockLogger: jest.Mocked<CustomLogger>;

  const mockMediaBatch: Pick<Media, '_id' | 'exif'>[] = [
    {
      _id: new ObjectId(),
      exif: {
        Make: 'Canon',
        Model: 'EOS 60D',
        ISO: 100,
      },
    },
    {
      _id: new ObjectId(),
      exif: {
        Make: 'Nikon',
        Model: 'D850',
        ISO: 200,
      },
    },
  ];

  const mockExifKeys: ExifKeys[] = [
    {
      _id: new ObjectId(),
      name: 'Make',
      type: ExifValueType.STRING,
    },
    {
      _id: new ObjectId(),
      name: 'Model',
      type: ExifValueType.STRING,
    },
    {
      _id: new ObjectId(),
      name: 'ISO',
      type: ExifValueType.NUMBER,
    },
  ];

  beforeEach(async () => {
    const mockRepositoryMethods = {
      findAll: jest.fn(),
      findByType: jest.fn(),
      findExistingKeyNames: jest.fn(),
      saveKeys: jest.fn(),
      findByNames: jest.fn(),
      clearAll: jest.fn(),
    };

    const mockMediaDbServiceMethods = {
      countAllMedia: jest.fn(),
      findMediaExifBatch: jest.fn(),
    };

    const mockFactoryMethods = {
      createExifKeysFromMap: jest.fn(),
      createExifKey: jest.fn(),
    };

    const mockExtractorMethods = {
      extractExifKeysFromMediaList: jest.fn(),
      extractExifKeysFromExifBatch: jest.fn(),
      hasValidExifData: jest.fn(),
      processExifData: jest.fn(),
    };

    const mockValidationMethods = {
      validateProcessCommand: jest.fn(),
      validateSyncCommand: jest.fn(),
      isValidMediaList: jest.fn(),
      isValidMediaForProcessing: jest.fn(),
      validateBatchParameters: jest.fn(),
      validateProcessingConfig: jest.fn(),
    };

    const mockLoggerMethods = {
      log: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncExifKeysHandler,
        {
          provide: 'IExifKeysRepository',
          useValue: mockRepositoryMethods,
        },
        {
          provide: MediaDBService,
          useValue: mockMediaDbServiceMethods,
        },
        {
          provide: ExifKeysFactory,
          useValue: mockFactoryMethods,
        },
        {
          provide: ExifDataExtractor,
          useValue: mockExtractorMethods,
        },
        {
          provide: ExifKeysValidationService,
          useValue: mockValidationMethods,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerMethods,
        },
      ],
    }).compile();

    handler = module.get<SyncExifKeysHandler>(SyncExifKeysHandler);
    mockRepository = module.get('IExifKeysRepository');
    mockMediaDbService = module.get(MediaDBService);
    mockFactory = module.get(ExifKeysFactory);
    mockExtractor = module.get(ExifDataExtractor);
    mockValidation = module.get(ExifKeysValidationService);
    mockLogger = module.get(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should successfully sync EXIF keys from all media', async () => {
      // Arrange
      const command = { batchSize: 2 };
      const totalCount = 2;
      const exifKeysMap = new Map([
        ['Make', ExifValueType.STRING],
        ['Model', ExifValueType.STRING],
        ['ISO', ExifValueType.NUMBER],
      ]);

      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(success(0));
      mockMediaDbService.countAllMedia.mockResolvedValue(totalCount);
      mockValidation.validateBatchParameters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMediaDbService.findMediaExifBatch.mockResolvedValue(mockMediaBatch);
      mockExtractor.hasValidExifData.mockReturnValue(true);
      mockExtractor.extractExifKeysFromExifBatch.mockReturnValue(exifKeysMap);
      mockFactory.createExifKeysFromMap.mockReturnValue(mockExifKeys);
      mockRepository.saveKeys.mockResolvedValue(success(mockExifKeys));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.totalMediaProcessed).toBe(2);
      expect(result.totalExifKeysDiscovered).toBe(3);
      expect(result.newExifKeysSaved).toBe(3);
      expect(result.mediaWithoutExif).toBe(0);
      expect(result.batchesProcessed).toBe(1);
      expect(result.collectionCleared).toBe(true);
      expect(mockRepository.clearAll).toHaveBeenCalled();
      expect(mockMediaDbService.countAllMedia).toHaveBeenCalled();
      expect(mockRepository.saveKeys).toHaveBeenCalledWith(mockExifKeys);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const command = { batchSize: -1 };
      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: false,
        errors: ['BatchSize must be a positive integer'],
      });

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Failed to sync exif keys: Validation failed',
      );
      expect(mockLogger.logError).toHaveBeenCalledWith({
        message: expect.stringContaining('Validation failed'),
        method: 'SyncExifKeysHandler.handle',
      });
    });

    it('should handle empty media collection', async () => {
      // Arrange
      const command = {};
      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(success(0));
      mockMediaDbService.countAllMedia.mockResolvedValue(0);

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.totalMediaProcessed).toBe(0);
      expect(result.totalExifKeysDiscovered).toBe(0);
      expect(result.newExifKeysSaved).toBe(0);
      expect(result.mediaWithoutExif).toBe(0);
      expect(result.batchesProcessed).toBe(0);
      expect(result.collectionCleared).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Found 0 media entities to process',
      );
    });

    it('should handle media without valid EXIF data', async () => {
      // Arrange
      const command = { batchSize: 2 };
      const totalCount = 2;

      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(success(0));
      mockMediaDbService.countAllMedia.mockResolvedValue(totalCount);
      mockValidation.validateBatchParameters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMediaDbService.findMediaExifBatch.mockResolvedValue(mockMediaBatch);
      mockExtractor.hasValidExifData.mockReturnValue(false);
      mockExtractor.extractExifKeysFromExifBatch.mockReturnValue(new Map());

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.totalMediaProcessed).toBe(2);
      expect(result.totalExifKeysDiscovered).toBe(0);
      expect(result.newExifKeysSaved).toBe(0);
      expect(result.mediaWithoutExif).toBe(2);
      expect(result.batchesProcessed).toBe(1);
    });

    it('should handle multiple batches', async () => {
      // Arrange
      const command = { batchSize: 1 };
      const totalCount = 2;
      const exifKeysMap = new Map([['Make', ExifValueType.STRING]]);

      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(success(0));
      mockMediaDbService.countAllMedia.mockResolvedValue(totalCount);
      mockValidation.validateBatchParameters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMediaDbService.findMediaExifBatch
        .mockResolvedValueOnce([mockMediaBatch[0]])
        .mockResolvedValueOnce([mockMediaBatch[1]]);
      mockExtractor.hasValidExifData.mockReturnValue(true);
      mockExtractor.extractExifKeysFromExifBatch.mockReturnValue(exifKeysMap);
      mockFactory.createExifKeysFromMap.mockReturnValue([mockExifKeys[0]]);
      mockRepository.saveKeys.mockResolvedValue(success([mockExifKeys[0]]));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.totalMediaProcessed).toBe(2);
      expect(result.batchesProcessed).toBe(2);
      expect(mockMediaDbService.findMediaExifBatch).toHaveBeenCalledTimes(2);
      expect(mockMediaDbService.findMediaExifBatch).toHaveBeenNthCalledWith(
        1,
        1,
        0,
      );
      expect(mockMediaDbService.findMediaExifBatch).toHaveBeenNthCalledWith(
        2,
        1,
        1,
      );
    });

    it('should handle clear repository error', async () => {
      // Arrange
      const command = {};
      const clearError = new Error('Clear operation failed');

      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(failure(clearError));

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Failed to sync exif keys: Failed to clear exif keys',
      );
    });

    it('should handle batch validation errors', async () => {
      // Arrange
      const command = { batchSize: 2 };
      const totalCount = 2;

      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(success(0));
      mockMediaDbService.countAllMedia.mockResolvedValue(totalCount);
      mockValidation.validateBatchParameters.mockReturnValue({
        isValid: false,
        errors: ['Invalid batch parameters'],
      });

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Failed to sync exif keys: Invalid batch parameters',
      );
    });

    it('should handle save keys error', async () => {
      // Arrange
      const command = { batchSize: 2 };
      const totalCount = 2;
      const exifKeysMap = new Map([['Make', ExifValueType.STRING]]);
      const saveError = new Error('Save operation failed');

      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(success(0));
      mockMediaDbService.countAllMedia.mockResolvedValue(totalCount);
      mockValidation.validateBatchParameters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMediaDbService.findMediaExifBatch.mockResolvedValue(mockMediaBatch);
      mockExtractor.hasValidExifData.mockReturnValue(true);
      mockExtractor.extractExifKeysFromExifBatch.mockReturnValue(exifKeysMap);
      mockFactory.createExifKeysFromMap.mockReturnValue([mockExifKeys[0]]);
      mockRepository.saveKeys.mockResolvedValue(failure(saveError));

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Failed to sync exif keys: Failed to save exif keys',
      );
    });

    it('should use default batch size when not provided', async () => {
      // Arrange
      const command = {};
      const totalCount = 2;
      const exifKeysMap = new Map([['Make', ExifValueType.STRING]]);

      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(success(0));
      mockMediaDbService.countAllMedia.mockResolvedValue(totalCount);
      mockValidation.validateBatchParameters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMediaDbService.findMediaExifBatch.mockResolvedValue(mockMediaBatch);
      mockExtractor.hasValidExifData.mockReturnValue(true);
      mockExtractor.extractExifKeysFromExifBatch.mockReturnValue(exifKeysMap);
      mockFactory.createExifKeysFromMap.mockReturnValue([mockExifKeys[0]]);
      mockRepository.saveKeys.mockResolvedValue(success([mockExifKeys[0]]));

      // Act
      await handler.handle(command);

      // Assert
      expect(mockMediaDbService.findMediaExifBatch).toHaveBeenCalledWith(
        500, // Default batch size
        0,
      );
    });

    it('should log batch progress', async () => {
      // Arrange
      const command = { batchSize: 2 };
      const totalCount = 2;
      const exifKeysMap = new Map([['Make', ExifValueType.STRING]]);

      mockValidation.validateSyncCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockRepository.clearAll.mockResolvedValue(success(0));
      mockMediaDbService.countAllMedia.mockResolvedValue(totalCount);
      mockValidation.validateBatchParameters.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMediaDbService.findMediaExifBatch.mockResolvedValue(mockMediaBatch);
      mockExtractor.hasValidExifData.mockReturnValue(true);
      mockExtractor.extractExifKeysFromExifBatch.mockReturnValue(exifKeysMap);
      mockFactory.createExifKeysFromMap.mockReturnValue([mockExifKeys[0]]);
      mockRepository.saveKeys.mockResolvedValue(success([mockExifKeys[0]]));

      // Act
      await handler.handle(command);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing batch 1'),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Sync completed'),
      );
    });
  });
});
