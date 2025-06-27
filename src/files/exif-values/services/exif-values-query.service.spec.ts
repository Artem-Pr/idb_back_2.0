import { Test, TestingModule } from '@nestjs/testing';
import { ExifValuesQueryService } from './exif-values-query.service';
import { ExifValuesValidationService } from './exif-values-validation.service';
import { IExifValuesRepository } from '../types/exif-values.types';
import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';
import { success, failure } from 'src/exif-keys/types/result.type';
import { GetExifValuesInputDto } from '../dto/get-exif-values-input.dto';
import { GetExifValueRangeInputDto } from '../dto/get-exif-value-range-input.dto';

describe('ExifValuesQueryService', () => {
  let service: ExifValuesQueryService;
  let mockRepository: jest.Mocked<IExifValuesRepository>;
  let mockValidationService: jest.Mocked<ExifValuesValidationService>;

  const mockValidationResult = {
    isValid: true,
    normalizedPage: 1,
    normalizedPerPage: 50,
  };

  const mockExifValuesResult = {
    values: [
      { value: 'Canon', count: 5 },
      { value: 'Nikon', count: 3 },
      { value: 'Sony', count: 2 },
    ],
    totalCount: 3,
    valueType: ExifValueType.STRING,
  };

  const mockExifValueRangeResult = {
    minValue: 100,
    maxValue: 1600,
    count: 25,
  };

  beforeEach(async () => {
    const mockExifValuesRepository = {
      findExifValuesPaginated: jest.fn(),
      findExifValueRange: jest.fn(),
    };

    const mockExifValuesValidationService = {
      validateExifPropertyName: jest.fn(),
      validatePaginationParams: jest.fn(),
      validateSearchTerm: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExifValuesQueryService,
        {
          provide: 'IExifValuesRepository',
          useValue: mockExifValuesRepository,
        },
        {
          provide: ExifValuesValidationService,
          useValue: mockExifValuesValidationService,
        },
      ],
    }).compile();

    service = module.get<ExifValuesQueryService>(ExifValuesQueryService);
    mockRepository = module.get('IExifValuesRepository');
    mockValidationService = module.get(ExifValuesValidationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getExifValuesPaginated', () => {
    const validInput: GetExifValuesInputDto = {
      exifPropertyName: 'Make',
      page: 1,
      perPage: 50,
    };

    beforeEach(() => {
      mockValidationService.validateExifPropertyName.mockReturnValue(true);
      mockValidationService.validateSearchTerm.mockReturnValue(true);
      mockValidationService.validatePaginationParams.mockReturnValue(
        mockValidationResult,
      );
    });

    it('should return paginated EXIF values successfully', async () => {
      // Arrange
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        success(mockExifValuesResult),
      );

      // Act
      const result = await service.getExifValuesPaginated(validInput);

      // Assert
      expect(result).toEqual({
        values: ['Canon', 'Nikon', 'Sony'],
        page: 1,
        perPage: 50,
        totalCount: 3,
        totalPages: 1,
        exifPropertyName: 'Make',
        valueType: ExifValueType.STRING,
      });

      expect(
        mockValidationService.validateExifPropertyName,
      ).toHaveBeenCalledWith('Make');
      expect(
        mockValidationService.validatePaginationParams,
      ).toHaveBeenCalledWith(1, 50);
      expect(mockRepository.findExifValuesPaginated).toHaveBeenCalledWith({
        exifPropertyName: 'Make',
        searchTerm: undefined,
        page: 1,
        perPage: 50,
        skip: 0,
      });
    });

    it('should handle default pagination values', async () => {
      // Arrange
      const inputWithDefaults = { exifPropertyName: 'Make' };
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        success(mockExifValuesResult),
      );

      // Act
      await service.getExifValuesPaginated(inputWithDefaults);

      // Assert
      expect(
        mockValidationService.validatePaginationParams,
      ).toHaveBeenCalledWith(1, 50);
    });

    it('should handle large perPage values correctly', async () => {
      // Arrange
      const largePerPageInput = {
        exifPropertyName: 'Make',
        page: 1,
        perPage: 100,
      };
      const largePerPageValidation = {
        isValid: true,
        normalizedPage: 1,
        normalizedPerPage: 100,
      };
      mockValidationService.validatePaginationParams.mockReturnValue(
        largePerPageValidation,
      );
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        success(mockExifValuesResult),
      );

      // Act
      await service.getExifValuesPaginated(largePerPageInput);

      // Assert
      expect(mockRepository.findExifValuesPaginated).toHaveBeenCalledWith({
        exifPropertyName: 'Make',
        searchTerm: undefined,
        page: 1,
        perPage: 100,
        skip: 0,
      });
    });

    it('should calculate pagination metadata correctly', async () => {
      // Arrange
      const largeResultSet = {
        ...mockExifValuesResult,
        totalCount: 150,
      };
      const pageInput = { exifPropertyName: 'Make', page: 3, perPage: 25 };
      const pageValidation = {
        isValid: true,
        normalizedPage: 3,
        normalizedPerPage: 25,
      };

      mockValidationService.validatePaginationParams.mockReturnValue(
        pageValidation,
      );
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        success(largeResultSet),
      );

      // Act
      const result = await service.getExifValuesPaginated(pageInput);

      // Assert
      expect(result.page).toBe(3);
      expect(result.perPage).toBe(25);
      expect(result.totalCount).toBe(150);
      expect(result.totalPages).toBe(6); // Math.ceil(150/25)
    });

    it('should throw error for invalid EXIF property name', async () => {
      // Arrange
      mockValidationService.validateExifPropertyName.mockReturnValue(false);

      // Act & Assert
      await expect(
        service.getExifValuesPaginated({ exifPropertyName: 'InvalidProperty' }),
      ).rejects.toThrow('Invalid EXIF property name: InvalidProperty');

      expect(mockRepository.findExifValuesPaginated).not.toHaveBeenCalled();
    });

    it('should throw error when repository operation fails', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        failure(repositoryError),
      );

      // Act & Assert
      await expect(service.getExifValuesPaginated(validInput)).rejects.toThrow(
        'Failed to get EXIF values: Database connection failed',
      );
    });

    it('should handle numeric value type correctly', async () => {
      // Arrange
      const numericResult = {
        ...mockExifValuesResult,
        values: [
          { value: 100, count: 5 },
          { value: 200, count: 3 },
          { value: 400, count: 2 },
        ],
        valueType: ExifValueType.NUMBER,
      };
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        success(numericResult),
      );

      // Act
      const result = await service.getExifValuesPaginated({
        exifPropertyName: 'ISO',
      });

      // Assert
      expect(result.values).toEqual([100, 200, 400]);
      expect(result.valueType).toBe(ExifValueType.NUMBER);
    });

    it('should handle empty results', async () => {
      // Arrange
      const emptyResult = {
        values: [],
        totalCount: 0,
        valueType: ExifValueType.STRING,
      };
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        success(emptyResult),
      );

      // Act
      const result = await service.getExifValuesPaginated(validInput);

      // Assert
      expect(result.values).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle searchTerm parameter correctly', async () => {
      // Arrange
      const inputWithSearchTerm = {
        exifPropertyName: 'Make',
        searchTerm: 'Canon',
        page: 1,
        perPage: 50,
      };
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        success(mockExifValuesResult),
      );

      // Act
      await service.getExifValuesPaginated(inputWithSearchTerm);

      // Assert
      expect(mockValidationService.validateSearchTerm).toHaveBeenCalledWith(
        'Canon',
      );
      expect(mockRepository.findExifValuesPaginated).toHaveBeenCalledWith({
        exifPropertyName: 'Make',
        searchTerm: 'Canon',
        page: 1,
        perPage: 50,
        skip: 0,
      });
    });

    it('should throw error for invalid search term', async () => {
      // Arrange
      const inputWithInvalidSearchTerm = {
        exifPropertyName: 'Make',
        searchTerm: 'a'.repeat(2001), // Too long
      };
      mockValidationService.validateSearchTerm.mockReturnValue(false);

      // Act & Assert
      await expect(
        service.getExifValuesPaginated(inputWithInvalidSearchTerm),
      ).rejects.toThrow('Invalid search term:');

      expect(mockValidationService.validateSearchTerm).toHaveBeenCalledWith(
        inputWithInvalidSearchTerm.searchTerm,
      );
    });

    it('should handle empty search term correctly', async () => {
      // Arrange
      const inputWithEmptySearchTerm = {
        exifPropertyName: 'Make',
        searchTerm: '',
        page: 1,
        perPage: 50,
      };
      mockRepository.findExifValuesPaginated.mockResolvedValue(
        success(mockExifValuesResult),
      );

      // Act
      await service.getExifValuesPaginated(inputWithEmptySearchTerm);

      // Assert
      expect(mockValidationService.validateSearchTerm).toHaveBeenCalledWith('');
      expect(mockRepository.findExifValuesPaginated).toHaveBeenCalledWith({
        exifPropertyName: 'Make',
        searchTerm: '',
        page: 1,
        perPage: 50,
        skip: 0,
      });
    });
  });

  describe('getExifValueRange', () => {
    const validRangeInput: GetExifValueRangeInputDto = {
      exifPropertyName: 'ISO',
    };

    beforeEach(() => {
      mockValidationService.validateExifPropertyName.mockReturnValue(true);
    });

    it('should return EXIF value range successfully', async () => {
      // Arrange
      mockRepository.findExifValueRange.mockResolvedValue(
        success(mockExifValueRangeResult),
      );

      // Act
      const result = await service.getExifValueRange(validRangeInput);

      // Assert
      expect(result).toEqual({
        minValue: 100,
        maxValue: 1600,
        exifPropertyName: 'ISO',
        count: 25,
      });

      expect(
        mockValidationService.validateExifPropertyName,
      ).toHaveBeenCalledWith('ISO');
      expect(mockRepository.findExifValueRange).toHaveBeenCalledWith('ISO');
    });

    it('should throw error for invalid EXIF property name', async () => {
      // Arrange
      mockValidationService.validateExifPropertyName.mockReturnValue(false);

      // Act & Assert
      await expect(
        service.getExifValueRange({ exifPropertyName: 'InvalidProperty' }),
      ).rejects.toThrow('Invalid EXIF property name: InvalidProperty');

      expect(mockRepository.findExifValueRange).not.toHaveBeenCalled();
    });

    it('should throw error when repository operation fails', async () => {
      // Arrange
      const repositoryError = new Error('No numeric values found');
      mockRepository.findExifValueRange.mockResolvedValue(
        failure(repositoryError),
      );

      // Act & Assert
      await expect(service.getExifValueRange(validRangeInput)).rejects.toThrow(
        'Failed to get EXIF value range: No numeric values found',
      );
    });

    it('should handle edge case with single value', async () => {
      // Arrange
      const singleValueResult = {
        minValue: 400,
        maxValue: 400,
        count: 1,
      };
      mockRepository.findExifValueRange.mockResolvedValue(
        success(singleValueResult),
      );

      // Act
      const result = await service.getExifValueRange(validRangeInput);

      // Assert
      expect(result.minValue).toBe(400);
      expect(result.maxValue).toBe(400);
      expect(result.count).toBe(1);
    });

    it('should handle large numeric ranges', async () => {
      // Arrange
      const largeRangeResult = {
        minValue: 0.1,
        maxValue: 999999.9,
        count: 10000,
      };
      mockRepository.findExifValueRange.mockResolvedValue(
        success(largeRangeResult),
      );

      // Act
      const result = await service.getExifValueRange({
        exifPropertyName: 'ExposureTime',
      });

      // Assert
      expect(result.minValue).toBe(0.1);
      expect(result.maxValue).toBe(999999.9);
      expect(result.count).toBe(10000);
    });
  });
});
