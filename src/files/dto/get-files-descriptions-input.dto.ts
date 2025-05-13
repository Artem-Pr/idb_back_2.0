import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetFilesDescriptionsInputDto {
  @IsString()
  @IsOptional()
  descriptionPart?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  perPage?: number = 10;
}
