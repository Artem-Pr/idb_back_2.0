import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { SupportedMimetypes } from 'src/common/types';
import { IsValidMimeType } from 'src/common/validators/isValidMimeType.validator';
import { IsValidSorting } from 'src/common/validators/isValidSorting.validator';
import { Type } from 'class-transformer';
import type { Sort, SortingFieldListInputDto } from '../types';

export class GetFilesFiltersInputDto {
  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsBoolean()
  includeAllSearchTags?: boolean;

  @IsOptional()
  @IsArray({ message: 'searchTags must be an array' })
  @IsNotEmpty({ each: true, message: 'searchTags must not be empty' })
  searchTags?: string[];

  @IsOptional()
  @IsArray({ message: 'excludeTags must be an array' })
  @IsNotEmpty({ each: true, message: 'excludeTags must not be empty' })
  excludeTags?: string[];

  @IsOptional()
  @IsArray({ message: 'mimeTypes must be an array' })
  @IsValidMimeType({ each: true })
  mimetypes?: SupportedMimetypes['allFiles'][];

  @IsOptional()
  @IsArray({ message: 'tags must be an array' })
  @IsISO8601({ strict: true, strictSeparator: true }, { each: true })
  dateRange?: [string, string];

  @IsOptional()
  @IsBoolean()
  anyDescription?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class GetFilesSortInputDto {
  @IsDefined({ message: 'sorting must be defined' })
  @IsValidSorting()
  sort?: Partial<Record<SortingFieldListInputDto, Sort>>;

  @IsOptional()
  @IsBoolean()
  randomSort?: boolean;
}

export class GetFilesFoldersDto {
  @IsOptional()
  @IsString()
  folderPath?: string;

  @IsOptional()
  @IsBoolean()
  showSubfolders?: boolean;

  @IsOptional()
  @IsBoolean()
  isDynamicFolders?: boolean;
}

export class GetFilesPaginationInputDto {
  @IsDefined()
  @IsNumber()
  page: number;

  @IsDefined()
  @IsNumber()
  perPage: number;
}

export class GetFilesInputDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => GetFilesFiltersInputDto)
  filters: GetFilesFiltersInputDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => GetFilesSortInputDto)
  sorting: GetFilesSortInputDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => GetFilesFoldersDto)
  folders: GetFilesFoldersDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => GetFilesPaginationInputDto)
  pagination: GetFilesPaginationInputDto;
}
