import { Injectable } from '@nestjs/common';
import { GetExifValuesInputDto } from '../dto/get-exif-values-input.dto';
import { GetExifValuesOutputDto } from '../dto/get-exif-values-output.dto';
import { ExifValuesQueryService } from '../services/exif-values-query.service';
import { ExifValuesMetricsService } from '../services/exif-values-metrics.service';
import { ExifValuesEventEmitterService } from '../services/exif-values-event-emitter.service';
import { ExifValuesQueriedEvent } from '../events/exif-values-queried.event';

@Injectable()
export class GetExifValuesHandler {
  constructor(
    private readonly queryService: ExifValuesQueryService,
    private readonly metricsService: ExifValuesMetricsService,
    private readonly eventEmitterService: ExifValuesEventEmitterService,
  ) {}

  async handle(query: GetExifValuesInputDto): Promise<GetExifValuesOutputDto> {
    const startTime = Date.now();

    try {
      // Track usage
      this.metricsService.trackUsage(query.exifPropertyName);

      // Execute query
      const result = await this.queryService.getExifValuesPaginated(query);

      const executionTime = Date.now() - startTime;

      // Track performance metrics
      this.metricsService.trackQueryPerformance({
        exifPropertyName: query.exifPropertyName,
        totalCount: result.totalCount,
        page: result.page,
        perPage: result.perPage,
        executionTimeMs: executionTime,
        timestamp: new Date(),
      });

      // Emit event
      const event = new ExifValuesQueriedEvent(
        query.exifPropertyName,
        result.totalCount,
        result.valueType,
        result.page,
        result.perPage,
        executionTime,
      );
      this.eventEmitterService.emitExifValuesQueried(event);

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
