// Mock the LogMethod decorator before imports
jest.mock('src/logger/logger.decorator', () => {
  return {
    LogMethod:
      () =>
      (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) =>
        descriptor,
  };
});

// Mock the CustomLogger constructor before imports
jest.mock('src/logger/logger.service', () => {
  const mockLogger = {
    log: jest.fn(),
    logError: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
    startProcess: jest.fn().mockReturnValue({ id: 'test-process' }),
    finishProcess: jest.fn(),
    errorProcess: jest.fn(),
    logEndpointStart: jest.fn(),
    logEndpointFinish: jest.fn(),
    logEndpointError: jest.fn(),
  };

  return {
    CustomLogger: jest.fn().mockImplementation(() => mockLogger),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { ExifKeysService } from './exif-keys.service';
import { IExifKeysRepository } from './repositories/exif-keys.repository';
import { ExifTypeDeterminationStrategy } from './strategies/exif-type-determination.strategy';
import { ExifKeysFactory } from './factories/exif-keys.factory';
import { CustomLogger } from 'src/logger/logger.service';
import { ExifKeys, ExifValueType } from './entities/exif-keys.entity';
import { Media } from '../entities/media.entity';
import { SupportedImageMimetypes } from 'src/common/constants';
import { success, failure } from './types/result.type';
import { MediaDBService } from '../mediaDB.service';

describe('ExifKeysService', () => {
  let service: ExifKeysService;
  let mockRepository: jest.Mocked<IExifKeysRepository>;
  let mockStrategy: ExifTypeDeterminationStrategy;
  let mockFactory: ExifKeysFactory;
  let mockLogger: CustomLogger;

  const mockExifKey: ExifKeys = {
    _id: 'test-id' as any,
    name: 'testKey',
    type: ExifValueType.STRING,
  };

  const createMockMedia = (...args: any[]): Media => {
    let exifValue;
    if (args.length === 0) {
      // No parameter provided, use default EXIF data
      exifValue = {
        Make: 'Canon',
        Model: 'EOS 5D',
        DateTimeOriginal: '2023:01:01 12:00:00',
        GPS: { lat: 40.7128, lng: -74.006 },
      };
    } else {
      // Explicit value provided (including null, undefined, 'invalid', or custom objects)
      exifValue = args[0];
    }

    return {
      _id: 'media-id' as any,
      originalName: 'test.jpg',
      filePath: '/test.jpg',
      mimetype: SupportedImageMimetypes.jpeg,
      size: 1024,
      megapixels: 12,
      imageSize: '1920x1080',
      keywords: [],
      changeDate: Date.now(),
      originalDate: new Date(),
      description: 'test',
      rating: 5,
      preview: '/test-preview.jpg' as any,
      fullSizeJpg: '/test-fullSize.jpg' as any,
      timeStamp: '00:00:01',
      exif: exifValue,
    };
  };

  beforeEach(async () => {
    const mockRepositoryProvider = {
      findAll: jest.fn(),
      findByType: jest.fn(),
      findExistingKeyNames: jest.fn(),
      saveKeys: jest.fn(),
      findByNames: jest.fn(),
    };

    const mockStrategyProvider = {
      determineType: jest.fn(),
    };

    const mockFactoryProvider = {
      createExifKey: jest.fn(),
      createExifKeysFromMap: jest.fn(),
    };

    const mockLoggerProvider = {
      log: jest.fn(),
      logError: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      startProcess: jest.fn().mockReturnValue({ id: 'test-process' }),
      finishProcess: jest.fn(),
      errorProcess: jest.fn(),
      logEndpointStart: jest.fn(),
      logEndpointFinish: jest.fn(),
      logEndpointError: jest.fn(),
    };

    const mockMediaDBServiceProvider = {
      countAllMedia: jest.fn(),
      findMediaExifBatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExifKeysService,
        {
          provide: 'IExifKeysRepository',
          useValue: mockRepositoryProvider,
        },
        {
          provide: ExifTypeDeterminationStrategy,
          useValue: mockStrategyProvider,
        },
        {
          provide: ExifKeysFactory,
          useValue: mockFactoryProvider,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerProvider,
        },
        {
          provide: 'EXIF_KEY_PROCESSING_CONFIG',
          useValue: {
            batchSize: 100,
            enableLogging: true,
          },
        },
        {
          provide: MediaDBService,
          useValue: mockMediaDBServiceProvider,
        },
      ],
    }).compile();

    service = module.get<ExifKeysService>(ExifKeysService);
    mockRepository = module.get('IExifKeysRepository');
    mockStrategy = module.get<ExifTypeDeterminationStrategy>(
      ExifTypeDeterminationStrategy,
    );
    mockFactory = module.get<ExifKeysFactory>(ExifKeysFactory);
    mockLogger = module.get<CustomLogger>(CustomLogger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getAllExifKeys', () => {
    it('should return all EXIF keys from repository', async () => {
      const expectedKeys = [mockExifKey];
      mockRepository.findAll.mockResolvedValue(expectedKeys);

      const result = await service.getAllExifKeys();

      expect(mockRepository.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(expectedKeys);
    });
  });

  describe('getExifKeysByType', () => {
    it('should return EXIF keys filtered by type', async () => {
      const expectedKeys = [mockExifKey];
      mockRepository.findByType.mockResolvedValue(expectedKeys);

      const result = await service.getExifKeysByType(ExifValueType.STRING);

      expect(mockRepository.findByType).toHaveBeenCalledWith(
        ExifValueType.STRING,
      );
      expect(result).toEqual(expectedKeys);
    });
  });

  describe('processAndSaveExifKeys', () => {
    it('should return success(0) for empty media list', async () => {
      const result = await service.processAndSaveExifKeys([]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it('should return success(0) for media list with no EXIF data', async () => {
      const mediaWithoutExif = [createMockMedia(null)];

      const result = await service.processAndSaveExifKeys(mediaWithoutExif);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
      expect(mockLogger.log).toHaveBeenCalledWith(
        'No EXIF keys found in media list',
      );
    });

    it('should process and save new EXIF keys successfully', async () => {
      const mediaList = [createMockMedia()];
      const existingKeys = new Set<string>();
      const newKeys = [mockExifKey];

      // Set up mocks with proper return values
      (mockStrategy.determineType as jest.Mock)
        .mockReturnValueOnce(ExifValueType.STRING) // Make
        .mockReturnValueOnce(ExifValueType.STRING) // Model
        .mockReturnValueOnce(ExifValueType.STRING) // DateTimeOriginal
        .mockReturnValueOnce(ExifValueType.NOT_SUPPORTED); // GPS

      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(existingKeys),
      );
      (mockFactory.createExifKeysFromMap as jest.Mock).mockReturnValue(newKeys);
      mockRepository.saveKeys.mockResolvedValue(success(newKeys));

      const result = await service.processAndSaveExifKeys(mediaList);

      expect(mockRepository.findExistingKeyNames).toHaveBeenCalled();
      expect(mockFactory.createExifKeysFromMap).toHaveBeenCalled();
      expect(mockRepository.saveKeys).toHaveBeenCalledWith(newKeys);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1);
      }
    });

    it('should return success(0) when no new keys to save', async () => {
      const mediaList = [createMockMedia()];
      const existingKeys = new Set([
        'Make',
        'Model',
        'DateTimeOriginal',
        'GPS',
      ]);

      (mockStrategy.determineType as jest.Mock).mockReturnValue(
        ExifValueType.STRING,
      );
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(existingKeys),
      );
      (mockFactory.createExifKeysFromMap as jest.Mock).mockReturnValue([]);

      const result = await service.processAndSaveExifKeys(mediaList);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
      expect(mockLogger.log).toHaveBeenCalledWith('No new EXIF keys to save');
    });

    it('should return failure when repository findExistingKeyNames fails', async () => {
      const mediaList = [createMockMedia()];
      const error = new Error('Database error');

      // Set up mocks - strategy needs to be called first to process EXIF data
      (mockStrategy.determineType as jest.Mock).mockReturnValue(
        ExifValueType.STRING,
      );
      mockRepository.findExistingKeyNames.mockResolvedValue(failure(error));

      const result = await service.processAndSaveExifKeys(mediaList);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(error);
      }
    });

    it('should return failure when repository saveKeys fails', async () => {
      const mediaList = [createMockMedia()];
      const existingKeys = new Set<string>();
      const newKeys = [mockExifKey];
      const error = new Error('Save error');

      (mockStrategy.determineType as jest.Mock).mockReturnValue(
        ExifValueType.STRING,
      );
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(existingKeys),
      );
      (mockFactory.createExifKeysFromMap as jest.Mock).mockReturnValue(newKeys);
      mockRepository.saveKeys.mockResolvedValue(failure(error));

      const result = await service.processAndSaveExifKeys(mediaList);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(error);
      }
    });

    it('should handle exceptions and return failure', async () => {
      const mediaList = [createMockMedia()];

      (mockStrategy.determineType as jest.Mock).mockImplementation(() => {
        throw new Error('Strategy error');
      });

      const result = await service.processAndSaveExifKeys(mediaList);

      expect(result.success).toBe(false);
      expect(mockLogger.logError).toHaveBeenCalled();
    });

    it('should log messages when logging is enabled', async () => {
      const mediaList = [createMockMedia()];
      const existingKeys = new Set<string>();
      const newKeys = [mockExifKey];

      (mockStrategy.determineType as jest.Mock).mockReturnValue(
        ExifValueType.STRING,
      );
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(existingKeys),
      );
      (mockFactory.createExifKeysFromMap as jest.Mock).mockReturnValue(newKeys);
      mockRepository.saveKeys.mockResolvedValue(success(newKeys));

      const result = await service.processAndSaveExifKeys(mediaList);

      expect(result.success).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Saved 1 new EXIF keys'),
      );
    });

    it('should skip media with invalid EXIF data', async () => {
      const mediaWithInvalidExif = [
        createMockMedia(null),
        createMockMedia(undefined),
        createMockMedia('invalid'),
      ];

      // Ensure clean mock state
      jest.clearAllMocks();

      const result = await service.processAndSaveExifKeys(mediaWithInvalidExif);

      expect(mockStrategy.determineType).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
      expect(mockLogger.log).toHaveBeenCalledWith(
        'No EXIF keys found in media list',
      );
    });
  });

  describe('private methods behavior', () => {
    it('should extract EXIF keys from media with valid EXIF data', async () => {
      const mediaList = [createMockMedia()];
      const existingKeys = new Set<string>();

      (mockStrategy.determineType as jest.Mock).mockReturnValue(
        ExifValueType.STRING,
      );
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(existingKeys),
      );
      (mockFactory.createExifKeysFromMap as jest.Mock).mockReturnValue([
        mockExifKey,
      ]);
      mockRepository.saveKeys.mockResolvedValue(success([mockExifKey]));

      await service.processAndSaveExifKeys(mediaList);

      // Verify that strategy.determineType was called for each EXIF key
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(4);
      expect(mockStrategy.determineType).toHaveBeenCalledWith('Canon');
      expect(mockStrategy.determineType).toHaveBeenCalledWith('EOS 5D');
      expect(mockStrategy.determineType).toHaveBeenCalledWith(
        '2023:01:01 12:00:00',
      );
      expect(mockStrategy.determineType).toHaveBeenCalledWith({
        lat: 40.7128,
        lng: -74.006,
      });
    });
  });
});
