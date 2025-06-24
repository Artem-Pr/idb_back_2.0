import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ExifValuesRepository } from './exif-values.repository';
import { Media } from 'src/files/entities/media.entity';
import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';
import { ExifTypeDeterminationStrategy } from 'src/exif-keys/strategies/exif-type-determination.strategy';

describe('ExifValuesRepository', () => {
  let repository: ExifValuesRepository;
  let mockMediaRepository: jest.Mocked<MongoRepository<Media>>;
  let mockTypeDeterminationStrategy: jest.Mocked<ExifTypeDeterminationStrategy>;
  let mockToArray: jest.Mock;
  let module: TestingModule;

  const mockAggregationResult = [
    {
      values: [
        { value: 'Canon', count: 5 },
        { value: 'Nikon', count: 3 },
        { value: 'Sony', count: 2 },
      ],
      totalCount: [{ count: 3 }],
      sampleValue: [{ value: 'Canon' }],
    },
  ];

  const mockRangeAggregationResult = [
    {
      minValue: 100,
      maxValue: 1600,
      count: 25,
    },
  ];

  beforeEach(async () => {
    mockToArray = jest.fn();

    const mockAggregationCursor = {
      toArray: mockToArray,
    };

    const mockMediaRepo = {
      aggregate: jest.fn().mockReturnValue(mockAggregationCursor),
    };

    const mockStrategy = {
      determineType: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ExifValuesRepository,
        {
          provide: getRepositoryToken(Media),
          useValue: mockMediaRepo,
        },
        {
          provide: ExifTypeDeterminationStrategy,
          useValue: mockStrategy,
        },
      ],
    }).compile();

    repository = module.get<ExifValuesRepository>(ExifValuesRepository);
    mockMediaRepository = module.get(getRepositoryToken(Media));
    mockTypeDeterminationStrategy = module.get(ExifTypeDeterminationStrategy);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('findExifValuesPaginated', () => {
    const validOptions = {
      exifPropertyName: 'Make',
      page: 1,
      perPage: 50,
      skip: 0,
    };

    beforeEach(() => {
      mockTypeDeterminationStrategy.determineType.mockReturnValue(
        ExifValueType.STRING,
      );
    });

    it('should return paginated EXIF values successfully', async () => {
      // Arrange
      mockToArray.mockResolvedValue(mockAggregationResult);

      // Act
      const result = await repository.findExifValuesPaginated(validOptions);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.values).toHaveLength(3);
        expect(result.data.values[0]).toEqual({ value: 'Canon', count: 5 });
        expect(result.data.totalCount).toBe(3);
        expect(result.data.valueType).toBe(ExifValueType.STRING);
      }

      expect(mockMediaRepository.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: { 'exif.Make': { $exists: true, $ne: null } },
          }),
          expect.objectContaining({
            $unwind: {
              path: '$exif.Make',
              preserveNullAndEmptyArrays: true,
            },
          }),
          expect.objectContaining({
            $group: {
              _id: '$exif.Make',
              count: { $sum: 1 },
            },
          }),
        ]),
      );
    });

    it('should handle array properties correctly with unwind', async () => {
      // Arrange
      const arrayOptions = { ...validOptions, exifPropertyName: 'Keywords' };
      mockToArray.mockResolvedValue(mockAggregationResult);

      // Act
      const result = await repository.findExifValuesPaginated(arrayOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(mockMediaRepository.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: { 'exif.Keywords': { $exists: true, $ne: null } },
          }),
          expect.objectContaining({
            $unwind: {
              path: '$exif.Keywords',
              preserveNullAndEmptyArrays: true,
            },
          }),
        ]),
      );
    });

    it('should apply pagination correctly', async () => {
      // Arrange
      const paginatedOptions = {
        ...validOptions,
        page: 3,
        perPage: 25,
        skip: 50,
      };
      mockToArray.mockResolvedValue(mockAggregationResult);

      // Act
      await repository.findExifValuesPaginated(paginatedOptions);

      // Assert
      expect(mockMediaRepository.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $facet: expect.objectContaining({
              values: expect.arrayContaining([
                { $sort: { _id: 1 } },
                { $skip: 50 },
                { $limit: 25 },
              ]),
            }),
          }),
        ]),
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      mockToArray.mockResolvedValue([]);

      // Act
      const result = await repository.findExifValuesPaginated(validOptions);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.values).toHaveLength(0);
        expect(result.data.totalCount).toBe(0);
        expect(result.data.valueType).toBe(ExifValueType.STRING);
      }
    });

    it('should handle numeric value type determination', async () => {
      // Arrange
      const numericResult = [
        {
          values: [{ value: 100, count: 5 }],
          totalCount: [{ count: 1 }],
          sampleValue: [{ value: 100 }],
        },
      ];
      mockTypeDeterminationStrategy.determineType.mockReturnValue(
        ExifValueType.NUMBER,
      );
      mockToArray.mockResolvedValue(numericResult);

      // Act
      const result = await repository.findExifValuesPaginated({
        ...validOptions,
        exifPropertyName: 'ISO',
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valueType).toBe(ExifValueType.NUMBER);
      }
      expect(mockTypeDeterminationStrategy.determineType).toHaveBeenCalledWith(
        100,
      );
    });

    it('should handle query timeout', async () => {
      // Arrange
      // Mock a scenario where the repository's timeout handling kicks in
      // We'll reject with a timeout error instead of actually waiting
      const timeoutError = new Error('Query timeout');
      mockToArray.mockRejectedValue(timeoutError);

      // Act
      const result = await repository.findExifValuesPaginated(validOptions);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Query timeout');
      }
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Connection failed');
      mockToArray.mockRejectedValue(dbError);

      // Act
      const result = await repository.findExifValuesPaginated(validOptions);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Connection failed');
      }
    });
  });

  describe('findExifValueRange', () => {
    const propertyName = 'ISO';

    it('should return EXIF value range successfully', async () => {
      // Arrange
      mockToArray.mockResolvedValue(mockRangeAggregationResult);

      // Act
      const result = await repository.findExifValueRange(propertyName);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.minValue).toBe(100);
        expect(result.data.maxValue).toBe(1600);
        expect(result.data.count).toBe(25);
      }

      expect(mockMediaRepository.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            'exif.ISO': {
              $exists: true,
              $ne: null,
              $type: 'number',
            },
          },
        },
        {
          $group: {
            _id: null,
            minValue: { $min: '$exif.ISO' },
            maxValue: { $max: '$exif.ISO' },
            count: { $sum: 1 },
          },
        },
      ]);
    });

    it('should handle empty numeric results', async () => {
      // Arrange
      mockToArray.mockResolvedValue([]);

      // Act
      const result = await repository.findExifValueRange(propertyName);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('No numeric values found');
      }
    });

    it('should handle invalid numeric values', async () => {
      // Arrange
      const invalidResult = [
        {
          minValue: null,
          maxValue: null,
          count: 0,
        },
      ];
      mockToArray.mockResolvedValue(invalidResult);

      // Act
      const result = await repository.findExifValueRange(propertyName);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('No valid numeric values found');
      }
    });

    it('should handle single value range', async () => {
      // Arrange
      const singleValueResult = [
        {
          minValue: 400,
          maxValue: 400,
          count: 1,
        },
      ];
      mockToArray.mockResolvedValue(singleValueResult);

      // Act
      const result = await repository.findExifValueRange(propertyName);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.minValue).toBe(400);
        expect(result.data.maxValue).toBe(400);
        expect(result.data.count).toBe(1);
      }
    });

    it('should handle query timeout', async () => {
      // Arrange
      // Mock a scenario where the repository's timeout handling kicks in
      // We'll reject with a timeout error instead of actually waiting
      const timeoutError = new Error('Query timeout');
      mockToArray.mockRejectedValue(timeoutError);

      // Act
      const result = await repository.findExifValueRange(propertyName);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Query timeout');
      }
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Aggregation failed');
      mockToArray.mockRejectedValue(dbError);

      // Act
      const result = await repository.findExifValueRange(propertyName);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Aggregation failed');
      }
    });
  });
});
