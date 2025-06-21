import { Injectable } from '@nestjs/common';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';

@Injectable()
export class ExifKeysFactory {
  createExifKey(name: string, type: ExifValueType): ExifKeys {
    const exifKey = new ExifKeys();
    exifKey.name = name;
    exifKey.type = type;
    return exifKey;
  }

  createExifKeysFromMap(exifKeysMap: Map<string, ExifValueType>): ExifKeys[] {
    return Array.from(exifKeysMap.entries()).map(([name, type]) =>
      this.createExifKey(name, type),
    );
  }
}
