import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { SupportedMimetypes } from 'src/common/types';
import { IsValidMimeType } from 'src/common/validators';
import { WebSocketActions } from '../constants';

export class FilesDataWSInputDto {
  @IsOptional()
  @IsString()
  folderPath?: string;

  @IsOptional()
  @IsArray()
  @IsValidMimeType({ each: true })
  mimeTypes?: SupportedMimetypes['allFiles'][];
}

export class FilesDataWSActionInputDto {
  @IsDefined()
  @IsString()
  action: WebSocketActions;

  @IsOptional()
  @ValidateNested()
  @Type(() => FilesDataWSInputDto)
  data?: FilesDataWSInputDto;
}
