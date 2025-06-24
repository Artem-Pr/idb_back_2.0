import { Injectable, Inject } from '@nestjs/common';
import { PaginationHelpers } from 'src/common/pagination';
import { GetExifValuesInputDto } from '../dto/get-exif-values-input.dto';
import { GetExifValuesOutputDto } from '../dto/get-exif-values-output.dto';
import { GetExifValueRangeInputDto } from '../dto/get-exif-value-range-input.dto';
import { GetExifValueRangeOutputDto } from '../dto/get-exif-value-range-output.dto';
import { IExifValuesRepository } from '../types/exif-values.types';
import { ExifValuesValidationService } from './exif-values-validation.service';

@Injectable()
export class ExifValuesQueryService {
  constructor(
    @Inject('IExifValuesRepository')
    private readonly repository: IExifValuesRepository,
    private readonly validationService: ExifValuesValidationService,
  ) {}

  async getExifValuesPaginated(
    query: GetExifValuesInputDto,
  ): Promise<GetExifValuesOutputDto> {
    const { exifPropertyName, page = 1, perPage = 50 } = query;

    // Validate input
    if (!this.validationService.validateExifPropertyName(exifPropertyName)) {
      throw new Error(`Invalid EXIF property name: ${exifPropertyName}`);
    }

    const paginationValidation =
      this.validationService.validatePaginationParams(page, perPage);

    // Build pagination options
    const paginationOptions = PaginationHelpers.buildPaginationOptions(
      paginationValidation.normalizedPage,
      paginationValidation.normalizedPerPage,
    );

    // Execute query - repository handles deduplication via aggregation pipeline
    const result = await this.repository.findExifValuesPaginated({
      exifPropertyName,
      ...paginationOptions,
    });

    if (!result.success) {
      throw new Error(`Failed to get EXIF values: ${result.error.message}`);
    }

    const { values, totalCount, valueType } = result.data;

    // Map values to simple array - values are guaranteed unique from DB aggregation
    const mappedValues = values.map((item) => item.value);

    // Build pagination metadata
    const paginationMeta = PaginationHelpers.buildPaginationMeta(
      totalCount,
      paginationOptions.page,
      paginationOptions.perPage,
    );

    return {
      values: mappedValues,
      page: paginationMeta.page,
      perPage: paginationMeta.perPage,
      totalCount: paginationMeta.totalCount,
      totalPages: paginationMeta.totalPages,
      exifPropertyName,
      valueType,
    };
  }

  async getExifValueRange(
    query: GetExifValueRangeInputDto,
  ): Promise<GetExifValueRangeOutputDto> {
    const { exifPropertyName } = query;

    // Validate input
    if (!this.validationService.validateExifPropertyName(exifPropertyName)) {
      throw new Error(`Invalid EXIF property name: ${exifPropertyName}`);
    }

    // Execute range query
    const result = await this.repository.findExifValueRange(exifPropertyName);

    if (!result.success) {
      throw new Error(
        `Failed to get EXIF value range: ${result.error.message}`,
      );
    }

    const { minValue, maxValue, count } = result.data;

    return {
      minValue,
      maxValue,
      exifPropertyName,
      count,
    };
  }
}
