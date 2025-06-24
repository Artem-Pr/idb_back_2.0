import { Injectable } from '@nestjs/common';
import { GetExifValueRangeInputDto } from '../dto/get-exif-value-range-input.dto';
import { GetExifValueRangeOutputDto } from '../dto/get-exif-value-range-output.dto';
import { ExifValuesQueryService } from '../services/exif-values-query.service';
import { ExifValuesMetricsService } from '../services/exif-values-metrics.service';
import { ExifValuesEventEmitterService } from '../services/exif-values-event-emitter.service';
import { ExifValueRangeQueriedEvent } from '../events/exif-value-range-queried.event';

@Injectable()
export class GetExifValueRangeHandler {
  constructor(
    private readonly queryService: ExifValuesQueryService,
    private readonly metricsService: ExifValuesMetricsService,
    private readonly eventEmitterService: ExifValuesEventEmitterService,
  ) {}

  async handle(
    query: GetExifValueRangeInputDto,
  ): Promise<GetExifValueRangeOutputDto> {
    const startTime = Date.now();

    try {
      // Track usage
      this.metricsService.trackUsage(query.exifPropertyName);

      // Execute range query
      const result = await this.queryService.getExifValueRange(query);

      const executionTime = Date.now() - startTime;

      // Track performance metrics
      this.metricsService.trackQueryPerformance({
        exifPropertyName: query.exifPropertyName,
        totalCount: result.count,
        page: 1, // Range queries don't have pagination
        perPage: 1, // Range queries return single result
        executionTimeMs: executionTime,
        timestamp: new Date(),
      });

      // Emit event
      const event = new ExifValueRangeQueriedEvent(
        query.exifPropertyName,
        result.minValue,
        result.maxValue,
        result.count,
        executionTime,
      );
      this.eventEmitterService.emitExifValueRangeQueried(event);

      return result;
    } catch (error) {
      // Track error
      this.metricsService.trackError(
        error instanceof Error ? error : new Error(String(error)),
        query.exifPropertyName,
      );

      throw error;
    }
  }
}
