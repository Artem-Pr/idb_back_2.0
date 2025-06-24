export const EXIF_KEYS_CONSTANTS = {
  LOG_MESSAGES: {
    NO_EXIF_KEYS_FOUND: 'No EXIF keys found in media list',
    NO_NEW_KEYS_TO_SAVE: 'No new EXIF keys to save',
    KEYS_SAVED: (count: number) => `Saved ${count} new EXIF keys to database`,
    PROCESSING_ERROR: (error: string) => `Error processing EXIF keys: ${error}`,
  },
  DATABASE: {
    SELECT_FIELDS: ['name'] as const,
  },
} as const;
