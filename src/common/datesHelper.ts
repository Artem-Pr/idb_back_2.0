import type { ConfigType } from 'dayjs';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import * as timezone from 'dayjs/plugin/timezone';
import type { ExifDateTime } from 'exiftool-vendored';

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);
dayjs.tz.setDefault('UTC');

export const DATE_TIME_FORMAT = 'YYYY.MM.DD HH:mm:ss';
export const EXIF_DATE_TIME_FORMAT = 'YYYY:MM:DD HH:mm:ss.SSS';
export const DATE_FORMAT = 'YYYY.MM.DD';

export const isExifDateTime = (
  value: ConfigType | ExifDateTime,
): value is ExifDateTime => {
  return dayjs(
    (value as ExifDateTime)?.rawValue,
    EXIF_DATE_TIME_FORMAT,
  ).isValid();
};

export const toDateUTC = (date: ConfigType | ExifDateTime): Date => {
  if (isExifDateTime(date)) {
    return dayjs.utc(date.rawValue, EXIF_DATE_TIME_FORMAT).toDate();
  }

  return dayjs.utc(date).toDate();
};

export const toMillisecondsUTC = (date: ConfigType): number => {
  return dayjs.utc(date).valueOf();
};

export const formatDate = (
  date: ConfigType,
  format: string = DATE_FORMAT,
): string => {
  return dayjs(date).format(format);
};
