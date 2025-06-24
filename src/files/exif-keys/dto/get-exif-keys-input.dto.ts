import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ExifValueType } from '../entities/exif-keys.entity';

export class GetExifKeysInputDto {
  @IsString()
  @IsOptional()
  type?: ExifValueType;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 50))
  perPage?: number = 50;
}
