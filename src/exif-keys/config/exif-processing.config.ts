/**
 * Configuration objects for EXIF key processing operations
 * Phase 3: Replace primitive configuration with structured objects
 */

export interface ExifProcessingConfig {
  batchSize: number;
  enableLogging: boolean;
  enableProgressTracking: boolean;
  maxRetries: number;
  syncStrategy: 'full' | 'incremental';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SyncExifKeysConfig {
  batchSize?: number;
  enableProgressReporting?: boolean;
  clearExistingKeys?: boolean;
  progressReportingInterval?: number;
  enableMetrics?: boolean;
  timeoutMs?: number;
}

export interface ProcessExifKeysConfig {
  enableLogging?: boolean;
  enableValidation?: boolean;
  duplicateHandling: 'skip' | 'overwrite' | 'error';
  maxMediaListSize?: number;
}

export interface ExifValidationConfig {
  enableStrictValidation: boolean;
  allowEmptyMediaList: boolean;
  maxBatchSize: number;
  enableBatchValidation: boolean;
}

export interface ExifMetricsConfig {
  enableMetrics: boolean;
  metricsCollectionInterval: number;
  enablePerformanceTracking: boolean;
  enableMemoryTracking: boolean;
  enableDatabaseMetrics: boolean;
}

export interface ExifEventsConfig {
  enableEvents: boolean;
  enableProcessingEvents: boolean;
  enableSyncEvents: boolean;
  enableProgressEvents: boolean;
  enableErrorEvents: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_EXIF_PROCESSING_CONFIG: ExifProcessingConfig = {
  batchSize: 500,
  enableLogging: true,
  enableProgressTracking: true,
  maxRetries: 3,
  syncStrategy: 'full',
  logLevel: 'info',
};

export const DEFAULT_SYNC_CONFIG: SyncExifKeysConfig = {
  batchSize: 500,
  enableProgressReporting: true,
  clearExistingKeys: true,
  progressReportingInterval: 100,
  enableMetrics: true,
  timeoutMs: 300000, // 5 minutes
};

export const DEFAULT_PROCESS_CONFIG: ProcessExifKeysConfig = {
  enableLogging: true,
  enableValidation: true,
  duplicateHandling: 'skip',
  maxMediaListSize: 1000,
};

export const DEFAULT_VALIDATION_CONFIG: ExifValidationConfig = {
  enableStrictValidation: true,
  allowEmptyMediaList: false,
  maxBatchSize: 10000,
  enableBatchValidation: true,
};

export const DEFAULT_METRICS_CONFIG: ExifMetricsConfig = {
  enableMetrics: true,
  metricsCollectionInterval: 1000,
  enablePerformanceTracking: true,
  enableMemoryTracking: true,
  enableDatabaseMetrics: true,
};

export const DEFAULT_EVENTS_CONFIG: ExifEventsConfig = {
  enableEvents: true,
  enableProcessingEvents: true,
  enableSyncEvents: true,
  enableProgressEvents: true,
  enableErrorEvents: true,
};

/**
 * Configuration factory for creating merged configurations
 */
export class ExifConfigurationFactory {
  static createProcessingConfig(
    override?: Partial<ExifProcessingConfig>,
  ): ExifProcessingConfig {
    return {
      ...DEFAULT_EXIF_PROCESSING_CONFIG,
      ...override,
    };
  }

  static createSyncConfig(
    override?: Partial<SyncExifKeysConfig>,
  ): SyncExifKeysConfig {
    return {
      ...DEFAULT_SYNC_CONFIG,
      ...override,
    };
  }

  static createProcessConfig(
    override?: Partial<ProcessExifKeysConfig>,
  ): ProcessExifKeysConfig {
    return {
      ...DEFAULT_PROCESS_CONFIG,
      ...override,
    };
  }

  static createValidationConfig(
    override?: Partial<ExifValidationConfig>,
  ): ExifValidationConfig {
    return {
      ...DEFAULT_VALIDATION_CONFIG,
      ...override,
    };
  }

  static createMetricsConfig(
    override?: Partial<ExifMetricsConfig>,
  ): ExifMetricsConfig {
    return {
      ...DEFAULT_METRICS_CONFIG,
      ...override,
    };
  }

  static createEventsConfig(
    override?: Partial<ExifEventsConfig>,
  ): ExifEventsConfig {
    return {
      ...DEFAULT_EVENTS_CONFIG,
      ...override,
    };
  }
}
