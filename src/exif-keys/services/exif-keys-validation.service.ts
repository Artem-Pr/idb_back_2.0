import { Injectable } from '@nestjs/common';
import { Media } from '../../files/entities/media.entity';
import { ProcessExifKeysCommand } from '../handlers/process-exif-keys.handler';
import { SyncExifKeysCommand } from '../handlers/sync-exif-keys.handler';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Service responsible for validating input data for EXIF key operations
 * Centralizes validation logic used across different handlers
 */
@Injectable()
export class ExifKeysValidationService {
  /**
   * Validates ProcessExifKeysCommand input
   */
  validateProcessCommand(command: ProcessExifKeysCommand): ValidationResult {
    const errors: string[] = [];

    if (!command) {
      errors.push('Command is required');
      return { isValid: false, errors };
    }

    if (!command.mediaList) {
      errors.push('MediaList is required');
      return { isValid: false, errors };
    }

    if (!this.isValidMediaList(command.mediaList)) {
      errors.push('MediaList must be a non-empty array');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates SyncExifKeysCommand input
   */
  validateSyncCommand(command: SyncExifKeysCommand): ValidationResult {
    const errors: string[] = [];

    if (command.batchSize !== undefined) {
      if (!Number.isInteger(command.batchSize) || command.batchSize <= 0) {
        errors.push('BatchSize must be a positive integer');
      }

      if (command.batchSize > 10000) {
        errors.push('BatchSize cannot exceed 10000 for performance reasons');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates media list structure and content
   */
  isValidMediaList(mediaList: Media[]): boolean {
    return Array.isArray(mediaList) && mediaList.length > 0;
  }

  /**
   * Validates individual media entity for EXIF processing
   */
  isValidMediaForProcessing(media: Media): ValidationResult {
    const errors: string[] = [];

    if (!media) {
      errors.push('Media entity is required');
      return { isValid: false, errors };
    }

    if (!media._id) {
      errors.push('Media entity must have an ID');
    }

    if (!media.originalName) {
      errors.push('Media entity must have an originalName');
    }

    if (!media.filePath) {
      errors.push('Media entity must have a filePath');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates batch processing parameters
   */
  validateBatchParameters(
    batchSize: number,
    offset: number,
    totalCount: number,
  ): ValidationResult {
    const errors: string[] = [];

    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      errors.push('BatchSize must be a positive integer');
    }

    if (!Number.isInteger(offset) || offset < 0) {
      errors.push('Offset must be a non-negative integer');
    }

    if (!Number.isInteger(totalCount) || totalCount < 0) {
      errors.push('TotalCount must be a non-negative integer');
    }

    if (offset >= totalCount && totalCount > 0) {
      errors.push('Offset cannot be greater than or equal to totalCount');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates configuration objects
   */
  validateProcessingConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (config && typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return { isValid: false, errors };
    }

    if (config?.batchSize !== undefined) {
      if (!Number.isInteger(config.batchSize) || config.batchSize <= 0) {
        errors.push('Configuration batchSize must be a positive integer');
      }
    }

    if (config?.enableLogging !== undefined) {
      if (typeof config.enableLogging !== 'boolean') {
        errors.push('Configuration enableLogging must be a boolean');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
