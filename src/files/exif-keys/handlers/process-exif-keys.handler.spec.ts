import { Test, TestingModule } from '@nestjs/testing';
import { ProcessExifKeysHandler } from './process-exif-keys.handler';
import { IExifKeysRepository } from '../repositories/exif-keys.repository';
import { ExifKeysFactory } from '../factories/exif-keys.factory';
import { CustomLogger } from 'src/logger/logger.service';
import { ExifDataExtractor } from '../services/exif-data-extractor.service';
import { ExifKeysValidationService } from '../services/exif-keys-validation.service';
import { ExifKeysMetricsService } from '../services/exif-keys-metrics.service';
import { ExifKeysEventEmitterService } from '../services/exif-keys-event-emitter.service';
import { ProcessExifKeysConfig } from '../config/exif-processing.config';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import { Media } from '../../entities/media.entity';
import { success, failure } from '../types/result.type';
import { ObjectId } from 'mongodb';

describe('ProcessExifKeysHandler', () => {
  let handler: ProcessExifKeysHandler;
  let mockRepository: jest.Mocked<IExifKeysRepository>;
  let mockFactory: jest.Mocked<ExifKeysFactory>;
  let mockExtractor: jest.Mocked<ExifDataExtractor>;
  let mockValidation: jest.Mocked<ExifKeysValidationService>;
  let mockMetrics: jest.Mocked<ExifKeysMetricsService>;
  let mockEventEmitter: jest.Mocked<ExifKeysEventEmitterService>;
  let mockConfig: ProcessExifKeysConfig;

  // Create properly typed mock media
  const createMockMedia = (overrides: Partial<Media> = {}): Media => ({
    _id: new ObjectId(),
    originalName: 'test.jpg',
    filePath: '/test.jpg',
    mimetype: 'image/jpeg' as any,
    size: 1024,
    megapixels: 12,
    imageSize: { width: 1920, height: 1080 } as any,

    keywords: null,
    changeDate: null,
    originalDate: new Date('2023-01-01'),
    preview: '/preview.jpg' as any,
    fullSizeJpg: '/full.jpg' as any,
    rating: null,
    description: null,
    timeStamp: '2023-01-01',
    exif: {
      Make: 'Canon',
      Model: 'EOS 60D',
      ISO: 100,
    },
    ...overrides,
  });

  const mockMediaList: Media[] = [
    createMockMedia({
      originalName: 'test1.jpg',
      filePath: '/test1.jpg',
      exif: {
        Make: 'Canon',
        Model: 'EOS 60D',
        ISO: 100,
      },
    }),
    createMockMedia({
      originalName: 'test2.jpg',
      filePath: '/test2.jpg',
      exif: {
        Make: 'Nikon',
        Model: 'D850',
        ISO: 200,
      },
    }),
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

    const mockFactoryMethods = {
      createExifKeysFromMap: jest.fn(),
      createExifKey: jest.fn(),
    };

    const mockLoggerMethods = {
      log: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
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

    const mockMetricsMethods = {
      startOperation: jest.fn(),
      updateOperation: jest.fn(),
      completeOperation: jest.fn(),
      getOperationMetrics: jest.fn(),
      getActiveOperations: jest.fn(),
      getCompletedOperations: jest.fn(),
      getPerformanceSummary: jest.fn(),
      resetMetrics: jest.fn(),
    };

    const mockEventEmitterMethods = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      getEventNames: jest.fn(),
      getListenerCount: jest.fn(),
    };

    mockConfig = {
      enableLogging: true,
      enableValidation: true,
      duplicateHandling: 'skip',
      maxMediaListSize: 1000,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessExifKeysHandler,
        {
          provide: 'IExifKeysRepository',
          useValue: mockRepositoryMethods,
        },
        {
          provide: ExifKeysFactory,
          useValue: mockFactoryMethods,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerMethods,
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
          provide: ExifKeysMetricsService,
          useValue: mockMetricsMethods,
        },
        {
          provide: ExifKeysEventEmitterService,
          useValue: mockEventEmitterMethods,
        },
        {
          provide: 'PROCESS_EXIF_KEYS_CONFIG',
          useValue: mockConfig,
        },
      ],
    }).compile();

    handler = module.get<ProcessExifKeysHandler>(ProcessExifKeysHandler);
    mockRepository = module.get('IExifKeysRepository');
    mockFactory = module.get(ExifKeysFactory);
    module.get(CustomLogger); // Logger is required but not used in tests
    mockExtractor = module.get(ExifDataExtractor);
    mockValidation = module.get(ExifKeysValidationService);
    mockMetrics = module.get(ExifKeysMetricsService);
    mockEventEmitter = module.get(ExifKeysEventEmitterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should successfully process and save EXIF keys', async () => {
      // Arrange
      const command = { mediaList: mockMediaList };
      const exifKeysMap = new Map([
        ['Make', ExifValueType.STRING],
        ['Model', ExifValueType.STRING],
        ['ISO', ExifValueType.NUMBER],
      ]);

      mockValidation.validateProcessCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockExtractor.extractExifKeysFromMediaList.mockReturnValue(exifKeysMap);
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(new Set<string>()),
      );
      mockFactory.createExifKeysFromMap.mockReturnValue(mockExifKeys);
      mockRepository.saveKeys.mockResolvedValue(success(mockExifKeys));
      mockMetrics.completeOperation.mockReturnValue({
        operationName: 'ProcessExifKeys',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 100,
        itemsProcessed: 2,
        itemsSkipped: 0,
        itemsErrored: 0,
        databaseOperations: 2,
        batchesProcessed: 0,
      });

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processedCount).toBe(3);
      }
      expect(mockValidation.validateProcessCommand).toHaveBeenCalledWith(
        command,
      );
      expect(mockExtractor.extractExifKeysFromMediaList).toHaveBeenCalledWith(
        mockMediaList,
      );
      expect(mockRepository.findExistingKeyNames).toHaveBeenCalled();
      expect(mockRepository.saveKeys).toHaveBeenCalledWith(mockExifKeys);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'exif.processing.started',
        expect.any(Object),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'exif.processing.completed',
        expect.any(Object),
      );
    });

    it('should handle validation errors', async () => {
      // Arrange
      const command = { mediaList: [] };
      mockValidation.validateProcessCommand.mockReturnValue({
        isValid: false,
        errors: ['MediaList must be a non-empty array'],
      });

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Validation failed');
      }
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'exif.processing.error',
        expect.any(Object),
      );
    });

    it('should handle case when no EXIF keys are found', async () => {
      // Arrange
      const command = { mediaList: mockMediaList };
      mockValidation.validateProcessCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockExtractor.extractExifKeysFromMediaList.mockReturnValue(new Map());

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processedCount).toBe(0);
      }
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'exif.processing.completed',
        expect.any(Object),
      );
    });

    it('should handle case when no new keys to save', async () => {
      // Arrange
      const command = { mediaList: mockMediaList };
      const exifKeysMap = new Map([
        ['Make', ExifValueType.STRING],
        ['Model', ExifValueType.STRING],
      ]);
      const existingKeys = new Set(['Make', 'Model']);

      mockValidation.validateProcessCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockExtractor.extractExifKeysFromMediaList.mockReturnValue(exifKeysMap);
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(existingKeys),
      );
      // Mock factory to return empty array when called with empty map (all keys filtered out)
      mockFactory.createExifKeysFromMap.mockReturnValue([]);

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processedCount).toBe(0);
      }
      expect(mockRepository.saveKeys).not.toHaveBeenCalled();
    });

    it('should handle repository errors when finding existing keys', async () => {
      // Arrange
      const command = { mediaList: mockMediaList };
      const exifKeysMap = new Map([['Make', ExifValueType.STRING]]);
      const repositoryError = new Error('Database connection failed');

      mockValidation.validateProcessCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockExtractor.extractExifKeysFromMediaList.mockReturnValue(exifKeysMap);
      mockRepository.findExistingKeyNames.mockResolvedValue(
        failure(repositoryError),
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(repositoryError);
      }
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'exif.processing.error',
        expect.any(Object),
      );
    });

    it('should handle repository errors when saving keys', async () => {
      // Arrange
      const command = { mediaList: mockMediaList };
      const exifKeysMap = new Map([['NewKey', ExifValueType.STRING]]);
      const repositoryError = new Error('Save operation failed');

      mockValidation.validateProcessCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockExtractor.extractExifKeysFromMediaList.mockReturnValue(exifKeysMap);
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(new Set<string>()),
      );
      mockFactory.createExifKeysFromMap.mockReturnValue([mockExifKeys[0]]);
      mockRepository.saveKeys.mockResolvedValue(failure(repositoryError));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(repositoryError);
      }
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'exif.processing.error',
        expect.any(Object),
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const command = { mediaList: mockMediaList };
      mockValidation.validateProcessCommand.mockImplementation(() => {
        throw new Error('Unexpected validation error');
      });

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Unexpected validation error');
      }
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'exif.processing.error',
        expect.any(Object),
      );
    });

    it('should track metrics during processing', async () => {
      // Arrange
      const command = { mediaList: mockMediaList };
      const exifKeysMap = new Map([['Make', ExifValueType.STRING]]);

      mockValidation.validateProcessCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockExtractor.extractExifKeysFromMediaList.mockReturnValue(exifKeysMap);
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(new Set<string>()),
      );
      mockFactory.createExifKeysFromMap.mockReturnValue([mockExifKeys[0]]);
      mockRepository.saveKeys.mockResolvedValue(success([mockExifKeys[0]]));

      // Act
      await handler.handle(command);

      // Assert
      expect(mockMetrics.startOperation).toHaveBeenCalledWith(
        'ProcessExifKeys',
        expect.any(String),
      );
      expect(mockMetrics.updateOperation).toHaveBeenCalledWith(
        expect.any(String),
        { itemsProcessed: 2 },
      );
      expect(mockMetrics.completeOperation).toHaveBeenCalled();
    });

    it('should emit keys saved event', async () => {
      // Arrange
      const command = { mediaList: mockMediaList };
      const exifKeysMap = new Map([['Make', ExifValueType.STRING]]);

      mockValidation.validateProcessCommand.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockExtractor.extractExifKeysFromMediaList.mockReturnValue(exifKeysMap);
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(new Set<string>()),
      );
      mockFactory.createExifKeysFromMap.mockReturnValue([mockExifKeys[0]]);
      mockRepository.saveKeys.mockResolvedValue(success([mockExifKeys[0]]));

      // Act
      await handler.handle(command);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'exif.keys.saved',
        expect.any(Object),
      );
    });
  });
});
