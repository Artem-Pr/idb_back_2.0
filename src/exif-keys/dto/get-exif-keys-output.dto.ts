import { ExifKeys } from '../entities/exif-keys.entity';

export interface GetExifKeysOutputDto {
  exifKeys: ExifKeys[];
  page: number;
  perPage: number;
  resultsCount: number;
  totalPages: number;
}
