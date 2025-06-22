import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExifKeys } from './entities/exif-keys.entity';
import { ExifKeysService } from './exif-keys.service';
import { ExifKeysController } from './exif-keys.controller';
import { ExifKeysFactory } from './factories/exif-keys.factory';
import { ExifTypeDeterminationStrategy } from './strategies/exif-type-determination.strategy';
import { ExifKeysRepository } from './repositories/exif-keys.repository';
import { CustomLogger } from 'src/logger/logger.service';
import { MediaDBService } from '../mediaDB.service';
import { Media } from '../entities/media.entity';
import { MediaTemp } from '../entities/media-temp.entity';

// Import new handlers and services for Command/Handler pattern
import { ProcessExifKeysHandler } from './handlers/process-exif-keys.handler';
import { SyncExifKeysHandler } from './handlers/sync-exif-keys.handler';
import { ExifKeysQueryService } from './services/exif-keys-query.service';
import { ExifDataExtractor } from './services/exif-data-extractor.service';
import { ExifKeysValidationService } from './services/exif-keys-validation.service';
// Phase 3: Import new services for configuration, events, and metrics
import { ExifKeysMetricsService } from './services/exif-keys-metrics.service';
import { ExifKeysEventEmitterService } from './services/exif-keys-event-emitter.service';
import { ExifConfigurationFactory } from './config/exif-processing.config';

@Module({
  imports: [TypeOrmModule.forFeature([ExifKeys, Media, MediaTemp])],
  controllers: [ExifKeysController],
  providers: [
    // Original service (for backward compatibility during migration)
    ExifKeysService,

    // New Command/Handler pattern components
    ProcessExifKeysHandler,
    SyncExifKeysHandler,
    ExifKeysQueryService,

    // Service Composition components (Phase 2)
    ExifDataExtractor,
    ExifKeysValidationService,

    // Phase 3 components
    ExifKeysMetricsService,
    ExifKeysEventEmitterService,

    // Existing providers
    ExifKeysFactory,
    ExifTypeDeterminationStrategy,
    ExifKeysRepository,
    CustomLogger,
    MediaDBService,
    {
      provide: 'IExifKeysRepository',
      useClass: ExifKeysRepository,
    },
    // Phase 3: Configuration Objects
    {
      provide: 'PROCESS_EXIF_KEYS_CONFIG',
      useValue: ExifConfigurationFactory.createProcessConfig(),
    },
    {
      provide: 'SYNC_EXIF_KEYS_CONFIG',
      useValue: ExifConfigurationFactory.createSyncConfig(),
    },
    {
      provide: 'EXIF_VALIDATION_CONFIG',
      useValue: ExifConfigurationFactory.createValidationConfig(),
    },
    {
      provide: 'EXIF_METRICS_CONFIG',
      useValue: ExifConfigurationFactory.createMetricsConfig(),
    },
    {
      provide: 'EXIF_EVENTS_CONFIG',
      useValue: ExifConfigurationFactory.createEventsConfig(),
    },
    // Legacy config for backward compatibility
    {
      provide: 'EXIF_KEY_PROCESSING_CONFIG',
      useValue: {
        batchSize: 100,
        enableLogging: true,
      },
    },
  ],
  exports: [
    ExifKeysService,
    ProcessExifKeysHandler,
    SyncExifKeysHandler,
    ExifKeysQueryService,
    ExifDataExtractor,
    ExifKeysValidationService,
    ExifKeysMetricsService,
    ExifKeysEventEmitterService,
    ExifKeysFactory,
    ExifTypeDeterminationStrategy,
    ExifKeysRepository,
  ],
})
export class ExifKeysModule {}
