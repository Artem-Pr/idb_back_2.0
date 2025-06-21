import { Injectable, Inject } from '@nestjs/common';
import type { Tags } from 'exiftool-vendored';
import { ExifKeys, ExifValueType } from './entities/exif-keys.entity';
import { Media } from '../entities/media.entity';
import { CustomLogger } from 'src/logger/logger.service';
import { LogMethod } from 'src/logger/logger.decorator';
import {
  IExifTypeDeterminationStrategy,
  ExifTypeDeterminationStrategy,
} from './strategies/exif-type-determination.strategy';
import { ExifKeysFactory } from './factories/exif-keys.factory';
import { Result, success, failure } from './types/result.type';
import { EXIF_KEYS_CONSTANTS } from './constants/exif-keys.constants';
import { IExifKeysRepository } from './repositories/exif-keys.repository';

export interface IExifKeysService {
  processAndSaveExifKeys(mediaList: Media[]): Promise<Result<number>>;
  getAllExifKeys(): Promise<ExifKeys[]>;
  getExifKeysByType(type: ExifValueType): Promise<ExifKeys[]>;
}

export interface ExifKeyProcessingConfig {
  batchSize?: number;
  enableLogging?: boolean;
}

@Injectable()
export class ExifKeysService implements IExifKeysService {
  constructor(
    @Inject('IExifKeysRepository')
    private readonly exifKeysRepository: IExifKeysRepository,
    @Inject(ExifTypeDeterminationStrategy)
    private readonly typeDeterminationStrategy: IExifTypeDeterminationStrategy,
    private readonly exifKeysFactory: ExifKeysFactory,
    private readonly logger: CustomLogger,
    @Inject('EXIF_KEY_PROCESSING_CONFIG')
    private readonly config: ExifKeyProcessingConfig = {},
  ) {}

  /**
   * Processes and saves new EXIF keys to the database
   */
  @LogMethod('processAndSaveExifKeys')
  async processAndSaveExifKeys(mediaList: Media[]): Promise<Result<number>> {
    try {
      // Validate input
      if (!this.isValidMediaList(mediaList)) {
        return success(0);
      }

      // Extract EXIF keys from the media list
      const newExifKeysMap = this.extractExifKeysFromMediaList(mediaList);

      if (newExifKeysMap.size === 0) {
        this.logIfEnabled(EXIF_KEYS_CONSTANTS.LOG_MESSAGES.NO_EXIF_KEYS_FOUND);
        return success(0);
      }

      // Get existing keys from database via repository
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
        return success(0);
      }

      // Save new keys to database via repository
      const saveResult = await this.exifKeysRepository.saveKeys(keysToSave);
      if (!saveResult.success) {
        return failure(saveResult.error);
      }

      this.logIfEnabled(
        EXIF_KEYS_CONSTANTS.LOG_MESSAGES.KEYS_SAVED(keysToSave.length),
      );

      return success(keysToSave.length);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.logError({
        message:
          EXIF_KEYS_CONSTANTS.LOG_MESSAGES.PROCESSING_ERROR(errorMessage),
        method: 'processAndSaveExifKeys',
      });

      return failure(new Error(errorMessage));
    }
  }

  /**
   * Gets all EXIF keys from the database
   */
  async getAllExifKeys(): Promise<ExifKeys[]> {
    return this.exifKeysRepository.findAll();
  }

  /**
   * Gets EXIF keys filtered by type
   */
  async getExifKeysByType(type: ExifValueType): Promise<ExifKeys[]> {
    return this.exifKeysRepository.findByType(type);
  }

  /**
   * Validates input media list
   */
  private isValidMediaList(mediaList: Media[]): boolean {
    return Array.isArray(mediaList) && mediaList.length > 0;
  }

  /**
   * Extracts EXIF keys from media list and returns unique keys with their types
   */
  private extractExifKeysFromMediaList(
    mediaList: Media[],
  ): Map<string, ExifValueType> {
    const exifKeysMap = new Map<string, ExifValueType>();

    for (const media of mediaList) {
      if (!this.hasValidExifData(media)) {
        continue;
      }

      const exifData: Tags = media.exif;
      this.processExifData(exifData, exifKeysMap);
    }

    return exifKeysMap;
  }

  /**
   * Checks if media has valid EXIF data
   */
  private hasValidExifData(media: Media): boolean {
    return media.exif && typeof media.exif === 'object';
  }

  /**
   * Processes EXIF data and updates the keys map
   */
  private processExifData(
    exifData: Tags,
    exifKeysMap: Map<string, ExifValueType>,
  ): void {
    for (const [key, value] of Object.entries(exifData)) {
      if (!exifKeysMap.has(key)) {
        const valueType = this.typeDeterminationStrategy.determineType(value);
        exifKeysMap.set(key, valueType);
      }
    }
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
