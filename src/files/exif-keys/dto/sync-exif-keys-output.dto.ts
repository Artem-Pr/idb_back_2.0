export class SyncExifKeysOutputDto {
  /**
   * Total number of media entities processed
   */
  totalMediaProcessed: number;

  /**
   * Total number of unique exif keys discovered
   */
  totalExifKeysDiscovered: number;

  /**
   * Number of exif keys that were saved to the database
   */
  newExifKeysSaved: number;

  /**
   * Number of media entities that had no exif data
   */
  mediaWithoutExif: number;

  /**
   * Processing time in milliseconds
   */
  processingTimeMs: number;

  /**
   * Number of batches processed
   */
  batchesProcessed: number;

  /**
   * Whether the exif-keys collection was cleared before processing
   */
  collectionCleared: boolean;
}
