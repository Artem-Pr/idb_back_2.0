import { Injectable } from '@nestjs/common';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';

@Injectable()
export class ExifKeysFactory {
  create(name: string, type: ExifValueType): ExifKeys {
    const exifKey = new ExifKeys();
    exifKey.name = name;
    exifKey.type = type;
    exifKey.typeConflicts = null;
    return exifKey;
  }

  createFromMap(exifKeysMap: Map<string, ExifValueType>): ExifKeys[] {
    return Array.from(exifKeysMap.entries()).map(([name, type]) =>
      this.create(name, type),
    );
  }
}
