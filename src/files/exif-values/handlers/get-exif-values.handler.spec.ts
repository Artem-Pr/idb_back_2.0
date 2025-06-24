import { Test, TestingModule } from '@nestjs/testing';
import { GetExifValuesHandler } from './get-exif-values.handler';
import { ExifValuesQueryService } from '../services/exif-values-query.service';
import { ExifValuesMetricsService } from '../services/exif-values-metrics.service';
import { ExifValuesEventEmitterService } from '../services/exif-values-event-emitter.service';
import { GetExifValuesInputDto } from '../dto/get-exif-values-input.dto';
import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';
import { ExifValuesQueriedEvent } from '../events/exif-values-queried.event';

describe('GetExifValuesHandler', () => {
  let handler: GetExifValuesHandler;
  let mockQueryService: jest.Mocked<ExifValuesQueryService>;
  let mockMetricsService: jest.Mocked<ExifValuesMetricsService>;
  let mockEventEmitterService: jest.Mocked<ExifValuesEventEmitterService>;

  const mockQueryResult = {
    values: ['Canon', 'Nikon', 'Sony'],
    page: 1,
    perPage: 50,
    totalCount: 3,
    totalPages: 1,
    exifPropertyName: 'Make',
    valueType: ExifValueType.STRING,
  };

  beforeEach(async () => {
    const mockQuery = {
      getExifValuesPaginated: jest.fn(),
    };

    const mockMetrics = {
      trackQueryPerformance: jest.fn(),
      trackUsage: jest.fn(),
      trackError: jest.fn(),
    };

    const mockEventEmitter = {
      emitExifValuesQueried: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetExifValuesHandler,
        {
          provide: ExifValuesQueryService,
          useValue: mockQuery,
        },
        {
          provide: ExifValuesMetricsService,
          useValue: mockMetrics,
        },
        {
          provide: ExifValuesEventEmitterService,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    handler = module.get<GetExifValuesHandler>(GetExifValuesHandler);
    mockQueryService = module.get(ExifValuesQueryService);
    mockMetricsService = module.get(ExifValuesMetricsService);
    mockEventEmitterService = module.get(ExifValuesEventEmitterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    const validInput: GetExifValuesInputDto = {
      exifPropertyName: 'Make',
      page: 1,
      perPage: 50,
    };

    it('should handle EXIF values query successfully', async () => {
      // Arrange
      mockQueryService.getExifValuesPaginated.mockResolvedValue(
        mockQueryResult,
      );

      // Act
      const result = await handler.handle(validInput);

      // Assert
      expect(result).toEqual(mockQueryResult);
      expect(mockQueryService.getExifValuesPaginated).toHaveBeenCalledWith(
        validInput,
      );
      expect(mockMetricsService.trackUsage).toHaveBeenCalledWith('Make');
      expect(mockMetricsService.trackQueryPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          exifPropertyName: 'Make',
          totalCount: 3,
          page: 1,
          perPage: 50,
          executionTimeMs: expect.any(Number),
          timestamp: expect.any(Date),
        }),
      );
      expect(
        mockEventEmitterService.emitExifValuesQueried,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          exifPropertyName: 'Make',
          totalCount: 3,
          valueType: ExifValueType.STRING,
          page: 1,
          perPage: 50,
          executionTimeMs: expect.any(Number),
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should handle different property names', async () => {
      // Arrange
      const isoInput = { ...validInput, exifPropertyName: 'ISO' };
      const isoResult = {
        ...mockQueryResult,
        exifPropertyName: 'ISO',
        valueType: ExifValueType.NUMBER,
      };
      mockQueryService.getExifValuesPaginated.mockResolvedValue(isoResult);

      // Act
      const result = await handler.handle(isoInput);

      // Assert
      expect(result.exifPropertyName).toBe('ISO');
      expect(result.valueType).toBe(ExifValueType.NUMBER);
      expect(mockMetricsService.trackUsage).toHaveBeenCalledWith('ISO');
      expect(mockMetricsService.trackQueryPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          exifPropertyName: 'ISO',
          totalCount: 3,
        }),
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      const emptyResult = {
        ...mockQueryResult,
        values: [],
        totalCount: 0,
        totalPages: 0,
      };
      mockQueryService.getExifValuesPaginated.mockResolvedValue(emptyResult);

      // Act
      const result = await handler.handle(validInput);

      // Assert
      expect(result.values).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(mockMetricsService.trackQueryPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          exifPropertyName: 'Make',
          totalCount: 0,
        }),
      );
      expect(
        mockEventEmitterService.emitExifValuesQueried,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          exifPropertyName: 'Make',
          totalCount: 0,
          page: 1,
          perPage: 50,
          valueType: ExifValueType.STRING,
        }),
      );
    });

    it('should handle large pagination correctly', async () => {
      // Arrange
      const largePageInput = {
        exifPropertyName: 'Make',
        page: 10,
        perPage: 100,
      };
      const largePageResult = {
        ...mockQueryResult,
        page: 10,
        perPage: 100,
        totalCount: 1500,
        totalPages: 15,
      };
      mockQueryService.getExifValuesPaginated.mockResolvedValue(
        largePageResult,
      );

      // Act
      const result = await handler.handle(largePageInput);

      // Assert
      expect(result.page).toBe(10);
      expect(result.perPage).toBe(100);
      expect(result.totalCount).toBe(1500);
      expect(mockMetricsService.trackQueryPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          exifPropertyName: 'Make',
          totalCount: 1500,
          page: 10,
          perPage: 100,
        }),
      );
    });

    it('should handle service errors properly', async () => {
      // Arrange
      const serviceError = new Error('Database connection failed');
      mockQueryService.getExifValuesPaginated.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(handler.handle(validInput)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockMetricsService.trackUsage).toHaveBeenCalledWith('Make');
      expect(mockMetricsService.trackError).toHaveBeenCalledWith(
        serviceError,
        'Make',
      );
      expect(mockMetricsService.trackQueryPerformance).not.toHaveBeenCalled();
    });

    it('should handle different value types correctly', async () => {
      // Arrange
      const testCases = [
        { valueType: ExifValueType.STRING, property: 'Make' },
        { valueType: ExifValueType.NUMBER, property: 'ISO' },
        { valueType: ExifValueType.STRING_ARRAY, property: 'Keywords' },
      ];

      for (const testCase of testCases) {
        mockQueryService.getExifValuesPaginated.mockResolvedValue({
          ...mockQueryResult,
          exifPropertyName: testCase.property,
          valueType: testCase.valueType,
        });

        // Act
        const result = await handler.handle({
          exifPropertyName: testCase.property,
        });

        // Assert
        expect(result.valueType).toBe(testCase.valueType);
        expect(
          mockEventEmitterService.emitExifValuesQueried,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            valueType: testCase.valueType,
            exifPropertyName: testCase.property,
          }),
        );
      }
    });

    it('should emit events with correct structure', async () => {
      // Arrange
      mockQueryService.getExifValuesPaginated.mockResolvedValue(
        mockQueryResult,
      );

      // Act
      await handler.handle(validInput);

      // Assert
      expect(
        mockEventEmitterService.emitExifValuesQueried,
      ).toHaveBeenCalledWith(expect.any(ExifValuesQueriedEvent));

      // Verify the event structure
      const emittedEvent = (
        mockEventEmitterService.emitExifValuesQueried as jest.Mock
      ).mock.calls[0][0];
      expect(emittedEvent.exifPropertyName).toBe('Make');
      expect(emittedEvent.totalCount).toBe(3);
      expect(emittedEvent.valueType).toBe(ExifValueType.STRING);
      expect(emittedEvent.page).toBe(1);
      expect(emittedEvent.perPage).toBe(50);
      expect(typeof emittedEvent.executionTimeMs).toBe('number');
      expect(emittedEvent.timestamp).toBeInstanceOf(Date);
    });

    it('should record metrics in correct order', async () => {
      // Arrange
      mockQueryService.getExifValuesPaginated.mockResolvedValue(
        mockQueryResult,
      );

      // Act
      await handler.handle(validInput);

      // Assert
      expect(mockMetricsService.trackUsage).toHaveBeenCalledWith('Make');
      expect(mockMetricsService.trackQueryPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          exifPropertyName: 'Make',
          totalCount: 3,
        }),
      );
    });

    it('should handle validation errors from service', async () => {
      // Arrange
      const validationError = new Error(
        'Invalid EXIF property name: InvalidProperty',
      );
      mockQueryService.getExifValuesPaginated.mockRejectedValue(
        validationError,
      );

      // Act & Assert
      await expect(
        handler.handle({ exifPropertyName: 'InvalidProperty' }),
      ).rejects.toThrow('Invalid EXIF property name: InvalidProperty');

      expect(mockMetricsService.trackError).toHaveBeenCalledWith(
        validationError,
        'InvalidProperty',
      );
    });
  });
});
