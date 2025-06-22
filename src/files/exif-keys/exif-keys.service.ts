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
import { MediaDBService } from '../mediaDB.service';
import { SyncExifKeysOutputDto } from './dto/sync-exif-keys-output.dto';

export interface IExifKeysService {
  processAndSaveExifKeys(mediaList: Media[]): Promise<Result<number>>;
  getAllExifKeys(): Promise<ExifKeys[]>;
  getExifKeysByType(type: ExifValueType): Promise<ExifKeys[]>;
  syncExifKeysFromAllMedia(): Promise<SyncExifKeysOutputDto>;
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
    private readonly mediaDbService: MediaDBService,
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
   * Syncs EXIF keys from all media entities in the database
   * Clears existing keys and rebuilds the collection from scratch
   */
  @LogMethod('syncExifKeysFromAllMedia')
  async syncExifKeysFromAllMedia(): Promise<SyncExifKeysOutputDto> {
    const startTime = Date.now();
    let totalMediaProcessed = 0;
    let mediaWithoutExif = 0;
    let batchesProcessed = 0;
    let totalExifKeysDiscovered = 0;
    let newExifKeysSaved = 0;
    const batchSize = 500;

    try {
      // Step 1: Clear existing exif keys
      const clearResult = await this.exifKeysRepository.clearAll();
      if (!clearResult.success) {
        throw new Error(
          `Failed to clear exif keys: ${clearResult.error.message}`,
        );
      }

      this.logger.log('Cleared all existing exif keys');

      // Step 2: Get total count for progress tracking
      const totalCount = await this.mediaDbService.countAllMedia();
      this.logger.log(`Found ${totalCount} media entities to process`);

      if (totalCount === 0) {
        return {
          totalMediaProcessed: 0,
          totalExifKeysDiscovered: 0,
          newExifKeysSaved: 0,
          mediaWithoutExif: 0,
          processingTimeMs: Date.now() - startTime,
          batchesProcessed: 0,
          collectionCleared: true,
        };
      }

      // Step 3: Process media in batches using efficient field selection
      const allDiscoveredKeys = new Map<string, ExifValueType>();

      for (let offset = 0; offset < totalCount; offset += batchSize) {
        const batch = await this.mediaDbService.findMediaExifBatch(
          batchSize,
          offset,
        );
        batchesProcessed++;

        this.logger.log(
          `Processing batch ${batchesProcessed} (${batch.length} media entities) - ${Math.round((offset / totalCount) * 100)}% complete`,
        );

        // Count media without exif in this batch
        const batchMediaWithoutExif = batch.filter(
          (media) => !this.hasValidExifData(media),
        ).length;
        mediaWithoutExif += batchMediaWithoutExif;

        // Extract keys from this batch using specialized method
        const batchKeys = this.extractExifKeysFromExifBatch(batch);

        // Merge with all discovered keys
        for (const [key, type] of batchKeys.entries()) {
          allDiscoveredKeys.set(key, type);
        }

        totalMediaProcessed += batch.length;
      }

      totalExifKeysDiscovered = allDiscoveredKeys.size;

      // Step 4: Create and save all discovered keys
      if (totalExifKeysDiscovered > 0) {
        const keysToSave =
          this.exifKeysFactory.createExifKeysFromMap(allDiscoveredKeys);
        const saveResult = await this.exifKeysRepository.saveKeys(keysToSave);

        if (!saveResult.success) {
          throw new Error(
            `Failed to save exif keys: ${saveResult.error.message}`,
          );
        }

        newExifKeysSaved = keysToSave.length;
        this.logger.log(`Successfully saved ${newExifKeysSaved} exif keys`);
      }

      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Sync completed: ${totalMediaProcessed} media processed, ${totalExifKeysDiscovered} keys discovered, ${newExifKeysSaved} keys saved in ${processingTimeMs}ms`,
      );

      return {
        totalMediaProcessed,
        totalExifKeysDiscovered,
        newExifKeysSaved,
        mediaWithoutExif,
        processingTimeMs,
        batchesProcessed,
        collectionCleared: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.logError({
        message: `Sync failed: ${errorMessage}`,
        method: 'syncExifKeysFromAllMedia',
      });

      throw new Error(`Failed to sync exif keys: ${errorMessage}`);
    }
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
  private hasValidExifData(
    media: Media | Pick<Media, '_id' | 'exif'>,
  ): boolean {
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

  /**
   * Extracts EXIF keys from batch of media exif data
   */
  private extractExifKeysFromExifBatch(
    batchData: Pick<Media, '_id' | 'exif'>[],
  ): Map<string, ExifValueType> {
    const exifKeysMap = new Map<string, ExifValueType>();

    for (const item of batchData) {
      if (!this.hasValidExifData(item)) {
        continue;
      }

      const exifData: Tags = item.exif;
      this.processExifData(exifData, exifKeysMap);
    }

    return exifKeysMap;
  }
}
