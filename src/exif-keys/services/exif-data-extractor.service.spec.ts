import { Test, TestingModule } from '@nestjs/testing';
import { ExifDataExtractor } from './exif-data-extractor.service';
import { ExifTypeDeterminationStrategy } from '../strategies/exif-type-determination.strategy';
import { ExifValueType } from '../entities/exif-keys.entity';
import { Media } from '../../files/entities/media.entity';
import { ObjectId } from 'mongodb';
import type { Tags } from 'exiftool-vendored';

describe('ExifDataExtractor', () => {
  let service: ExifDataExtractor;
  let mockStrategy: jest.Mocked<ExifTypeDeterminationStrategy>;

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
    exif: {
      Make: 'Canon',
      Model: 'EOS 60D',
      ISO: 400,
      Keywords: ['nature', 'landscape'],
      Flash: 'On',
    } as Tags,
    ...overrides,
  });

  const mockMedia: Media = createMockMedia();

  const mockMediaBatch: Pick<Media, '_id' | 'exif'>[] = [
    {
      _id: new ObjectId(),
      exif: {
        Make: 'Canon',
        Model: 'EOS 60D',
        ISO: 400,
      } as Tags,
    },
    {
      _id: new ObjectId(),
      exif: {
        Make: 'Nikon',
        Model: 'D850',
        Keywords: ['portrait'],
      } as Tags,
    },
  ];

  beforeEach(async () => {
    const mockStrategyMethods = {
      determineType: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExifDataExtractor,
        {
          provide: ExifTypeDeterminationStrategy,
          useValue: mockStrategyMethods,
        },
      ],
    }).compile();

    service = module.get<ExifDataExtractor>(ExifDataExtractor);
    mockStrategy = module.get(ExifTypeDeterminationStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractExifKeysFromMediaList', () => {
    it('should extract EXIF keys from valid media list', () => {
      // Arrange
      const mediaList = [mockMedia];
      mockStrategy.determineType
        .mockReturnValueOnce(ExifValueType.STRING) // Make
        .mockReturnValueOnce(ExifValueType.STRING) // Model
        .mockReturnValueOnce(ExifValueType.NUMBER) // ISO
        .mockReturnValueOnce(ExifValueType.STRING_ARRAY) // Keywords
        .mockReturnValueOnce(ExifValueType.STRING); // Flash

      // Act
      const result = service.extractExifKeysFromMediaList(mediaList);

      // Assert
      expect(result.size).toBe(5);
      expect(result.get('Make')).toBe(ExifValueType.STRING);
      expect(result.get('Model')).toBe(ExifValueType.STRING);
      expect(result.get('ISO')).toBe(ExifValueType.NUMBER);
      expect(result.get('Keywords')).toBe(ExifValueType.STRING_ARRAY);
      expect(result.get('Flash')).toBe(ExifValueType.STRING);
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(5);
    });

    it('should handle empty media list', () => {
      // Act
      const result = service.extractExifKeysFromMediaList([]);

      // Assert
      expect(result.size).toBe(0);
      expect(mockStrategy.determineType).not.toHaveBeenCalled();
    });

    it('should skip media without valid EXIF data', () => {
      // Arrange
      const mediaWithoutExif: Media = createMockMedia({
        exif: null as any,
      });

      const mediaList = [mediaWithoutExif, mockMedia];
      mockStrategy.determineType
        .mockReturnValueOnce(ExifValueType.STRING) // Make
        .mockReturnValueOnce(ExifValueType.STRING) // Model
        .mockReturnValueOnce(ExifValueType.NUMBER) // ISO
        .mockReturnValueOnce(ExifValueType.STRING_ARRAY) // Keywords
        .mockReturnValueOnce(ExifValueType.STRING); // Flash

      // Act
      const result = service.extractExifKeysFromMediaList(mediaList);

      // Assert
      expect(result.size).toBe(5);
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(5);
    });

    it('should handle duplicate keys across media', () => {
      // Arrange
      const media1: Media = createMockMedia({
        originalName: 'test1.jpg' as any,
        filePath: '/test1.jpg' as any,
        exif: { Make: 'Canon', Model: 'EOS 60D' } as Tags,
      });

      const media2: Media = createMockMedia({
        originalName: 'test2.jpg' as any,
        filePath: '/test2.jpg' as any,
        exif: { Make: 'Nikon', ISO: 800 } as Tags,
      });

      const mediaList = [media1, media2];
      mockStrategy.determineType
        .mockReturnValueOnce(ExifValueType.STRING) // Make from media1
        .mockReturnValueOnce(ExifValueType.STRING) // Model from media1
        .mockReturnValueOnce(ExifValueType.NUMBER); // ISO from media2
      // Note: Make from media2 should not call determineType again

      // Act
      const result = service.extractExifKeysFromMediaList(mediaList);

      // Assert
      expect(result.size).toBe(3);
      expect(result.get('Make')).toBe(ExifValueType.STRING);
      expect(result.get('Model')).toBe(ExifValueType.STRING);
      expect(result.get('ISO')).toBe(ExifValueType.NUMBER);
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(3);
    });
  });

  describe('extractExifKeysFromExifBatch', () => {
    it('should extract EXIF keys from batch data', () => {
      // Arrange
      mockStrategy.determineType
        .mockReturnValueOnce(ExifValueType.STRING) // Make from first item
        .mockReturnValueOnce(ExifValueType.STRING) // Model from first item
        .mockReturnValueOnce(ExifValueType.NUMBER) // ISO from first item
        .mockReturnValueOnce(ExifValueType.STRING_ARRAY); // Keywords from second item
      // Note: Make and Model from second item should not call determineType again

      // Act
      const result = service.extractExifKeysFromExifBatch(mockMediaBatch);

      // Assert
      expect(result.size).toBe(4);
      expect(result.get('Make')).toBe(ExifValueType.STRING);
      expect(result.get('Model')).toBe(ExifValueType.STRING);
      expect(result.get('ISO')).toBe(ExifValueType.NUMBER);
      expect(result.get('Keywords')).toBe(ExifValueType.STRING_ARRAY);
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(4);
    });

    it('should handle empty batch', () => {
      // Act
      const result = service.extractExifKeysFromExifBatch([]);

      // Assert
      expect(result.size).toBe(0);
      expect(mockStrategy.determineType).not.toHaveBeenCalled();
    });

    it('should skip items without valid EXIF data', () => {
      // Arrange
      const batchWithInvalidExif: Pick<Media, '_id' | 'exif'>[] = [
        { _id: new ObjectId(), exif: null as any },
        { _id: new ObjectId(), exif: { Make: 'Canon' } as Tags },
      ];

      mockStrategy.determineType.mockReturnValueOnce(ExifValueType.STRING);

      // Act
      const result = service.extractExifKeysFromExifBatch(batchWithInvalidExif);

      // Assert
      expect(result.size).toBe(1);
      expect(result.get('Make')).toBe(ExifValueType.STRING);
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasValidExifData', () => {
    it('should return true for media with valid EXIF data', () => {
      // Act
      const result = service.hasValidExifData(mockMedia);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for media with null EXIF data', () => {
      // Arrange
      const mediaWithNullExif: Media = createMockMedia({
        exif: null as any,
      });

      // Act
      const result = service.hasValidExifData(mediaWithNullExif);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for media with undefined EXIF data', () => {
      // Arrange
      const mediaWithUndefinedExif: Media = createMockMedia({
        exif: undefined as any,
      });

      // Act
      const result = service.hasValidExifData(mediaWithUndefinedExif);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for media with non-object EXIF data', () => {
      // Arrange
      const mediaWithStringExif: Media = createMockMedia({
        exif: 'not an object' as any,
      });

      // Act
      const result = service.hasValidExifData(mediaWithStringExif);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for media with empty EXIF object', () => {
      // Arrange
      const mediaWithEmptyExif: Media = createMockMedia({
        exif: {} as Tags,
      });

      // Act
      const result = service.hasValidExifData(mediaWithEmptyExif);

      // Assert
      expect(result).toBe(true);
    });

    it('should work with batch data format', () => {
      // Arrange
      const batchItem = {
        _id: new ObjectId(),
        exif: { Make: 'Canon' } as Tags,
      };

      // Act
      const result = service.hasValidExifData(batchItem);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('processExifData', () => {
    it('should process EXIF data and update keys map', () => {
      // Arrange
      const exifData: Tags = {
        Make: 'Canon',
        Model: 'EOS 60D',
        ISO: 400,
      } as Tags;
      const keysMap = new Map<string, ExifValueType>();

      mockStrategy.determineType
        .mockReturnValueOnce(ExifValueType.STRING) // Make
        .mockReturnValueOnce(ExifValueType.STRING) // Model
        .mockReturnValueOnce(ExifValueType.NUMBER); // ISO

      // Act
      service.processExifData(exifData, keysMap);

      // Assert
      expect(keysMap.size).toBe(3);
      expect(keysMap.get('Make')).toBe(ExifValueType.STRING);
      expect(keysMap.get('Model')).toBe(ExifValueType.STRING);
      expect(keysMap.get('ISO')).toBe(ExifValueType.NUMBER);
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(3);
      expect(mockStrategy.determineType).toHaveBeenCalledWith('Canon');
      expect(mockStrategy.determineType).toHaveBeenCalledWith('EOS 60D');
      expect(mockStrategy.determineType).toHaveBeenCalledWith(400);
    });

    it('should not overwrite existing keys in map', () => {
      // Arrange
      const exifData: Tags = {
        Make: 'Canon',
        Model: 'EOS 60D',
      } as Tags;
      const keysMap = new Map<string, ExifValueType>();
      keysMap.set('Make', ExifValueType.STRING);

      mockStrategy.determineType.mockReturnValueOnce(ExifValueType.STRING); // Model

      // Act
      service.processExifData(exifData, keysMap);

      // Assert
      expect(keysMap.size).toBe(2);
      expect(keysMap.get('Make')).toBe(ExifValueType.STRING);
      expect(keysMap.get('Model')).toBe(ExifValueType.STRING);
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(1);
      expect(mockStrategy.determineType).toHaveBeenCalledWith('EOS 60D');
    });

    it('should handle empty EXIF data', () => {
      // Arrange
      const exifData: Tags = {} as Tags;
      const keysMap = new Map<string, ExifValueType>();

      // Act
      service.processExifData(exifData, keysMap);

      // Assert
      expect(keysMap.size).toBe(0);
      expect(mockStrategy.determineType).not.toHaveBeenCalled();
    });

    it('should handle EXIF data with various value types', () => {
      // Arrange
      const exifData: Tags = {
        StringValue: 'test',
        NumberValue: 123,
        BooleanValue: true,
        ArrayValue: ['a', 'b'],
        ObjectValue: { nested: 'value' },
        NullValue: null,
        UndefinedValue: undefined,
      } as any;
      const keysMap = new Map<string, ExifValueType>();

      mockStrategy.determineType
        .mockReturnValueOnce(ExifValueType.STRING)
        .mockReturnValueOnce(ExifValueType.NUMBER)
        .mockReturnValueOnce(ExifValueType.STRING)
        .mockReturnValueOnce(ExifValueType.STRING_ARRAY)
        .mockReturnValueOnce(ExifValueType.NOT_SUPPORTED)
        .mockReturnValueOnce(ExifValueType.NOT_SUPPORTED)
        .mockReturnValueOnce(ExifValueType.NOT_SUPPORTED);

      // Act
      service.processExifData(exifData, keysMap);

      // Assert
      expect(keysMap.size).toBe(7);
      expect(mockStrategy.determineType).toHaveBeenCalledTimes(7);
      expect(mockStrategy.determineType).toHaveBeenCalledWith('test');
      expect(mockStrategy.determineType).toHaveBeenCalledWith(123);
      expect(mockStrategy.determineType).toHaveBeenCalledWith(true);
      expect(mockStrategy.determineType).toHaveBeenCalledWith(['a', 'b']);
      expect(mockStrategy.determineType).toHaveBeenCalledWith({
        nested: 'value',
      });
      expect(mockStrategy.determineType).toHaveBeenCalledWith(null);
      expect(mockStrategy.determineType).toHaveBeenCalledWith(undefined);
    });
  });
});
