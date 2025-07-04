import { Injectable, Inject } from '@nestjs/common';
import { Media } from '../../files/entities/media.entity';
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
  ExifKeyTypeConflictEvent,
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
        await this.exifKeysRepository.findExistingKeys();
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

      // Reconcile new keys with existing ones
      const { keysToCreate, keysToUpdate } = this.reconcileKeys(
        newExifKeysMap,
        existingKeysResult.data,
      );

      if (keysToCreate.length === 0 && keysToUpdate.length === 0) {
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

      let savedKeysCount = 0;
      let updatedKeysCount = 0;

      // Save new keys to the database
      if (keysToCreate.length > 0) {
        const currentMetrics =
          this.metricsService.getOperationMetrics(operationId);
        this.metricsService.updateOperation(operationId, {
          databaseOperations: (currentMetrics?.databaseOperations || 1) + 1,
        });
        const saveResult = await this.exifKeysRepository.saveKeys(keysToCreate);
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
        savedKeysCount = saveResult.data.length;

        const savedKeyNames = keysToCreate.map((key) => key.name);
        this.eventEmitter.emit(
          'exif.keys.saved',
          new ExifKeysSavedEvent(savedKeyNames, savedKeysCount),
        );
      }

      // Update keys with conflicts
      if (keysToUpdate.length > 0) {
        const currentMetrics =
          this.metricsService.getOperationMetrics(operationId);
        this.metricsService.updateOperation(operationId, {
          databaseOperations: (currentMetrics?.databaseOperations || 1) + 1,
        });
        const updateResult =
          await this.exifKeysRepository.updateKeys(keysToUpdate);
        if (!updateResult.success) {
          const error = updateResult.error;

          // Emit error event
          this.eventEmitter.emit(
            'exif.processing.error',
            new ExifKeysProcessingErrorEvent(error, command.mediaList.length),
          );

          this.metricsService.updateOperation(operationId, { itemsErrored: 1 });
          this.metricsService.completeOperation(operationId);

          return failure(error);
        }
        updatedKeysCount = updateResult.data.length;
      }

      // Emit processing completed event
      this.eventEmitter.emit(
        'exif.processing.completed',
        new ExifKeysProcessingCompletedEvent(
          savedKeysCount,
          command.mediaList.length - (savedKeysCount + updatedKeysCount),
          updatedKeysCount,
          0,
        ),
      );

      this.logIfEnabled(
        EXIF_KEYS_CONSTANTS.LOG_MESSAGES.KEYS_SAVED(
          savedKeysCount + updatedKeysCount,
        ),
      );

      // Complete metrics tracking
      const metrics = this.metricsService.completeOperation(operationId);
      if (metrics && this.config.enableLogging) {
        this.logger.log(
          `Processing completed in ${metrics.duration}ms: ${
            savedKeysCount + updatedKeysCount
          } keys processed`,
        );
      }

      return success({ processedCount: savedKeysCount + updatedKeysCount });
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

  private reconcileKeys(
    newExifKeysMap: Map<string, ExifValueType>,
    existingKeysMap: Map<string, ExifKeys>,
  ): { keysToCreate: ExifKeys[]; keysToUpdate: ExifKeys[] } {
    const keysToCreate: ExifKeys[] = [];
    const keysToUpdate: ExifKeys[] = [];

    for (const [keyName, newType] of newExifKeysMap.entries()) {
      const existingKey = existingKeysMap.get(keyName);

      if (!existingKey) {
        // Key is new, add to creation list
        keysToCreate.push(this.exifKeysFactory.create(keyName, newType));
      } else {
        // Key exists, check for type conflict
        if (existingKey.type !== newType) {
          this.logIfEnabled(
            `Type conflict for key "${keyName}": existing type is ${existingKey.type}, new type is ${newType}`,
          );
          // Add to update list
          const updatedKey = this.handleConflict(existingKey, newType);
          keysToUpdate.push(updatedKey);

          // Emit conflict event
          this.eventEmitter.emit(
            'exif.key.type_conflict',
            new ExifKeyTypeConflictEvent(keyName, existingKey.type, newType),
          );
        }
      }
    }

    return { keysToCreate, keysToUpdate };
  }

  private handleConflict(
    existingKey: ExifKeys,
    newType: ExifValueType,
  ): ExifKeys {
    const updatedKey = { ...existingKey };
    updatedKey.type = ExifValueType.NOT_SUPPORTED;

    const existingConflicts = updatedKey.typeConflicts || [existingKey.type];
    if (!existingConflicts.includes(newType)) {
      existingConflicts.push(newType);
    }
    updatedKey.typeConflicts = existingConflicts;

    return updatedKey;
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
