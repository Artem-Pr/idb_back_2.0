import type { ConfigType } from 'dayjs';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import type { ExifDateTime } from 'exiftool-vendored';
dayjs.extend(utc);
dayjs.extend(customParseFormat);

export const DATE_TIME_FORMAT = 'YYYY.MM.DD HH:mm:ss';
export const EXIF_DATE_TIME_FORMAT = 'YYYY:MM:DD HH:mm:ss';
export const DATE_FORMAT = 'YYYY.MM.DD';

export const isExifDateTime = (value: any): value is ExifDateTime =>
  dayjs((value as ExifDateTime)?.rawValue, EXIF_DATE_TIME_FORMAT).isValid();

export const toDateUTC = (date: ConfigType | ExifDateTime): Date => {
  if (isExifDateTime(date)) {
    return dayjs.utc(date.rawValue, EXIF_DATE_TIME_FORMAT).toDate();
  }

  return dayjs.utc(date).toDate();
};
