/**
 * Metrics collection service for EXIF key processing operations
 * Phase 3: Monitoring and metrics for performance tracking
 */

import { Injectable, Inject } from '@nestjs/common';
import { ExifMetricsConfig } from '../config/exif-processing.config';

export interface ProcessingMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  itemsProcessed: number;
  itemsSkipped: number;
  itemsErrored: number;
  memoryUsageMB?: number;
  databaseOperations: number;
  batchesProcessed: number;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  memoryUsageMB: number;
  cpuUsagePercent?: number;
  activeOperations: number;
  totalOperationsCompleted: number;
  averageOperationDurationMs: number;
}

@Injectable()
export class ExifKeysMetricsService {
  private activeMetrics = new Map<string, ProcessingMetrics>();
  private completedMetrics: ProcessingMetrics[] = [];
  private performanceSnapshots: PerformanceSnapshot[] = [];
  private metricsCollectionInterval?: NodeJS.Timeout;

  constructor(
    @Inject('EXIF_METRICS_CONFIG')
    private readonly config: ExifMetricsConfig,
  ) {
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Start tracking a new operation
   */
  startOperation(operationName: string, operationId: string): void {
    if (!this.config.enableMetrics) return;

    const metrics: ProcessingMetrics = {
      operationName,
      startTime: Date.now(),
      itemsProcessed: 0,
      itemsSkipped: 0,
      itemsErrored: 0,
      databaseOperations: 0,
      batchesProcessed: 0,
    };

    this.activeMetrics.set(operationId, metrics);

    if (this.config.enableMemoryTracking) {
      metrics.memoryUsageMB = this.getCurrentMemoryUsageMB();
    }
  }

  /**
   * Update operation metrics
   */
  updateOperation(
    operationId: string,
    updates: Partial<
      Pick<
        ProcessingMetrics,
        | 'itemsProcessed'
        | 'itemsSkipped'
        | 'itemsErrored'
        | 'databaseOperations'
        | 'batchesProcessed'
      >
    >,
  ): void {
    if (!this.config.enableMetrics) return;

    const metrics = this.activeMetrics.get(operationId);
    if (metrics) {
      Object.assign(metrics, updates);
    }
  }

  /**
   * Complete and finalize an operation
   */
  completeOperation(operationId: string): ProcessingMetrics | null {
    if (!this.config.enableMetrics) return null;

    const metrics = this.activeMetrics.get(operationId);
    if (!metrics) return null;

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    this.activeMetrics.delete(operationId);
    this.completedMetrics.push(metrics);

    // Keep only last 100 completed operations to prevent memory leak
    if (this.completedMetrics.length > 100) {
      this.completedMetrics = this.completedMetrics.slice(-100);
    }

    return metrics;
  }

  /**
   * Get current operation metrics
   */
  getOperationMetrics(operationId: string): ProcessingMetrics | null {
    return this.activeMetrics.get(operationId) || null;
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): ProcessingMetrics[] {
    return Array.from(this.activeMetrics.values());
  }

  /**
   * Get completed operations
   */
  getCompletedOperations(limit: number = 50): ProcessingMetrics[] {
    return this.completedMetrics.slice(-limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    activeOperations: number;
    completedOperations: number;
    averageDurationMs: number;
    totalItemsProcessed: number;
    totalItemsErrored: number;
    currentMemoryUsageMB: number;
    recentSnapshots: PerformanceSnapshot[];
  } {
    const completedOps = this.completedMetrics.filter((m) => m.duration);
    const avgDuration =
      completedOps.length > 0
        ? completedOps.reduce((sum, m) => sum + (m.duration || 0), 0) /
          completedOps.length
        : 0;

    const totalProcessed = this.completedMetrics.reduce(
      (sum, m) => sum + m.itemsProcessed,
      0,
    );
    const totalErrored = this.completedMetrics.reduce(
      (sum, m) => sum + m.itemsErrored,
      0,
    );

    return {
      activeOperations: this.activeMetrics.size,
      completedOperations: this.completedMetrics.length,
      averageDurationMs: Math.round(avgDuration),
      totalItemsProcessed: totalProcessed,
      totalItemsErrored: totalErrored,
      currentMemoryUsageMB: this.getCurrentMemoryUsageMB(),
      recentSnapshots: this.performanceSnapshots.slice(-10),
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.activeMetrics.clear();
    this.completedMetrics = [];
    this.performanceSnapshots = [];
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    this.metricsCollectionInterval = setInterval(() => {
      this.collectPerformanceSnapshot();
    }, this.config.metricsCollectionInterval);
  }

  /**
   * Collect performance snapshot
   */
  private collectPerformanceSnapshot(): void {
    if (!this.config.enablePerformanceTracking) return;

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      memoryUsageMB: this.getCurrentMemoryUsageMB(),
      activeOperations: this.activeMetrics.size,
      totalOperationsCompleted: this.completedMetrics.length,
      averageOperationDurationMs: this.calculateAverageOperationDuration(),
    };

    this.performanceSnapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.performanceSnapshots.length > 100) {
      this.performanceSnapshots = this.performanceSnapshots.slice(-100);
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsageMB(): number {
    if (!this.config.enableMemoryTracking) return 0;

    const memUsage = process.memoryUsage();
    return Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
  }

  /**
   * Calculate average operation duration
   */
  private calculateAverageOperationDuration(): number {
    const recentOps = this.completedMetrics
      .slice(-10)
      .filter((m) => m.duration);
    if (recentOps.length === 0) return 0;

    const totalDuration = recentOps.reduce(
      (sum, m) => sum + (m.duration || 0),
      0,
    );
    return Math.round(totalDuration / recentOps.length);
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }
  }
}
