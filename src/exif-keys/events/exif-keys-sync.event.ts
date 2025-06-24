/**
 * Events for EXIF key synchronization operations
 * Phase 3: Event-driven architecture for sync monitoring
 */

export class ExifKeysSyncStartedEvent {
  constructor(
    public readonly totalMediaCount: number,
    public readonly batchSize: number,
    public readonly clearExistingKeys: boolean,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysSyncBatchProcessedEvent {
  constructor(
    public readonly batchNumber: number,
    public readonly batchSize: number,
    public readonly processedCount: number,
    public readonly mediaWithoutExif: number,
    public readonly keysDiscovered: number,
    public readonly progressPercent: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysSyncCompletedEvent {
  constructor(
    public readonly totalMediaProcessed: number,
    public readonly totalExifKeysDiscovered: number,
    public readonly newExifKeysSaved: number,
    public readonly mediaWithoutExif: number,
    public readonly processingTimeMs: number,
    public readonly batchesProcessed: number,
    public readonly collectionCleared: boolean,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysSyncErrorEvent {
  constructor(
    public readonly error: Error,
    public readonly batchNumber?: number,
    public readonly processedCount?: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysSyncProgressEvent {
  constructor(
    public readonly progressPercent: number,
    public readonly processedCount: number,
    public readonly totalCount: number,
    public readonly currentBatch: number,
    public readonly totalBatches: number,
    public readonly estimatedTimeRemainingMs?: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ExifKeysCollectionClearedEvent {
  constructor(
    public readonly clearedCount: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
