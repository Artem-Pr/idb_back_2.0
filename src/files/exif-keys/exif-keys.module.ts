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

    // Service Composition components
    ExifDataExtractor,

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
    ExifKeysFactory,
    ExifTypeDeterminationStrategy,
    ExifKeysRepository,
  ],
})
export class ExifKeysModule {}
