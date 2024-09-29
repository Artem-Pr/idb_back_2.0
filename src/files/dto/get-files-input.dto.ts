import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsISO8601,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { SupportedMimetypes } from 'src/common/types';
import { IsValidMimeType } from 'src/common/validators/isValidMimeType.validator';
import { IsValidSorting } from 'src/common/validators/isValidSorting.validator';
import type { SortingObject } from '../types';
import { Type } from 'class-transformer';

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
  sort: SortingObject;

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

export class GetFilesSettingsInputDto {
  @IsOptional()
  @IsString()
  comparisonFolder?: string;

  @IsOptional()
  dontSavePreview?: boolean; // TODO remove that field and related logic

  @IsOptional()
  @IsBoolean()
  isFullSizePreview?: boolean;

  @IsOptional()
  @IsBoolean()
  isNameComparison?: boolean;
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
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => GetFilesFoldersDto)
  folders: GetFilesFoldersDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => GetFilesPaginationInputDto)
  pagination: GetFilesPaginationInputDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => GetFilesSettingsInputDto)
  settings: GetFilesSettingsInputDto;
}
