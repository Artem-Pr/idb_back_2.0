import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsMongoId,
  IsNumber,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Media } from '../entities/media.entity';
import {
  IsValidFileName,
  IsValidFilePath,
  IsValidTimeStamp,
} from 'src/common/validators';

class UpdatedFieldsInputDto {
  @IsOptional()
  @IsValidFileName()
  originalName?: Media['originalName'];

  @IsOptional()
  @IsValidFilePath()
  filePath?: Media['filePath'];

  @IsOptional()
  @IsISO8601()
  originalDate?: Media['originalDate'];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  keywords?: Media['keywords'];

  @IsOptional()
  @IsNumber()
  rating?: Media['rating'];

  @IsOptional()
  @IsString()
  description?: Media['description'];

  @IsOptional()
  @IsValidTimeStamp()
  timeStamp?: Media['timeStamp'];

  @IsOptional()
  @IsISO8601()
  changeDate?: Media['changeDate'];
}

export class UpdatedFileInputDto {
  @IsNotEmpty()
  @IsMongoId()
  id: Media['_id'];

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpdatedFieldsInputDto)
  updatedFields: Partial<UpdatedFieldsInputDto>;
}

export class UpdatedFilesInputDto {
  @ArrayNotEmpty({ message: 'The files array must not be empty.' })
  @ValidateNested({ each: true })
  @Type(() => UpdatedFileInputDto)
  files: UpdatedFileInputDto[];
}
