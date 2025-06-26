import { Injectable, Inject } from '@nestjs/common';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import {
  IExifKeysRepository,
  PaginationOptions,
} from '../repositories/exif-keys.repository';
import { GetExifKeysInputDto } from '../dto/get-exif-keys-input.dto';
import { GetExifKeysOutputDto } from '../dto/get-exif-keys-output.dto';

@Injectable()
export class ExifKeysQueryService {
  constructor(
    @Inject('IExifKeysRepository')
    private readonly exifKeysRepository: IExifKeysRepository,
  ) {}

  async getAllExifKeys(): Promise<ExifKeys[]> {
    return this.exifKeysRepository.findAll();
  }

  async getExifKeysPaginated(
    query: GetExifKeysInputDto,
  ): Promise<GetExifKeysOutputDto> {
    const { page = 1, perPage = 50, type, searchTerm } = query;

    const options: PaginationOptions = {
      page,
      perPage,
      type,
      searchTerm,
    };

    const result = await this.exifKeysRepository.findPaginated(options);

    if (!result.success) {
      throw new Error(
        `Failed to get paginated EXIF keys: ${result.error.message}`,
      );
    }

    const { items, totalCount, totalPages } = result.data;

    return {
      exifKeys: items,
      page,
      perPage,
      resultsCount: totalCount,
      totalPages,
    };
  }

  async getExifKeysByType(type: ExifValueType): Promise<ExifKeys[]> {
    return this.exifKeysRepository.findByType(type);
  }

  async getExifKeysByNames(names: string[]): Promise<ExifKeys[]> {
    return this.exifKeysRepository.findByNames(names);
  }

  async getExistingKeyNames(): Promise<Set<string>> {
    const result = await this.exifKeysRepository.findExistingKeyNames();
    if (!result.success) {
      throw new Error(
        `Failed to get existing key names: ${result.error.message}`,
      );
    }
    return result.data;
  }
}
