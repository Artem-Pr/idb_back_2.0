import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExifKeys } from './entities/exif-keys.entity';
import { ExifKeysService } from './exif-keys.service';
import { ExifKeysController } from './exif-keys.controller';
import { ExifKeysFactory } from './factories/exif-keys.factory';
import { ExifTypeDeterminationStrategy } from './strategies/exif-type-determination.strategy';
import { ExifKeysRepository } from './repositories/exif-keys.repository';
import { CustomLogger } from 'src/logger/logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExifKeys])],
  controllers: [ExifKeysController],
  providers: [
    ExifKeysService,
    ExifKeysFactory,
    ExifTypeDeterminationStrategy,
    ExifKeysRepository,
    CustomLogger,
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
    ExifKeysFactory,
    ExifTypeDeterminationStrategy,
    ExifKeysRepository,
  ],
})
export class ExifKeysModule {}
