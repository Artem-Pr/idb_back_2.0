import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';

export class ExifValuesQueriedEvent {
  constructor(
    public readonly exifPropertyName: string,
    public readonly totalCount: number,
    public readonly valueType: ExifValueType,
    public readonly page: number,
    public readonly perPage: number,
    public readonly executionTimeMs: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
