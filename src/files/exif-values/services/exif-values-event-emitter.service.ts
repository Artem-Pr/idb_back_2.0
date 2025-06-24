import { Injectable } from '@nestjs/common';
import { CustomLogger } from 'src/logger/logger.service';
import { ExifValuesQueriedEvent } from '../events/exif-values-queried.event';
import { ExifValueRangeQueriedEvent } from '../events/exif-value-range-queried.event';

@Injectable()
export class ExifValuesEventEmitterService {
  private readonly logger = new CustomLogger(
    ExifValuesEventEmitterService.name,
  );

  /**
   * Emit event when EXIF values are queried (simplified logging implementation)
   */
  emitExifValuesQueried(event: ExifValuesQueriedEvent): void {
    this.logger.log(
      `EXIF Values Queried Event: property=${event.exifPropertyName}, ` +
        `totalCount=${event.totalCount}, valueType=${event.valueType}, ` +
        `page=${event.page}, perPage=${event.perPage}, ` +
        `executionTime=${event.executionTimeMs}ms`,
    );
  }

  emitExifValueRangeQueried(event: ExifValueRangeQueriedEvent): void {
    this.logger.log(
      `EXIF Value Range Queried Event: property=${event.exifPropertyName}, ` +
        `minValue=${event.minValue}, maxValue=${event.maxValue}, ` +
        `count=${event.count}, executionTime=${event.executionTimeMs}ms`,
    );
  }
}
