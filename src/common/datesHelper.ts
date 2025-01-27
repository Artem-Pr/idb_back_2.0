import type { ConfigType } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';
import type { Maybe } from 'exiftool-vendored';
import { ExifDateTime } from 'exiftool-vendored';
import { CustomLogger } from 'src/logger/logger.service';

const logger = new CustomLogger('datesHelper');

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.tz.setDefault('UTC');

export const TIME_STAMP_FORMAT = 'HH:mm:ss.SSS';
export const DATE_TIME_FORMAT = 'YYYY.MM.DD HH:mm:ss';
export const DATE_TIME_FORMAT_WITH_MILLISECONDS = 'YYYY:MM:DD HH:mm:ss.SSS';
export const DATE_FORMAT = 'YYYY.MM.DD';
const NO_DATE_TIME = Object.freeze({
  hours: 12,
  minutes: 0,
  seconds: 0,
});

export const getExifDateTimeRawValue = (
  value: ConfigType | ExifDateTime,
): Maybe<ExifDateTime> =>
  ExifDateTime.fromEXIF((value as ExifDateTime)?.rawValue || '');

export const isValidExifDateTime = (
  value: ConfigType | ExifDateTime,
): value is ExifDateTime => {
  const rawValue = (value as ExifDateTime)?.rawValue;

  if (!rawValue) {
    return false;
  }

  return Boolean(ExifDateTime.fromEXIF(rawValue)?.isValid);
};

export const getDateUTCFromExifDateTime = (value: ExifDateTime): Date => {
  const dateISOString = value.toISOString();

  const hasMilliseconds = dayjs
    .utc(dateISOString, DATE_TIME_FORMAT_WITH_MILLISECONDS)
    .isValid();

  return dayjs
    .utc(
      dateISOString,
      hasMilliseconds ? DATE_TIME_FORMAT_WITH_MILLISECONDS : DATE_TIME_FORMAT,
    )
    .toDate();
};

export const toDateUTC = (date: ConfigType | ExifDateTime): Date => {
  if (isValidExifDateTime(date)) {
    return dayjs
      .utc(date.rawValue, DATE_TIME_FORMAT_WITH_MILLISECONDS)
      .toDate();
  }

  if (dayjs.utc(date).isValid()) {
    return dayjs.utc(date).toDate();
  }

  logger.logError({
    method: 'toDateUTC',
    message: 'Invalid date',
    errorData: date,
  });
  return new Date('1970-01-01T00:00:00.000Z');
};

export const toMillisecondsUTC = (date: ConfigType): number => {
  return dayjs.utc(date).valueOf();
};

export const formatDate = (
  date: ConfigType,
  format: string = DATE_FORMAT,
): string => {
  return dayjs.utc(date).format(format);
};

export const isBefore = (oldDate: ConfigType, newDate: ConfigType): boolean => {
  return dayjs(oldDate).isBefore(newDate);
};

export const hasNoDateTime = (date: ConfigType): boolean => {
  const hasDefaultHours = dayjs.utc(date).hour() === NO_DATE_TIME.hours;
  const hasDefaultMinutes = dayjs.utc(date).minute() === NO_DATE_TIME.minutes;
  const hasDefaultSeconds = dayjs.utc(date).second() === NO_DATE_TIME.seconds;
  return hasDefaultHours && hasDefaultMinutes && hasDefaultSeconds;
};

export const hasNoMinutes = (date: ConfigType): boolean => {
  return dayjs.utc(date).minute() === 0;
};

export const hasNoSeconds = (date: ConfigType): boolean => {
  return dayjs.utc(date).second() === 0;
};

export const hasNoMilliseconds = (date: ConfigType): boolean => {
  return dayjs.utc(date).millisecond() === 0;
};

export const nanosecondsToFormattedString = (
  ns: bigint,
  format: string = TIME_STAMP_FORMAT,
): string => {
  const msAsNumber = Number(ns / 1_000_000n);

  if (!Number.isFinite(msAsNumber)) {
    logger.logError({
      method: 'nanosecondsToFormattedString',
      message: 'Invalid input: bigint value is too large to convert to number',
      errorData: { ns, format },
    });
    throw new Error('Input value is too large to be processed as a number');
  }

  const duration = dayjs.duration(msAsNumber).format(format);
  const isValidDurationFormat = dayjs(duration, format).isValid();

  if (!isValidDurationFormat) {
    logger.logError({
      method: 'nanosecondsToFormattedString',
      message: 'Invalid duration format',
      errorData: { ns, format },
    });
    throw new Error(`Invalid duration: ${duration}`);
  }

  return duration;
};

export const parseTimeStampToMilliseconds = (timeString: string): number => {
  const dayjsTime = dayjs(timeString, TIME_STAMP_FORMAT);
  if (!dayjsTime.isValid()) {
    logger.logError({
      method: 'parseTimeStampToMilliseconds',
      message: 'Invalid time stamp',
      errorData: timeString,
    });
    throw new Error(`Invalid time stamp: ${timeString}`);
  }

  return dayjs
    .duration({
      hours: dayjsTime.hour(),
      minutes: dayjsTime.minute(),
      seconds: dayjsTime.second(),
      milliseconds: dayjsTime.millisecond(),
    })
    .asMilliseconds();
};
