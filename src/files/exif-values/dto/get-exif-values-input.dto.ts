import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { EXIF_VALUES_CONSTANTS } from '../constants/exif-values.constants';

export class GetExifValuesInputDto {
  @IsString()
  @Length(
    EXIF_VALUES_CONSTANTS.VALIDATION.MIN_PROPERTY_NAME_LENGTH,
    EXIF_VALUES_CONSTANTS.VALIDATION.MAX_PROPERTY_NAME_LENGTH,
  )
  exifPropertyName: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) =>
    value ? Number(value) : EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PAGE,
  )
  page?: number = EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PAGE;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) =>
    value ? Number(value) : EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PER_PAGE,
  )
  perPage?: number = EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PER_PAGE;
}
