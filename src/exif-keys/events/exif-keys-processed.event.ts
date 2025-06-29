/**
 * Events for EXIF key processing operations
 * Phase 3: Event-driven architecture for monitoring and extensibility
 */

import { ExifValueType } from '../entities/exif-keys.entity';

export class ExifKeysProcessedEvent {
  constructor(
    public readonly processedCount: number,
    public readonly totalCount: number,
    public readonly processingTimeMs: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysProcessingStartedEvent {
  constructor(
    public readonly totalCount: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysProcessingCompletedEvent {
  constructor(
    public readonly processedCount: number,
    public readonly skippedCount: number,
    public readonly errorCount: number,
    public readonly totalProcessingTimeMs: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysProcessingErrorEvent {
  constructor(
    public readonly error: Error,
    public readonly processedCount: number,
    public readonly failedItem?: any,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeyDiscoveredEvent {
  constructor(
    public readonly keyName: string,
    public readonly keyType: string,
    public readonly mediaId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysSavedEvent {
  constructor(
    public readonly savedKeyNames: string[],
    public readonly count: number,
  ) {}
}

export class ExifKeyTypeConflictEvent {
  constructor(
    public readonly keyName: string,
    public readonly existingType: ExifValueType,
    public readonly newType: ExifValueType,
  ) {}
}
