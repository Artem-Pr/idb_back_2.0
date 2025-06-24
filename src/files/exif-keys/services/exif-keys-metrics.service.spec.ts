import { Test, TestingModule } from '@nestjs/testing';
import { ExifKeysMetricsService } from './exif-keys-metrics.service';
import { ExifMetricsConfig } from '../config/exif-processing.config';

describe('ExifKeysMetricsService', () => {
  let service: ExifKeysMetricsService;
  let mockConfig: ExifMetricsConfig;

  beforeEach(async () => {
    mockConfig = {
      enableMetrics: true,
      metricsCollectionInterval: 1000,
      enablePerformanceTracking: true,
      enableMemoryTracking: true,
      enableDatabaseMetrics: true,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExifKeysMetricsService,
        {
          provide: 'EXIF_METRICS_CONFIG',
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<ExifKeysMetricsService>(ExifKeysMetricsService);
  });

  afterEach(() => {
    // Clean up the service's interval timer to prevent Jest from hanging
    service.onModuleDestroy();
    service.resetMetrics();
    jest.clearAllMocks();
  });

  describe('startOperation', () => {
    it('should start tracking operation when metrics enabled', () => {
      // Arrange
      const operationName = 'TestOperation';
      const operationId = 'test-123';

      // Act
      service.startOperation(operationName, operationId);

      // Assert
      const metrics = service.getOperationMetrics(operationId);
      expect(metrics).toBeDefined();
      expect(metrics?.operationName).toBe(operationName);
      expect(metrics?.startTime).toBeDefined();
      expect(metrics?.itemsProcessed).toBe(0);
      expect(metrics?.itemsSkipped).toBe(0);
      expect(metrics?.itemsErrored).toBe(0);
      expect(metrics?.databaseOperations).toBe(0);
      expect(metrics?.batchesProcessed).toBe(0);
    });

    it('should not start tracking when metrics disabled', () => {
      // Arrange
      const disabledConfig = { ...mockConfig, enableMetrics: false };
      const testService = new ExifKeysMetricsService(disabledConfig);
      const operationName = 'TestOperation';
      const operationId = 'test-123';

      // Act
      testService.startOperation(operationName, operationId);

      // Assert
      const metrics = testService.getOperationMetrics(operationId);
      expect(metrics).toBeNull();

      // Cleanup
      testService.onModuleDestroy();
    });

    it('should include memory usage when memory tracking enabled', () => {
      // Arrange
      const operationName = 'TestOperation';
      const operationId = 'test-123';

      // Act
      service.startOperation(operationName, operationId);

      // Assert
      const metrics = service.getOperationMetrics(operationId);
      expect(metrics?.memoryUsageMB).toBeDefined();
      expect(typeof metrics?.memoryUsageMB).toBe('number');
    });

    it('should not include memory usage when memory tracking disabled', () => {
      // Arrange
      const noMemoryConfig = { ...mockConfig, enableMemoryTracking: false };
      const testService = new ExifKeysMetricsService(noMemoryConfig);
      const operationName = 'TestOperation';
      const operationId = 'test-123';

      // Act
      testService.startOperation(operationName, operationId);

      // Assert
      const metrics = testService.getOperationMetrics(operationId);
      expect(metrics?.memoryUsageMB).toBeUndefined();

      // Cleanup
      testService.onModuleDestroy();
    });
  });

  describe('updateOperation', () => {
    it('should update operation metrics when metrics enabled', () => {
      // Arrange
      const operationId = 'test-123';
      service.startOperation('TestOperation', operationId);

      // Act
      service.updateOperation(operationId, {
        itemsProcessed: 10,
        itemsSkipped: 2,
        itemsErrored: 1,
        databaseOperations: 3,
        batchesProcessed: 1,
      });

      // Assert
      const metrics = service.getOperationMetrics(operationId);
      expect(metrics?.itemsProcessed).toBe(10);
      expect(metrics?.itemsSkipped).toBe(2);
      expect(metrics?.itemsErrored).toBe(1);
      expect(metrics?.databaseOperations).toBe(3);
      expect(metrics?.batchesProcessed).toBe(1);
    });

    it('should not update when metrics disabled', () => {
      // Arrange
      const disabledConfig = { ...mockConfig, enableMetrics: false };
      const testService = new ExifKeysMetricsService(disabledConfig);
      const operationId = 'test-123';

      // Act
      testService.updateOperation(operationId, { itemsProcessed: 10 });

      // Assert
      const metrics = testService.getOperationMetrics(operationId);
      expect(metrics).toBeNull();

      // Cleanup
      testService.onModuleDestroy();
    });

    it('should handle non-existent operation gracefully', () => {
      // Act & Assert
      expect(() => {
        service.updateOperation('non-existent', { itemsProcessed: 10 });
      }).not.toThrow();
    });

    it('should allow partial updates', () => {
      // Arrange
      const operationId = 'test-123';
      service.startOperation('TestOperation', operationId);

      // Act
      service.updateOperation(operationId, { itemsProcessed: 5 });
      service.updateOperation(operationId, { itemsSkipped: 2 });

      // Assert
      const metrics = service.getOperationMetrics(operationId);
      expect(metrics?.itemsProcessed).toBe(5);
      expect(metrics?.itemsSkipped).toBe(2);
      expect(metrics?.itemsErrored).toBe(0);
    });
  });

  describe('completeOperation', () => {
    it('should complete and finalize operation when metrics enabled', () => {
      // Arrange
      const operationId = 'test-123';
      service.startOperation('TestOperation', operationId);

      // Act
      const result = service.completeOperation(operationId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.endTime).toBeDefined();
      expect(result?.duration).toBeDefined();
      expect(result?.duration).toBeGreaterThanOrEqual(0);

      // Operation should be moved to completed
      const activeMetrics = service.getOperationMetrics(operationId);
      expect(activeMetrics).toBeNull();

      const completedOps = service.getCompletedOperations(1);
      expect(completedOps).toHaveLength(1);
      expect(completedOps[0].operationName).toBe('TestOperation');
    });

    it('should return null when metrics disabled', () => {
      // Arrange
      const disabledConfig = { ...mockConfig, enableMetrics: false };
      const testService = new ExifKeysMetricsService(disabledConfig);
      const operationId = 'test-123';

      // Act
      const result = testService.completeOperation(operationId);

      // Assert
      expect(result).toBeNull();

      // Cleanup
      testService.onModuleDestroy();
    });

    it('should return null for non-existent operation', () => {
      // Act
      const result = service.completeOperation('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should limit completed operations to 100', () => {
      // Arrange
      const operations = [];
      for (let i = 0; i < 105; i++) {
        const operationId = `test-${i}`;
        service.startOperation('TestOperation', operationId);
        service.completeOperation(operationId);
        operations.push(operationId);
      }

      // Act
      const completedOps = service.getCompletedOperations(200);

      // Assert
      expect(completedOps).toHaveLength(100);
      // Should keep the last 100 operations
      expect(completedOps[0].operationName).toBe('TestOperation');
    });
  });

  describe('getActiveOperations', () => {
    it('should return all active operations', () => {
      // Arrange
      service.startOperation('Operation1', 'op1');
      service.startOperation('Operation2', 'op2');
      service.startOperation('Operation3', 'op3');

      // Act
      const activeOps = service.getActiveOperations();

      // Assert
      expect(activeOps).toHaveLength(3);
      expect(activeOps.map((op) => op.operationName)).toContain('Operation1');
      expect(activeOps.map((op) => op.operationName)).toContain('Operation2');
      expect(activeOps.map((op) => op.operationName)).toContain('Operation3');
    });

    it('should return empty array when no active operations', () => {
      // Act
      const activeOps = service.getActiveOperations();

      // Assert
      expect(activeOps).toEqual([]);
    });

    it('should not include completed operations', () => {
      // Arrange
      service.startOperation('Operation1', 'op1');
      service.startOperation('Operation2', 'op2');
      service.completeOperation('op1');

      // Act
      const activeOps = service.getActiveOperations();

      // Assert
      expect(activeOps).toHaveLength(1);
      expect(activeOps[0].operationName).toBe('Operation2');
    });
  });

  describe('getCompletedOperations', () => {
    it('should return completed operations with limit', () => {
      // Arrange
      for (let i = 0; i < 5; i++) {
        const operationId = `test-${i}`;
        service.startOperation('TestOperation', operationId);
        service.completeOperation(operationId);
      }

      // Act
      const completedOps = service.getCompletedOperations(3);

      // Assert
      expect(completedOps).toHaveLength(3);
      expect(completedOps.every((op) => op.endTime !== undefined)).toBe(true);
    });

    it('should return all completed operations when limit exceeds count', () => {
      // Arrange
      service.startOperation('TestOperation', 'test-1');
      service.completeOperation('test-1');

      // Act
      const completedOps = service.getCompletedOperations(10);

      // Assert
      expect(completedOps).toHaveLength(1);
    });

    it('should return empty array when no completed operations', () => {
      // Act
      const completedOps = service.getCompletedOperations(10);

      // Assert
      expect(completedOps).toEqual([]);
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return comprehensive performance summary', () => {
      // Arrange
      service.startOperation('Operation1', 'op1');
      service.startOperation('Operation2', 'op2');
      service.updateOperation('op1', { itemsProcessed: 10, itemsErrored: 1 });
      service.completeOperation('op1');

      // Act
      const summary = service.getPerformanceSummary();

      // Assert
      expect(summary.activeOperations).toBe(1);
      expect(summary.completedOperations).toBe(1);
      expect(summary.totalItemsProcessed).toBe(10);
      expect(summary.totalItemsErrored).toBe(1);
      expect(summary.averageDurationMs).toBeGreaterThanOrEqual(0);
      expect(summary.currentMemoryUsageMB).toBeDefined();
      expect(Array.isArray(summary.recentSnapshots)).toBe(true);
    });

    it('should handle zero operations gracefully', () => {
      // Act
      const summary = service.getPerformanceSummary();

      // Assert
      expect(summary.activeOperations).toBe(0);
      expect(summary.completedOperations).toBe(0);
      expect(summary.totalItemsProcessed).toBe(0);
      expect(summary.totalItemsErrored).toBe(0);
      expect(summary.averageDurationMs).toBe(0);
    });
  });

  describe('resetMetrics', () => {
    it('should clear all metrics', () => {
      // Arrange
      service.startOperation('Operation1', 'op1');
      service.startOperation('Operation2', 'op2');
      service.completeOperation('op1');

      // Act
      service.resetMetrics();

      // Assert
      const activeOps = service.getActiveOperations();
      const completedOps = service.getCompletedOperations(10);
      const summary = service.getPerformanceSummary();

      expect(activeOps).toEqual([]);
      expect(completedOps).toEqual([]);
      expect(summary.activeOperations).toBe(0);
      expect(summary.completedOperations).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle multiple operations with same name', () => {
      // Arrange
      service.startOperation('SameName', 'op1');
      service.startOperation('SameName', 'op2');

      // Act
      const activeOps = service.getActiveOperations();

      // Assert
      expect(activeOps).toHaveLength(2);
      expect(activeOps.every((op) => op.operationName === 'SameName')).toBe(
        true,
      );
    });

    it('should handle rapid operation creation and completion', () => {
      // Arrange & Act
      for (let i = 0; i < 10; i++) {
        const operationId = `rapid-${i}`;
        service.startOperation('RapidOperation', operationId);
        service.updateOperation(operationId, { itemsProcessed: i });
        service.completeOperation(operationId);
      }

      // Assert
      const completedOps = service.getCompletedOperations(20);
      expect(completedOps).toHaveLength(10);
      expect(completedOps.every((op) => op.duration !== undefined)).toBe(true);
    });

    it('should handle concurrent operations correctly', () => {
      // Arrange
      const operationIds = ['concurrent1', 'concurrent2', 'concurrent3'];

      // Act
      operationIds.forEach((id) => {
        service.startOperation('ConcurrentOp', id);
        service.updateOperation(id, { itemsProcessed: 5 });
      });

      // Complete only some operations
      service.completeOperation('concurrent1');
      service.completeOperation('concurrent3');

      // Assert
      const activeOps = service.getActiveOperations();
      const completedOps = service.getCompletedOperations(10);

      expect(activeOps).toHaveLength(1);
      expect(completedOps).toHaveLength(2);
      expect(activeOps[0].operationName).toBe('ConcurrentOp');
    });
  });
});
