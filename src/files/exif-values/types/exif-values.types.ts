import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';
import { Result } from 'src/exif-keys/types/result.type';
import { PaginationRequest } from 'src/common/pagination';

export interface ExifValueResult {
  value: string | number;
  count: number;
}

export interface ExifValuesPaginationOptions extends PaginationRequest {
  exifPropertyName: string;
}

export interface ExifValuesQueryResult {
  values: ExifValueResult[];
  totalCount: number;
  valueType: ExifValueType;
}

export interface ExifValueRangeResult {
  minValue: number;
  maxValue: number;
  count: number;
}

export interface IExifValuesRepository {
  findExifValuesPaginated(
    options: ExifValuesPaginationOptions & {
      page: number;
      perPage: number;
      skip: number;
    },
  ): Promise<Result<ExifValuesQueryResult>>;

  findExifValueRange(
    exifPropertyName: string,
  ): Promise<Result<ExifValueRangeResult>>;
}
