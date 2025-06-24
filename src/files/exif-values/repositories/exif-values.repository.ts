import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Media } from 'src/files/entities/media.entity';
import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';
import { Result, success, failure } from 'src/exif-keys/types/result.type';
import { ExifTypeDeterminationStrategy } from 'src/exif-keys/strategies/exif-type-determination.strategy';
import {
  IExifValuesRepository,
  ExifValuesPaginationOptions,
  ExifValuesQueryResult,
  ExifValueResult,
  ExifValueRangeResult,
} from '../types/exif-values.types';
import { ExifValuesConfigFactory } from '../config/exif-values.config';

@Injectable()
export class ExifValuesRepository implements IExifValuesRepository {
  private readonly config = ExifValuesConfigFactory.create();

  constructor(
    @InjectRepository(Media)
    private readonly repository: MongoRepository<Media>,
    private readonly typeDeterminationStrategy: ExifTypeDeterminationStrategy,
  ) {}

  async findExifValuesPaginated(
    options: ExifValuesPaginationOptions & {
      page: number;
      perPage: number;
      skip: number;
    },
  ): Promise<Result<ExifValuesQueryResult>> {
    try {
      const { exifPropertyName, skip, perPage } = options;
      const exifFieldPath = `${this.config.database.exifFieldPrefix}${exifPropertyName}`;

      // Build aggregation pipeline with efficient array flattening for deduplication
      const pipeline = [
        // Match documents that have the specified EXIF property
        {
          $match: {
            [exifFieldPath]: { $exists: true, $ne: null },
          },
        },
        // Handle both arrays and non-arrays efficiently
        // For arrays: $unwind will create separate documents for each element
        // For non-arrays: preserveNullAndEmptyArrays keeps the original document
        {
          $unwind: {
            path: `$${exifFieldPath}`,
            preserveNullAndEmptyArrays: true,
          },
        },
        // Group by individual values to ensure uniqueness and count occurrences
        {
          $group: {
            _id: `$${exifFieldPath}`,
            count: { $sum: 1 },
          },
        },
        // Use $facet for efficient pagination
        {
          $facet: {
            values: [
              { $sort: { _id: 1 } }, // Sort by value for consistent results
              { $skip: skip },
              { $limit: perPage },
              {
                $project: {
                  value: '$_id',
                  count: 1,
                  _id: 0,
                },
              },
            ],
            totalCount: [{ $count: 'count' }],
            sampleValue: [{ $limit: 1 }, { $project: { value: '$_id' } }],
          },
        },
      ];

      // Execute aggregation with timeout
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Query timeout')),
          this.config.performance.queryTimeoutMs,
        );
      });

      try {
        const result = await Promise.race([
          this.repository.aggregate(pipeline).toArray(),
          timeoutPromise,
        ]);

        return this.processPaginationResult(result);
      } finally {
        // Always clear timeout, regardless of which promise won
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async findExifValueRange(
    exifPropertyName: string,
  ): Promise<Result<ExifValueRangeResult>> {
    try {
      const exifFieldPath = `${this.config.database.exifFieldPrefix}${exifPropertyName}`;

      // Build aggregation pipeline for range query
      const pipeline = [
        // Match documents that have the specified EXIF property and is numeric
        {
          $match: {
            [exifFieldPath]: {
              $exists: true,
              $ne: null,
              $type: 'number',
            },
          },
        },
        // Group to get min, max, and count
        {
          $group: {
            _id: null,
            minValue: { $min: `$${exifFieldPath}` },
            maxValue: { $max: `$${exifFieldPath}` },
            count: { $sum: 1 },
          },
        },
      ];

      // Execute aggregation with timeout
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Query timeout')),
          this.config.performance.queryTimeoutMs,
        );
      });

      try {
        const result = await Promise.race([
          this.repository.aggregate(pipeline).toArray(),
          timeoutPromise,
        ]);

        return this.processRangeResult(result, exifPropertyName);
      } finally {
        // Always clear timeout, regardless of which promise won
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private processPaginationResult(
    result: any[],
  ): Result<ExifValuesQueryResult> {
    if (!result || result.length === 0) {
      return success({
        values: [],
        totalCount: 0,
        valueType: ExifValueType.STRING,
      });
    }

    const aggregationResult = result[0] as {
      values: { value: string | number; count: number }[];
      totalCount: { count: number }[];
      sampleValue: { value: string | number }[];
    };

    const { values, totalCount, sampleValue } = aggregationResult;
    const count = totalCount[0]?.count || 0;

    // Use existing strategy to determine value type from sample
    const valueType = this.typeDeterminationStrategy.determineType(
      sampleValue[0]?.value || values[0]?.value,
    );

    // Map results to proper format - values are guaranteed unique by aggregation
    const mappedValues: ExifValueResult[] = values.map((item) => ({
      value: item.value,
      count: item.count,
    }));

    return success({
      values: mappedValues,
      totalCount: count,
      valueType,
    });
  }

  private processRangeResult(
    result: any[],
    exifPropertyName: string,
  ): Result<ExifValueRangeResult> {
    if (!result || result.length === 0) {
      return failure(
        new Error(
          `No numeric values found for EXIF property: ${exifPropertyName}`,
        ),
      );
    }

    const aggregationResult = result[0] as {
      minValue: number;
      maxValue: number;
      count: number;
    };

    const { minValue, maxValue, count } = aggregationResult;

    // Validate that we got valid numeric values
    if (minValue === null || maxValue === null || count === 0) {
      return failure(
        new Error(
          `No valid numeric values found for EXIF property: ${exifPropertyName}`,
        ),
      );
    }

    return success({
      minValue,
      maxValue,
      count,
    });
  }
}
