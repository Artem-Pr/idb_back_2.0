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
import { ExifKeysValidationService } from '../services/exif-keys-validation.service';
import { ExifKeysMetricsService } from '../services/exif-keys-metrics.service';
import { ExifKeysEventEmitterService } from '../services/exif-keys-event-emitter.service';
import { ProcessExifKeysConfig } from '../config/exif-processing.config';
import {
  ExifKeysProcessingStartedEvent,
  ExifKeysProcessingCompletedEvent,
  ExifKeysProcessingErrorEvent,
  ExifKeysSavedEvent,
} from '../events/exif-keys-processed.event';

export interface ProcessExifKeysCommand {
  mediaList: Media[];
}

export interface ProcessExifKeysResult {
  processedCount: number;
}

/**
 * Processes and saves new EXIF keys to the database
 * Phase 3: Enhanced with configuration, events, and metrics
 * Uses ExifDataExtractor and ExifKeysValidationService to eliminate code duplication
 */
@Injectable()
export class ProcessExifKeysHandler {
  constructor(
    @Inject('IExifKeysRepository')
    private readonly exifKeysRepository: IExifKeysRepository,
    private readonly exifKeysFactory: ExifKeysFactory,
    private readonly logger: CustomLogger,
    private readonly exifDataExtractor: ExifDataExtractor,
    private readonly validationService: ExifKeysValidationService,
    private readonly metricsService: ExifKeysMetricsService,
    private readonly eventEmitter: ExifKeysEventEmitterService,
    @Inject('PROCESS_EXIF_KEYS_CONFIG')
    private readonly config: ProcessExifKeysConfig,
  ) {}

  @LogMethod('processAndSaveExifKeys')
  async handle(
    command: ProcessExifKeysCommand,
  ): Promise<Result<ProcessExifKeysResult>> {
    const operationId = `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Start metrics tracking
      this.metricsService.startOperation('ProcessExifKeys', operationId);

      // Emit processing started event
      this.eventEmitter.emit(
        'exif.processing.started',
        new ExifKeysProcessingStartedEvent(command.mediaList.length),
      );

      // Validate input using validation service
      const validationResult =
        this.validationService.validateProcessCommand(command);
      if (!validationResult.isValid) {
        const errorMessage = `Validation failed: ${validationResult.errors.join(', ')}`;
        const error = new Error(errorMessage);

        // Emit error event
        this.eventEmitter.emit(
          'exif.processing.error',
          new ExifKeysProcessingErrorEvent(error, 0),
        );

        this.logger.logError({
          message: errorMessage,
          method: 'ProcessExifKeysHandler.handle',
        });

        this.metricsService.updateOperation(operationId, { itemsErrored: 1 });
        this.metricsService.completeOperation(operationId);

        return failure(error);
      }

      // Update metrics: items to process
      this.metricsService.updateOperation(operationId, {
        itemsProcessed: command.mediaList.length,
      });

      // Extract EXIF keys using service (eliminates duplicated code)
      const newExifKeysMap =
        this.exifDataExtractor.extractExifKeysFromMediaList(command.mediaList);

      if (newExifKeysMap.size === 0) {
        this.logIfEnabled(EXIF_KEYS_CONSTANTS.LOG_MESSAGES.NO_EXIF_KEYS_FOUND);

        // Emit completion event
        this.eventEmitter.emit(
          'exif.processing.completed',
          new ExifKeysProcessingCompletedEvent(
            0,
            command.mediaList.length,
            0,
            0,
          ),
        );

        this.metricsService.updateOperation(operationId, {
          itemsSkipped: command.mediaList.length,
        });
        this.metricsService.completeOperation(operationId);

        return success({ processedCount: 0 });
      }

      // Get existing keys from database
      this.metricsService.updateOperation(operationId, {
        databaseOperations: 1,
      });
      const existingKeysResult =
        await this.exifKeysRepository.findExistingKeyNames();
      if (!existingKeysResult.success) {
        const error = existingKeysResult.error;

        // Emit error event
        this.eventEmitter.emit(
          'exif.processing.error',
          new ExifKeysProcessingErrorEvent(error, command.mediaList.length),
        );

        this.metricsService.updateOperation(operationId, { itemsErrored: 1 });
        this.metricsService.completeOperation(operationId);

        return failure(error);
      }

      // Filter out keys that already exist
      const keysToSave = this.filterNewKeys(
        newExifKeysMap,
        existingKeysResult.data,
      );

      if (keysToSave.length === 0) {
        this.logIfEnabled(EXIF_KEYS_CONSTANTS.LOG_MESSAGES.NO_NEW_KEYS_TO_SAVE);

        // Emit completion event
        this.eventEmitter.emit(
          'exif.processing.completed',
          new ExifKeysProcessingCompletedEvent(
            0,
            command.mediaList.length,
            0,
            0,
          ),
        );

        this.metricsService.updateOperation(operationId, {
          itemsSkipped: newExifKeysMap.size,
        });
        this.metricsService.completeOperation(operationId);

        return success({ processedCount: 0 });
      }

      // Save new keys to database
      this.metricsService.updateOperation(operationId, {
        databaseOperations: 2,
      });
      const saveResult = await this.exifKeysRepository.saveKeys(keysToSave);
      if (!saveResult.success) {
        const error = saveResult.error;

        // Emit error event
        this.eventEmitter.emit(
          'exif.processing.error',
          new ExifKeysProcessingErrorEvent(error, command.mediaList.length),
        );

        this.metricsService.updateOperation(operationId, { itemsErrored: 1 });
        this.metricsService.completeOperation(operationId);

        return failure(error);
      }

      // Emit keys saved event
      const savedKeyNames = keysToSave.map((key) => key.name);
      this.eventEmitter.emit(
        'exif.keys.saved',
        new ExifKeysSavedEvent(savedKeyNames, keysToSave.length),
      );

      // Emit processing completed event
      this.eventEmitter.emit(
        'exif.processing.completed',
        new ExifKeysProcessingCompletedEvent(
          keysToSave.length,
          command.mediaList.length - keysToSave.length,
          0,
          0,
        ),
      );

      this.logIfEnabled(
        EXIF_KEYS_CONSTANTS.LOG_MESSAGES.KEYS_SAVED(keysToSave.length),
      );

      // Complete metrics tracking
      const metrics = this.metricsService.completeOperation(operationId);
      if (metrics && this.config.enableLogging) {
        this.logger.log(
          `Processing completed in ${metrics.duration}ms: ${keysToSave.length} keys saved`,
        );
      }

      return success({ processedCount: keysToSave.length });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const processError = new Error(errorMessage);

      // Emit error event
      this.eventEmitter.emit(
        'exif.processing.error',
        new ExifKeysProcessingErrorEvent(
          processError,
          command.mediaList.length,
        ),
      );

      this.logger.logError({
        message:
          EXIF_KEYS_CONSTANTS.LOG_MESSAGES.PROCESSING_ERROR(errorMessage),
        method: 'ProcessExifKeysHandler.handle',
      });

      // Update metrics and complete
      this.metricsService.updateOperation(operationId, { itemsErrored: 1 });
      this.metricsService.completeOperation(operationId);

      return failure(processError);
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
