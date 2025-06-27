import { Test, TestingModule } from '@nestjs/testing';
import { ExifValuesValidationService } from './exif-values-validation.service';
import { EXIF_VALUES_CONSTANTS } from '../constants/exif-values.constants';

describe('ExifValuesValidationService', () => {
  let service: ExifValuesValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExifValuesValidationService],
    }).compile();

    service = module.get<ExifValuesValidationService>(
      ExifValuesValidationService,
    );
  });

  describe('validateExifPropertyName', () => {
    it('should return true for valid property names', () => {
      // Arrange & Act & Assert
      expect(service.validateExifPropertyName('Make')).toBe(true);
      expect(service.validateExifPropertyName('Model')).toBe(true);
      expect(service.validateExifPropertyName('ISO')).toBe(true);
      expect(service.validateExifPropertyName('ExposureTime')).toBe(true);
      expect(service.validateExifPropertyName('FNumber')).toBe(true);
    });

    it('should return false for empty or null property names', () => {
      // Arrange & Act & Assert
      expect(service.validateExifPropertyName('')).toBe(false);
      expect(service.validateExifPropertyName(null as any)).toBe(false);
      expect(service.validateExifPropertyName(undefined as any)).toBe(false);
    });

    it('should return false for non-string property names', () => {
      // Arrange & Act & Assert
      expect(service.validateExifPropertyName(123 as any)).toBe(false);
      expect(service.validateExifPropertyName({} as any)).toBe(false);
      expect(service.validateExifPropertyName([] as any)).toBe(false);
      expect(service.validateExifPropertyName(true as any)).toBe(false);
    });

    it('should return false for property names that are too short', () => {
      // Arrange
      const tooShort = 'a'.repeat(
        EXIF_VALUES_CONSTANTS.VALIDATION.MIN_PROPERTY_NAME_LENGTH - 1,
      );

      // Act & Assert
      expect(service.validateExifPropertyName(tooShort)).toBe(false);
    });

    it('should return false for property names that are too long', () => {
      // Arrange
      const tooLong = 'a'.repeat(
        EXIF_VALUES_CONSTANTS.VALIDATION.MAX_PROPERTY_NAME_LENGTH + 1,
      );

      // Act & Assert
      expect(service.validateExifPropertyName(tooLong)).toBe(false);
    });

    it('should return true for property names at min length boundary', () => {
      // Arrange
      const minLength = 'a'.repeat(
        EXIF_VALUES_CONSTANTS.VALIDATION.MIN_PROPERTY_NAME_LENGTH,
      );

      // Act & Assert
      expect(service.validateExifPropertyName(minLength)).toBe(true);
    });

    it('should return true for property names at max length boundary', () => {
      // Arrange
      const maxLength = 'a'.repeat(
        EXIF_VALUES_CONSTANTS.VALIDATION.MAX_PROPERTY_NAME_LENGTH,
      );

      // Act & Assert
      expect(service.validateExifPropertyName(maxLength)).toBe(true);
    });
  });

  describe('validatePaginationParams', () => {
    it('should return valid result with default values when no params provided', () => {
      // Act
      const result = service.validatePaginationParams();

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PAGE,
      );
      expect(result.normalizedPerPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PER_PAGE,
      );
    });

    it('should return valid result with provided valid params', () => {
      // Act
      const result = service.validatePaginationParams(2, 25);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(2);
      expect(result.normalizedPerPage).toBe(25);
    });

    it('should normalize negative page to 1', () => {
      // Act
      const result = service.validatePaginationParams(-5, 25);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(1);
      expect(result.normalizedPerPage).toBe(25);
    });

    it('should normalize zero page to 1', () => {
      // Act
      const result = service.validatePaginationParams(0, 25);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(1);
      expect(result.normalizedPerPage).toBe(25);
    });

    it('should normalize negative perPage to 1', () => {
      // Act
      const result = service.validatePaginationParams(1, -10);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(1);
      expect(result.normalizedPerPage).toBe(1);
    });

    it('should normalize zero perPage to default value', () => {
      // Act
      const result = service.validatePaginationParams(1, 0);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(1);
      expect(result.normalizedPerPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PER_PAGE,
      );
    });

    it('should limit perPage to maximum allowed', () => {
      // Arrange
      const excessivePerPage =
        EXIF_VALUES_CONSTANTS.PAGINATION.MAX_PER_PAGE + 100;

      // Act
      const result = service.validatePaginationParams(1, excessivePerPage);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(1);
      expect(result.normalizedPerPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.MAX_PER_PAGE,
      );
    });

    it('should handle undefined values gracefully', () => {
      // Act
      const result = service.validatePaginationParams(undefined, undefined);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PAGE,
      );
      expect(result.normalizedPerPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PER_PAGE,
      );
    });

    it('should handle null values gracefully', () => {
      // Act
      const result = service.validatePaginationParams(null as any, null as any);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PAGE,
      );
      expect(result.normalizedPerPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PER_PAGE,
      );
    });

    it('should handle boundary values correctly', () => {
      // Act
      const result = service.validatePaginationParams(
        1,
        EXIF_VALUES_CONSTANTS.PAGINATION.MAX_PER_PAGE,
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(1);
      expect(result.normalizedPerPage).toBe(
        EXIF_VALUES_CONSTANTS.PAGINATION.MAX_PER_PAGE,
      );
    });
  });

  describe('validateSearchTerm', () => {
    it('should return true for valid search terms', () => {
      // Arrange & Act & Assert
      expect(service.validateSearchTerm('Canon')).toBe(true);
      expect(service.validateSearchTerm('Nikon D850')).toBe(true);
      expect(service.validateSearchTerm('ISO 100')).toBe(true);
      expect(service.validateSearchTerm('f')).toBe(true);
    });

    it('should return true for undefined search term', () => {
      // Arrange & Act & Assert
      expect(service.validateSearchTerm(undefined)).toBe(true);
    });

    it('should return true for empty string search term', () => {
      // Arrange & Act & Assert
      expect(service.validateSearchTerm('')).toBe(true);
    });

    it('should return false for non-string search terms', () => {
      // Arrange & Act & Assert
      expect(service.validateSearchTerm(123 as any)).toBe(false);
      expect(service.validateSearchTerm({} as any)).toBe(false);
      expect(service.validateSearchTerm([] as any)).toBe(false);
      expect(service.validateSearchTerm(true as any)).toBe(false);
    });

    it('should return false for search terms that are too long', () => {
      // Arrange
      const tooLong = 'a'.repeat(
        EXIF_VALUES_CONSTANTS.VALIDATION.MAX_SEARCH_TERM_LENGTH + 1,
      );

      // Act & Assert
      expect(service.validateSearchTerm(tooLong)).toBe(false);
    });

    it('should return true for search terms at max length boundary', () => {
      // Arrange
      const maxLength = 'a'.repeat(
        EXIF_VALUES_CONSTANTS.VALIDATION.MAX_SEARCH_TERM_LENGTH,
      );

      // Act & Assert
      expect(service.validateSearchTerm(maxLength)).toBe(true);
    });

    it('should return true for search terms with single character', () => {
      // Arrange & Act & Assert
      expect(service.validateSearchTerm('a')).toBe(true);
    });

    it('should handle floating point numbers without converting to integers', () => {
      // Act
      const result = service.validatePaginationParams(2.7, 25.9);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.normalizedPage).toBe(2.7);
      expect(result.normalizedPerPage).toBe(25.9);
    });
  });

  describe('shouldApplyPerformanceLimit', () => {
    it('should return false for counts below threshold', () => {
      // Arrange
      const belowThreshold =
        EXIF_VALUES_CONSTANTS.PERFORMANCE.MAX_VALUES_THRESHOLD - 1;

      // Act & Assert
      expect(service.shouldApplyPerformanceLimit(belowThreshold)).toBe(false);
    });

    it('should return false for counts at threshold', () => {
      // Arrange
      const atThreshold =
        EXIF_VALUES_CONSTANTS.PERFORMANCE.MAX_VALUES_THRESHOLD;

      // Act & Assert
      expect(service.shouldApplyPerformanceLimit(atThreshold)).toBe(false);
    });

    it('should return true for counts above threshold', () => {
      // Arrange
      const aboveThreshold =
        EXIF_VALUES_CONSTANTS.PERFORMANCE.MAX_VALUES_THRESHOLD + 1;

      // Act & Assert
      expect(service.shouldApplyPerformanceLimit(aboveThreshold)).toBe(true);
    });

    it('should handle zero count', () => {
      // Act & Assert
      expect(service.shouldApplyPerformanceLimit(0)).toBe(false);
    });

    it('should handle negative count', () => {
      // Act & Assert
      expect(service.shouldApplyPerformanceLimit(-100)).toBe(false);
    });

    it('should handle very large counts', () => {
      // Act & Assert
      expect(service.shouldApplyPerformanceLimit(Number.MAX_SAFE_INTEGER)).toBe(
        true,
      );
    });
  });
});
