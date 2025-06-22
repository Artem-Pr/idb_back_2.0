import { Injectable, Inject } from '@nestjs/common';
import type { Tags } from 'exiftool-vendored';
import { Media } from '../../entities/media.entity';
import { ExifValueType } from '../entities/exif-keys.entity';
import {
  IExifTypeDeterminationStrategy,
  ExifTypeDeterminationStrategy,
} from '../strategies/exif-type-determination.strategy';

@Injectable()
export class ExifDataExtractor {
  constructor(
    @Inject(ExifTypeDeterminationStrategy)
    private readonly typeDeterminationStrategy: IExifTypeDeterminationStrategy,
  ) {}

  /**
   * Extracts EXIF keys from media list and returns unique keys with their types
   */
  extractExifKeysFromMediaList(mediaList: Media[]): Map<string, ExifValueType> {
    const exifKeysMap = new Map<string, ExifValueType>();

    for (const media of mediaList) {
      if (!this.hasValidExifData(media)) {
        continue;
      }

      const exifData: Tags = media.exif;
      this.processExifData(exifData, exifKeysMap);
    }

    return exifKeysMap;
  }

  /**
   * Extracts EXIF keys from batch of media exif data
   */
  extractExifKeysFromExifBatch(
    batchData: Pick<Media, '_id' | 'exif'>[],
  ): Map<string, ExifValueType> {
    const exifKeysMap = new Map<string, ExifValueType>();

    for (const item of batchData) {
      if (!this.hasValidExifData(item)) {
        continue;
      }

      const exifData: Tags = item.exif;
      this.processExifData(exifData, exifKeysMap);
    }

    return exifKeysMap;
  }

  /**
   * Checks if media has valid EXIF data
   * Shared by both ProcessExifKeysHandler and SyncExifKeysHandler
   */
  hasValidExifData(media: Media | Pick<Media, '_id' | 'exif'>): boolean {
    return media.exif && typeof media.exif === 'object';
  }

  /**
   * Processes EXIF data and updates the keys map
   * Shared by both ProcessExifKeysHandler and SyncExifKeysHandler
   */
  processExifData(
    exifData: Tags,
    exifKeysMap: Map<string, ExifValueType>,
  ): void {
    for (const [key, value] of Object.entries(exifData)) {
      if (!exifKeysMap.has(key)) {
        const valueType = this.typeDeterminationStrategy.determineType(value);
        exifKeysMap.set(key, valueType);
      }
    }
  }
}
