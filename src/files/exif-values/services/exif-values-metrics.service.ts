import { Injectable } from '@nestjs/common';
import { CustomLogger } from 'src/logger/logger.service';

interface QueryMetrics {
  exifPropertyName: string;
  totalCount: number;
  page: number;
  perPage: number;
  executionTimeMs: number;
  timestamp: Date;
}

@Injectable()
export class ExifValuesMetricsService {
  private readonly logger = new CustomLogger(ExifValuesMetricsService.name);

  /**
   * Track query performance metrics
   */
  trackQueryPerformance(metrics: QueryMetrics): void {
    this.logger.log(
      `EXIF Values Query Performance: ` +
        `property=${metrics.exifPropertyName}, ` +
        `totalCount=${metrics.totalCount}, ` +
        `page=${metrics.page}, ` +
        `perPage=${metrics.perPage}, ` +
        `executionTime=${metrics.executionTimeMs}ms`,
    );

    // Log performance warnings for slow queries
    if (metrics.executionTimeMs > 5000) {
      this.logger.warn(
        `Slow EXIF values query detected: ${metrics.executionTimeMs}ms for property ${metrics.exifPropertyName}`,
      );
    }

    // Log warnings for large result sets
    if (metrics.totalCount > 10000) {
      this.logger.warn(
        `Large result set for EXIF property ${metrics.exifPropertyName}: ${metrics.totalCount} values`,
      );
    }
  }

  /**
   * Track usage statistics
   */
  trackUsage(exifPropertyName: string): void {
    this.logger.log(`EXIF Values Usage: property=${exifPropertyName}`);
  }

  /**
   * Track errors
   */
  trackError(error: Error, exifPropertyName?: string): void {
    this.logger.error(
      `EXIF Values Error: ${error.message}${
        exifPropertyName ? ` for property ${exifPropertyName}` : ''
      }`,
      error.stack,
    );
  }
}
