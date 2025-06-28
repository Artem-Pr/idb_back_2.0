import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';
import { Type } from 'class-transformer';

export class ExifFilterConditionDto {
  @IsOptional()
  @IsBoolean()
  @ValidateIf(
    (o, v) =>
      v !== undefined &&
      o.values === undefined &&
      o.textValues === undefined &&
      o.rangeValues === undefined,
  )
  isExist?: boolean;

  @IsOptional()
  @IsArray()
  @IsNotEmpty({ each: true })
  @ValidateIf(
    (o, v) =>
      v !== undefined &&
      o.isExist === undefined &&
      o.textValues === undefined &&
      o.rangeValues === undefined,
  )
  values?: (string | number)[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ValidateIf(
    (o, v) =>
      v !== undefined &&
      o.isExist === undefined &&
      o.values === undefined &&
      o.rangeValues === undefined,
  )
  textValues?: string[];

  @IsOptional()
  @IsBoolean()
  rangeMode?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.rangeMode === true)
  @IsDefined()
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  rangeValues?: [number, number];
}

export class GetFilesExifFilterDto {
  @IsString()
  @IsNotEmpty()
  propertyName: string;

  @IsEnum(ExifValueType)
  propertyType: ExifValueType;

  @IsDefined()
  @ValidateNested()
  @Type(() => ExifFilterConditionDto)
  condition: ExifFilterConditionDto;
}
