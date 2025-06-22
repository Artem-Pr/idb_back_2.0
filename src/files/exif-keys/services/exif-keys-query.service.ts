import { Injectable, Inject } from '@nestjs/common';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import { IExifKeysRepository } from '../repositories/exif-keys.repository';

@Injectable()
export class ExifKeysQueryService {
  constructor(
    @Inject('IExifKeysRepository')
    private readonly exifKeysRepository: IExifKeysRepository,
  ) {}

  async getAllExifKeys(): Promise<ExifKeys[]> {
    return this.exifKeysRepository.findAll();
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
