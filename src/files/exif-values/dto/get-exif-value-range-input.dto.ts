import { IsString, Length } from 'class-validator';
import { EXIF_VALUES_CONSTANTS } from '../constants/exif-values.constants';

export class GetExifValueRangeInputDto {
  @IsString()
  @Length(
    EXIF_VALUES_CONSTANTS.VALIDATION.MIN_PROPERTY_NAME_LENGTH,
    EXIF_VALUES_CONSTANTS.VALIDATION.MAX_PROPERTY_NAME_LENGTH,
  )
  exifPropertyName: string;
}
