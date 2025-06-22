import { Injectable, Inject } from '@nestjs/common';
import { Media } from '../../entities/media.entity';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import { Result, success, failure } from '../types/result.type';
import { IExifKeysRepository } from '../repositories/exif-keys.repository';
import { ExifKeysFactory } from '../factories/exif-keys.factory';
import { CustomLogger } from 'src/logger/logger.service';
import { EXIF_KEYS_CONSTANTS } from '../constants/exif-keys.constants';
import { LogMethod } from 'src/logger/logger.decorator';
import { ExifDataExtractor } from '../services/exif-data-extractor.service';

export interface ProcessExifKeysCommand {
  mediaList: Media[];
}

export interface ProcessExifKeysResult {
  processedCount: number;
}

export interface ExifKeyProcessingConfig {
  enableLogging?: boolean;
}

/**
 * Processes and saves new EXIF keys to the database
 * Uses ExifDataExtractor service to eliminate code duplication
 */
@Injectable()
export class ProcessExifKeysHandler {
  constructor(
    @Inject('IExifKeysRepository')
    private readonly exifKeysRepository: IExifKeysRepository,
    private readonly exifKeysFactory: ExifKeysFactory,
    private readonly logger: CustomLogger,
    private readonly exifDataExtractor: ExifDataExtractor,
    @Inject('EXIF_KEY_PROCESSING_CONFIG')
    private readonly config: ExifKeyProcessingConfig = {},
  ) {}

  @LogMethod('processAndSaveExifKeys')
  async handle(
    command: ProcessExifKeysCommand,
  ): Promise<Result<ProcessExifKeysResult>> {
    try {
      // Validate input
      if (!this.isValidMediaList(command.mediaList)) {
        return success({ processedCount: 0 });
      }

      // Extract EXIF keys using service (eliminates duplicated code)
      const newExifKeysMap =
        this.exifDataExtractor.extractExifKeysFromMediaList(command.mediaList);

      if (newExifKeysMap.size === 0) {
        this.logIfEnabled(EXIF_KEYS_CONSTANTS.LOG_MESSAGES.NO_EXIF_KEYS_FOUND);
        return success({ processedCount: 0 });
      }

      // Get existing keys from database
      const existingKeysResult =
        await this.exifKeysRepository.findExistingKeyNames();
      if (!existingKeysResult.success) {
        return failure(existingKeysResult.error);
      }

      // Filter out keys that already exist
      const keysToSave = this.filterNewKeys(
        newExifKeysMap,
        existingKeysResult.data,
      );

      if (keysToSave.length === 0) {
        this.logIfEnabled(EXIF_KEYS_CONSTANTS.LOG_MESSAGES.NO_NEW_KEYS_TO_SAVE);
        return success({ processedCount: 0 });
      }

      // Save new keys to database
      const saveResult = await this.exifKeysRepository.saveKeys(keysToSave);
      if (!saveResult.success) {
        return failure(saveResult.error);
      }

      this.logIfEnabled(
        EXIF_KEYS_CONSTANTS.LOG_MESSAGES.KEYS_SAVED(keysToSave.length),
      );

      return success({ processedCount: keysToSave.length });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.logError({
        message:
          EXIF_KEYS_CONSTANTS.LOG_MESSAGES.PROCESSING_ERROR(errorMessage),
        method: 'ProcessExifKeysHandler.handle',
      });

      return failure(new Error(errorMessage));
    }
  }

  /**
   * Validates input media list
   */
  private isValidMediaList(mediaList: Media[]): boolean {
    return Array.isArray(mediaList) && mediaList.length > 0;
  }

  /**
   * Filters out existing keys and returns only new ones
   */
  private filterNewKeys(
    newExifKeysMap: Map<string, ExifValueType>,
    existingKeys: Set<string>,
  ): ExifKeys[] {
    const filteredKeysMap = new Map<string, ExifValueType>();

    for (const [keyName, keyType] of newExifKeysMap.entries()) {
      if (!existingKeys.has(keyName)) {
        filteredKeysMap.set(keyName, keyType);
      }
    }

    return this.exifKeysFactory.createExifKeysFromMap(filteredKeysMap);
  }

  /**
   * Logs message if logging is enabled
   */
  private logIfEnabled(message: string): void {
    if (this.config.enableLogging !== false) {
      this.logger.log(message);
    }
  }
}
