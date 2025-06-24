import { EXIF_VALUES_CONSTANTS } from '../constants/exif-values.constants';

export interface ExifValuesConfig {
  pagination: {
    defaultPage: number;
    defaultPerPage: number;
    maxPerPage: number;
  };
  database: {
    collectionName: string;
    exifFieldPrefix: string;
  };
  performance: {
    queryTimeoutMs: number;
    maxValuesThreshold: number;
  };
}

export class ExifValuesConfigFactory {
  static create(): ExifValuesConfig {
    return {
      pagination: {
        defaultPage: EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PAGE,
        defaultPerPage: EXIF_VALUES_CONSTANTS.PAGINATION.DEFAULT_PER_PAGE,
        maxPerPage: EXIF_VALUES_CONSTANTS.PAGINATION.MAX_PER_PAGE,
      },
      database: {
        collectionName: EXIF_VALUES_CONSTANTS.DATABASE.COLLECTION_NAME,
        exifFieldPrefix: EXIF_VALUES_CONSTANTS.DATABASE.EXIF_FIELD_PREFIX,
      },
      performance: {
        queryTimeoutMs: EXIF_VALUES_CONSTANTS.PERFORMANCE.QUERY_TIMEOUT_MS,
        maxValuesThreshold:
          EXIF_VALUES_CONSTANTS.PERFORMANCE.MAX_VALUES_THRESHOLD,
      },
    };
  }
}
