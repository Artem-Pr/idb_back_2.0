import { Test, TestingModule } from '@nestjs/testing';
import { ExifKeysValidationService } from './exif-keys-validation.service';
import { ProcessExifKeysCommand } from '../handlers/process-exif-keys.handler';
import { SyncExifKeysCommand } from '../handlers/sync-exif-keys.handler';
import { Media } from '../../entities/media.entity';
import { ObjectId } from 'mongodb';
import type { Tags } from 'exiftool-vendored';

describe('ExifKeysValidationService', () => {
  let service: ExifKeysValidationService;

  // Helper function to create mock Media objects
  const createMockMedia = (overrides: Partial<Media> = {}): Media => ({
    _id: new ObjectId(),
    originalName: 'test.jpg' as any,
    mimetype: 'image/jpeg' as any,
    size: 1024,
    megapixels: 12.3,
    imageSize: '4000x3000',
    keywords: null,
    changeDate: Date.now(),
    originalDate: new Date(),
    filePath: '/test.jpg' as any,
    preview: '/test-preview.jpg' as any,
    fullSizeJpg: null,
    rating: null,
    description: null,
    timeStamp: null,
    exif: { Make: 'Canon' } as Tags,
    ...overrides,
  });

  const mockMedia: Media = createMockMedia();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExifKeysValidationService],
    }).compile();

    service = module.get<ExifKeysValidationService>(ExifKeysValidationService);
  });

  describe('validateProcessCommand', () => {
    it('should validate valid process command', () => {
      // Arrange
      const command: ProcessExifKeysCommand = {
        mediaList: [mockMedia],
      };

      // Act
      const result = service.validateProcessCommand(command);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null command', () => {
      // Act
      const result = service.validateProcessCommand(null as any);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command is required');
    });

    it('should reject command without mediaList', () => {
      // Arrange
      const command = {} as ProcessExifKeysCommand;

      // Act
      const result = service.validateProcessCommand(command);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MediaList is required');
    });

    it('should reject command with empty mediaList', () => {
      // Arrange
      const command: ProcessExifKeysCommand = {
        mediaList: [],
      };

      // Act
      const result = service.validateProcessCommand(command);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MediaList must be a non-empty array');
    });

    it('should reject command with non-array mediaList', () => {
      // Arrange
      const command = {
        mediaList: 'not an array',
      } as any;

      // Act
      const result = service.validateProcessCommand(command);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MediaList must be a non-empty array');
    });
  });

  describe('validateSyncCommand', () => {
    it('should validate valid sync command with no batch size', () => {
      // Arrange
      const command: SyncExifKeysCommand = {};

      // Act
      const result = service.validateSyncCommand(command);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid sync command with valid batch size', () => {
      // Arrange
      const command: SyncExifKeysCommand = {
        batchSize: 100,
      };

      // Act
      const result = service.validateSyncCommand(command);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative batch size', () => {
      // Arrange
      const command: SyncExifKeysCommand = {
        batchSize: -1,
      };

      // Act
      const result = service.validateSyncCommand(command);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BatchSize must be a positive integer');
    });

    it('should reject zero batch size', () => {
      // Arrange
      const command: SyncExifKeysCommand = {
        batchSize: 0,
      };

      // Act
      const result = service.validateSyncCommand(command);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BatchSize must be a positive integer');
    });

    it('should reject non-integer batch size', () => {
      // Arrange
      const command: SyncExifKeysCommand = {
        batchSize: 1.5,
      };

      // Act
      const result = service.validateSyncCommand(command);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BatchSize must be a positive integer');
    });

    it('should reject batch size over limit', () => {
      // Arrange
      const command: SyncExifKeysCommand = {
        batchSize: 15000,
      };

      // Act
      const result = service.validateSyncCommand(command);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'BatchSize cannot exceed 10000 for performance reasons',
      );
    });
  });

  describe('isValidMediaList', () => {
    it('should return true for valid media list', () => {
      // Arrange
      const mediaList = [mockMedia];

      // Act
      const result = service.isValidMediaList(mediaList);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for empty array', () => {
      // Act
      const result = service.isValidMediaList([]);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for non-array', () => {
      // Act
      const result = service.isValidMediaList('not an array' as any);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Act
      const result = service.isValidMediaList(null as any);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isValidMediaForProcessing', () => {
    it('should validate valid media', () => {
      // Act
      const result = service.isValidMediaForProcessing(mockMedia);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null media', () => {
      // Act
      const result = service.isValidMediaForProcessing(null as any);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Media entity is required');
    });

    it('should reject media without ID', () => {
      // Arrange
      const invalidMedia = createMockMedia({
        _id: undefined as any,
      });

      // Act
      const result = service.isValidMediaForProcessing(invalidMedia);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Media entity must have an ID');
    });

    it('should reject media without originalName', () => {
      // Arrange
      const invalidMedia = createMockMedia({
        originalName: undefined as any,
      });

      // Act
      const result = service.isValidMediaForProcessing(invalidMedia);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Media entity must have an originalName');
    });

    it('should reject media without filePath', () => {
      // Arrange
      const invalidMedia = createMockMedia({
        filePath: undefined as any,
      });

      // Act
      const result = service.isValidMediaForProcessing(invalidMedia);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Media entity must have a filePath');
    });

    it('should collect multiple validation errors', () => {
      // Arrange
      const invalidMedia = createMockMedia({
        _id: undefined as any,
        originalName: undefined as any,
        filePath: undefined as any,
      });

      // Act
      const result = service.isValidMediaForProcessing(invalidMedia);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Media entity must have an ID');
      expect(result.errors).toContain('Media entity must have an originalName');
      expect(result.errors).toContain('Media entity must have a filePath');
    });
  });

  describe('validateBatchParameters', () => {
    it('should validate valid batch parameters', () => {
      // Act
      const result = service.validateBatchParameters(100, 0, 1000);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative batch size', () => {
      // Act
      const result = service.validateBatchParameters(-1, 0, 1000);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BatchSize must be a positive integer');
    });

    it('should reject zero batch size', () => {
      // Act
      const result = service.validateBatchParameters(0, 0, 1000);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BatchSize must be a positive integer');
    });

    it('should reject non-integer batch size', () => {
      // Act
      const result = service.validateBatchParameters(1.5, 0, 1000);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BatchSize must be a positive integer');
    });

    it('should reject negative offset', () => {
      // Act
      const result = service.validateBatchParameters(100, -1, 1000);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Offset must be a non-negative integer');
    });

    it('should reject non-integer offset', () => {
      // Act
      const result = service.validateBatchParameters(100, 1.5, 1000);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Offset must be a non-negative integer');
    });

    it('should reject negative total count', () => {
      // Act
      const result = service.validateBatchParameters(100, 0, -1);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'TotalCount must be a non-negative integer',
      );
    });

    it('should reject non-integer total count', () => {
      // Act
      const result = service.validateBatchParameters(100, 0, 1.5);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'TotalCount must be a non-negative integer',
      );
    });

    it('should reject offset greater than or equal to total count when total > 0', () => {
      // Act
      const result = service.validateBatchParameters(100, 1000, 1000);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Offset cannot be greater than or equal to totalCount',
      );
    });

    it('should allow offset equal to total count when total is 0', () => {
      // Act
      const result = service.validateBatchParameters(100, 0, 0);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateProcessingConfig', () => {
    it('should validate valid config', () => {
      // Arrange
      const config = {
        batchSize: 100,
        enableLogging: true,
      };

      // Act
      const result = service.validateProcessingConfig(config);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate undefined config', () => {
      // Act
      const result = service.validateProcessingConfig(undefined);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object config', () => {
      // Act
      const result = service.validateProcessingConfig('not an object');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    it('should reject invalid batch size in config', () => {
      // Arrange
      const config = {
        batchSize: -1,
      };

      // Act
      const result = service.validateProcessingConfig(config);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Configuration batchSize must be a positive integer',
      );
    });

    it('should reject non-boolean enableLogging', () => {
      // Arrange
      const config = {
        enableLogging: 'yes',
      };

      // Act
      const result = service.validateProcessingConfig(config);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Configuration enableLogging must be a boolean',
      );
    });

    it('should collect multiple config validation errors', () => {
      // Arrange
      const config = {
        batchSize: 0,
        enableLogging: 'invalid',
      };

      // Act
      const result = service.validateProcessingConfig(config);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain(
        'Configuration batchSize must be a positive integer',
      );
      expect(result.errors).toContain(
        'Configuration enableLogging must be a boolean',
      );
    });
  });
});
