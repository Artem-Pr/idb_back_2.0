import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';

export interface GetExifValuesOutputDto {
  values: (string | number)[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  exifPropertyName: string;
  valueType: ExifValueType;
}
