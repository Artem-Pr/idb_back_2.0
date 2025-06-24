import { Injectable } from '@nestjs/common';
import { EXIF_VALUES_CONSTANTS } from '../constants/exif-values.constants';

@Injectable()
export class ExifValuesValidationService {
  /**
   * Validates EXIF property name
   */
  validateExifPropertyName(propertyName: string): boolean {
    if (!propertyName || typeof propertyName !== 'string') {
      return false;
    }

    const { MIN_PROPERTY_NAME_LENGTH, MAX_PROPERTY_NAME_LENGTH } =
      EXIF_VALUES_CONSTANTS.VALIDATION;

    return (
      propertyName.length >= MIN_PROPERTY_NAME_LENGTH &&
      propertyName.length <= MAX_PROPERTY_NAME_LENGTH
    );
  }

  /**
   * Validates pagination parameters
   */
  validatePaginationParams(
    page?: number,
    perPage?: number,
  ): {
    isValid: boolean;
    normalizedPage: number;
    normalizedPerPage: number;
  } {
    const { DEFAULT_PAGE, DEFAULT_PER_PAGE, MAX_PER_PAGE } =
      EXIF_VALUES_CONSTANTS.PAGINATION;

    const normalizedPage = Math.max(1, page || DEFAULT_PAGE);
    const normalizedPerPage = Math.min(
      Math.max(1, perPage || DEFAULT_PER_PAGE),
      MAX_PER_PAGE,
    );

    return {
      isValid: true,
      normalizedPage,
      normalizedPerPage,
    };
  }

  /**
   * Validates if the total count exceeds threshold for performance
   */
  shouldApplyPerformanceLimit(totalCount: number): boolean {
    return totalCount > EXIF_VALUES_CONSTANTS.PERFORMANCE.MAX_VALUES_THRESHOLD;
  }
}
