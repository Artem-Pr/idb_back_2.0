import { Injectable, Inject } from '@nestjs/common';
import { LogMethod } from 'src/logger/logger.decorator';
import { CustomLogger } from 'src/logger/logger.service';
import { SyncExifKeysOutputDto } from '../dto/sync-exif-keys-output.dto';
import { IExifKeysRepository } from '../repositories/exif-keys.repository';
import { MediaDBService } from '../../mediaDB.service';
import { ExifKeysFactory } from '../factories/exif-keys.factory';
import { ExifValueType } from '../entities/exif-keys.entity';
import { ExifDataExtractor } from '../services/exif-data-extractor.service';
import { ExifKeysValidationService } from '../services/exif-keys-validation.service';

export interface SyncExifKeysCommand {
  batchSize?: number;
}

export interface SyncMetrics {
  totalMediaProcessed: number;
  mediaWithoutExif: number;
  batchesProcessed: number;
  totalExifKeysDiscovered: number;
  newExifKeysSaved: number;
}

/**
 * Handles synchronization of EXIF keys from all media entities
 * Uses ExifDataExtractor and ExifKeysValidationService to eliminate code duplication
 */
@Injectable()
export class SyncExifKeysHandler {
  private readonly DEFAULT_BATCH_SIZE = 500;

  constructor(
    @Inject('IExifKeysRepository')
    private readonly exifKeysRepository: IExifKeysRepository,
    private readonly mediaDbService: MediaDBService,
    private readonly exifKeysFactory: ExifKeysFactory,
    private readonly exifDataExtractor: ExifDataExtractor,
    private readonly validationService: ExifKeysValidationService,
    private readonly logger: CustomLogger,
  ) {}

  @LogMethod('syncExifKeysFromAllMedia')
  async handle(
    command: SyncExifKeysCommand = {},
  ): Promise<SyncExifKeysOutputDto> {
    const startTime = Date.now();

    try {
      // Validate input using validation service
      const validationResult =
        this.validationService.validateSyncCommand(command);
      if (!validationResult.isValid) {
        const errorMessage = `Validation failed: ${validationResult.errors.join(', ')}`;
        this.logger.logError({
          message: errorMessage,
          method: 'SyncExifKeysHandler.handle',
        });
        throw new Error(errorMessage);
      }

      const batchSize = command.batchSize ?? this.DEFAULT_BATCH_SIZE;

      const metrics: SyncMetrics = {
        totalMediaProcessed: 0,
        mediaWithoutExif: 0,
        batchesProcessed: 0,
        totalExifKeysDiscovered: 0,
        newExifKeysSaved: 0,
      };

      // Step 1: Clear existing exif keys
      await this.clearExistingKeys();

      // Step 2: Get total count for progress tracking
      const totalCount = await this.mediaDbService.countAllMedia();
      this.logger.log(`Found ${totalCount} media entities to process`);

      if (totalCount === 0) {
        return this.createEmptyResult(startTime);
      }

      // Step 3: Process media in batches
      const allDiscoveredKeys = await this.processBatches(
        totalCount,
        batchSize,
        metrics,
      );

      // Step 4: Save discovered keys
      if (allDiscoveredKeys.size > 0) {
        metrics.newExifKeysSaved =
          await this.saveDiscoveredKeys(allDiscoveredKeys);
      }

      const processingTimeMs = Date.now() - startTime;
      this.logSyncCompletion(metrics, processingTimeMs);

      return {
        totalMediaProcessed: metrics.totalMediaProcessed,
        totalExifKeysDiscovered: allDiscoveredKeys.size,
        newExifKeysSaved: metrics.newExifKeysSaved,
        mediaWithoutExif: metrics.mediaWithoutExif,
        processingTimeMs,
        batchesProcessed: metrics.batchesProcessed,
        collectionCleared: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.logError({
        message: `Sync failed: ${errorMessage}`,
        method: 'SyncExifKeysHandler.handle',
      });

      throw new Error(`Failed to sync exif keys: ${errorMessage}`);
    }
  }

  private async clearExistingKeys(): Promise<void> {
    const clearResult = await this.exifKeysRepository.clearAll();
    if (!clearResult.success) {
      throw new Error(
        `Failed to clear exif keys: ${clearResult.error.message}`,
      );
    }
    this.logger.log('Cleared all existing exif keys');
  }

  private async processBatches(
    totalCount: number,
    batchSize: number,
    metrics: SyncMetrics,
  ): Promise<Map<string, ExifValueType>> {
    const allDiscoveredKeys = new Map<string, ExifValueType>();

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      // Validate batch parameters using validation service
      const batchValidation = this.validationService.validateBatchParameters(
        batchSize,
        offset,
        totalCount,
      );
      if (!batchValidation.isValid) {
        this.logger.logError({
          message: `Batch validation failed: ${batchValidation.errors.join(', ')}`,
          method: 'SyncExifKeysHandler.processBatches',
        });
        throw new Error(
          `Invalid batch parameters: ${batchValidation.errors.join(', ')}`,
        );
      }

      const batch = await this.mediaDbService.findMediaExifBatch(
        batchSize,
        offset,
      );
      metrics.batchesProcessed++;

      this.logBatchProgress(
        metrics.batchesProcessed,
        batch.length,
        offset,
        totalCount,
      );

      // Count media without exif using service method
      metrics.mediaWithoutExif += batch.filter(
        (media) => !this.exifDataExtractor.hasValidExifData(media),
      ).length;

      // Extract keys from this batch using service (eliminates duplicated code)
      const batchKeys =
        this.exifDataExtractor.extractExifKeysFromExifBatch(batch);

      // Merge with all discovered keys
      for (const [key, type] of batchKeys.entries()) {
        allDiscoveredKeys.set(key, type);
      }

      metrics.totalMediaProcessed += batch.length;
    }

    return allDiscoveredKeys;
  }

  private async saveDiscoveredKeys(
    allDiscoveredKeys: Map<string, ExifValueType>,
  ): Promise<number> {
    const keysToSave =
      this.exifKeysFactory.createExifKeysFromMap(allDiscoveredKeys);
    const saveResult = await this.exifKeysRepository.saveKeys(keysToSave);

    if (!saveResult.success) {
      throw new Error(`Failed to save exif keys: ${saveResult.error.message}`);
    }

    this.logger.log(`Successfully saved ${keysToSave.length} exif keys`);
    return keysToSave.length;
  }

  private createEmptyResult(startTime: number): SyncExifKeysOutputDto {
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

  private logBatchProgress(
    batchNumber: number,
    batchLength: number,
    offset: number,
    totalCount: number,
  ): void {
    const progressPercent = Math.round((offset / totalCount) * 100);
    this.logger.log(
      `Processing batch ${batchNumber} (${batchLength} media entities) - ${progressPercent}% complete`,
    );
  }

  private logSyncCompletion(
    metrics: SyncMetrics,
    processingTimeMs: number,
  ): void {
    this.logger.log(
      `Sync completed: ${metrics.totalMediaProcessed} media processed, ` +
        `${metrics.totalExifKeysDiscovered} keys discovered, ` +
        `${metrics.newExifKeysSaved} keys saved in ${processingTimeMs}ms`,
    );
  }
}
