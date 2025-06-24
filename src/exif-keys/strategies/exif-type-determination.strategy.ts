import { ExifValueType } from '../entities/exif-keys.entity';

export interface IExifTypeDeterminationStrategy {
  determineType(value: unknown): ExifValueType;
}

export class ExifTypeDeterminationStrategy
  implements IExifTypeDeterminationStrategy
{
  private readonly typeCheckers: Array<{
    check: (value: unknown) => boolean;
    type: ExifValueType;
  }> = [
    {
      check: (value: unknown) => this.isLongString(value),
      type: ExifValueType.LONG_STRING,
    },
    {
      check: (value: unknown) => typeof value === 'string',
      type: ExifValueType.STRING,
    },
    {
      check: (value: unknown) => typeof value === 'number',
      type: ExifValueType.NUMBER,
    },
    {
      check: (value: unknown) => this.isValidStringArray(value),
      type: ExifValueType.STRING_ARRAY,
    },
  ];

  determineType(value: unknown): ExifValueType {
    const matchedChecker = this.typeCheckers.find(({ check }) => check(value));
    return matchedChecker?.type ?? ExifValueType.NOT_SUPPORTED;
  }

  private isLongString(value: unknown): boolean {
    return typeof value === 'string' && value.length > 30;
  }

  private isValidStringArray(value: unknown): boolean {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value[0] !== undefined &&
      typeof value[0] === 'string'
    );
  }
}
