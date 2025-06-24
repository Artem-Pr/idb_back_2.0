import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from '../entities/media.entity';
import { ExifKeysModule } from 'src/exif-keys';
import { GetExifValuesHandler } from './handlers/get-exif-values.handler';
import { GetExifValueRangeHandler } from './handlers/get-exif-value-range.handler';
import { ExifValuesRepository } from './repositories/exif-values.repository';
import { ExifValuesQueryService } from './services/exif-values-query.service';
import { ExifValuesValidationService } from './services/exif-values-validation.service';
import { ExifValuesMetricsService } from './services/exif-values-metrics.service';
import { ExifValuesEventEmitterService } from './services/exif-values-event-emitter.service';

@Module({
  imports: [TypeOrmModule.forFeature([Media]), ExifKeysModule],
  providers: [
    GetExifValuesHandler,
    GetExifValueRangeHandler,
    {
      provide: 'IExifValuesRepository',
      useClass: ExifValuesRepository,
    },
    ExifValuesQueryService,
    ExifValuesValidationService,
    ExifValuesMetricsService,
    ExifValuesEventEmitterService,
  ],
  exports: [GetExifValuesHandler, GetExifValueRangeHandler],
})
export class ExifValuesModule {}
