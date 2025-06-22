// Main service and module
export { ExifKeysService, IExifKeysService } from './exif-keys.service';
export { ExifKeysModule } from './exif-keys.module';

// Command/Handler Pattern Components
export {
  ProcessExifKeysHandler,
  ProcessExifKeysCommand,
  ProcessExifKeysResult,
} from './handlers/process-exif-keys.handler';
export {
  SyncExifKeysHandler,
  SyncExifKeysCommand,
  SyncMetrics,
} from './handlers/sync-exif-keys.handler';
export { ExifKeysQueryService } from './services/exif-keys-query.service';

// Service Composition Components (Phase 2)
export { ExifDataExtractor } from './services/exif-data-extractor.service';
export {
  ExifKeysValidationService,
  ValidationResult,
} from './services/exif-keys-validation.service';

// Phase 3: Configuration, Events, and Metrics
export { ExifKeysMetricsService } from './services/exif-keys-metrics.service';
export { ExifKeysEventEmitterService } from './services/exif-keys-event-emitter.service';
export * from './config/exif-processing.config';
export * from './events/exif-keys-processed.event';
export * from './events/exif-keys-sync.event';

// Repositories
export {
  ExifKeysRepository,
  IExifKeysRepository,
} from './repositories/exif-keys.repository';

// Entities
export { ExifKeys, ExifValueType } from './entities/exif-keys.entity';

// Strategies
export {
  ExifTypeDeterminationStrategy,
  IExifTypeDeterminationStrategy,
} from './strategies/exif-type-determination.strategy';

// Factories
export { ExifKeysFactory } from './factories/exif-keys.factory';

// Types
export {
  Result,
  Success,
  Failure,
  success,
  failure,
} from './types/result.type';

// Constants
export { EXIF_KEYS_CONSTANTS } from './constants/exif-keys.constants';
