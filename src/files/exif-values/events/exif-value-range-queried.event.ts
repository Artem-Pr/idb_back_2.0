export class ExifValueRangeQueriedEvent {
  constructor(
    public readonly exifPropertyName: string,
    public readonly minValue: number,
    public readonly maxValue: number,
    public readonly count: number,
    public readonly executionTimeMs: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
