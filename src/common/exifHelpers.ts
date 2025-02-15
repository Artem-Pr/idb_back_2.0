import type { ExifDateTime, Maybe, Tags } from 'exiftool-vendored';
import {
  getDateUTCFromExifDateTime,
  getExifDateTimeRawValue,
  hasNoDateTime,
  hasNoMilliseconds,
  hasNoMinutes,
  hasNoSeconds,
  isBefore,
  isValidExifDateTime,
} from './datesHelper';
import { CustomLogger } from 'src/logger/logger.service';

const logger = new CustomLogger('datesHelper');

// TODO: probably better to separate into 2 groups: video and photo
const EXIF_ORIGINAL_DATES_FIELD_NAMES = [
  'CreateDate', // Видео: Apple - iPhone SE (из лайв фото), HandlerVendorID:Apple (возможно кодек), PS4 screenshot
  'CreationDate', // Видео для iPhone с тайм зоной
  'DateCreated', // Cannon EOS 60D, Xiaomi - M2101K6G
  'DateTimeOriginal', // XIAOYI - YDXJ 1 photo (Xiaomi Yi Action Camera)
  'MediaCreateDate', // Видео: Apple - iPhone SE (из лайв фото), HandlerVendorID:Apple (возможно кодек)
  'ModifyDate', // Xiaomi Mi Note 3
  'SubSecCreateDate', // photo: iPhone SE (1st generation), iPhone 12 Pro, iPhone 13, iPhone 16
  'SubSecDateTimeOriginal', // photo: iPhone SE (1st generation), iPhone 12 Pro, iPhone 13, iPhone 16
  'SubSecModifyDate', // Xiaomi Mi Note 3
  'TrackCreateDate', // Видео: Apple - iPhone SE (из лайв фото), HandlerVendorID:Apple (возможно кодек), PS4 Video, CreatorTool:Adobe Premiere Pro CC 2015 (Windows)
] as const;

type ExifOriginalDatesFieldName =
  (typeof EXIF_ORIGINAL_DATES_FIELD_NAMES)[number];

// CreatorTool:Adobe Premiere Pro CC 2015 (Windows)
// HandlerVendorID:Apple

const EXIF_MEDIA_DURATION_FIELD_NAMES = [
  'Duration',
  'TrackDuration',
  'MediaDuration',
] as const;

const PreferredDateFieldNameEnum: Record<
  string,
  {
    keyTags: Tags;
    exifOriginalDatesFieldName: (typeof EXIF_ORIGINAL_DATES_FIELD_NAMES)[number];
  }
> = {
  Xiaomi_Yi_Action_Camera: {
    keyTags: { Make: 'XIAOYI', Model: 'YDXJ 1' },
    exifOriginalDatesFieldName: 'DateTimeOriginal',
  },
  Iphone_video_mov: {
    keyTags: { Make: 'Apple', MIMEType: 'video/quicktime' },
    exifOriginalDatesFieldName: 'CreationDate',
  },
  Iphone_video_mp4: {
    keyTags: { Make: 'Apple', MIMEType: 'video/mp4' },
    exifOriginalDatesFieldName: 'CreationDate',
  },
};

export const getDescriptionFromExif = (exif: Tags): string | null =>
  exif.Description ||
  exif.ImageDescription ||
  exif.UserComment ||
  exif['Caption-Abstract'] ||
  null;

export const getKeywordsFromExif = (exif: Tags): string[] => {
  const keywords = exif.Subject || exif.Keywords || [];

  if (typeof keywords === 'string') {
    // by default Keywords in iphone video is string, need to use Subject instead
    // this implementation is just in case
    return keywords.split('.');
  }

  return keywords;
};

interface ExifDateTimeAndFieldName {
  dateFieldName: (typeof EXIF_ORIGINAL_DATES_FIELD_NAMES)[number];
  exifDateTime: ExifDateTime;
}

interface RawExifDateTimeAndFieldName
  extends Omit<ExifDateTimeAndFieldName, 'exifDateTime'> {
  exifDateTime: Maybe<ExifDateTime>;
}

const exifDateTimeValidator = (
  exifDateTimeAndFieldName: RawExifDateTimeAndFieldName,
): exifDateTimeAndFieldName is ExifDateTimeAndFieldName =>
  Boolean(exifDateTimeAndFieldName.exifDateTime?.isValid);

const getCustomOriginalDateField = (
  exif: Tags,
): ExifOriginalDatesFieldName[] | typeof EXIF_ORIGINAL_DATES_FIELD_NAMES => {
  const customOriginalDateField = Object.values(
    PreferredDateFieldNameEnum,
  ).find(({ keyTags }) =>
    Object.keys(keyTags).every((key) => keyTags[key] === exif[key]),
  )?.exifOriginalDatesFieldName;

  if (
    customOriginalDateField &&
    isValidExifDateTime(exif[customOriginalDateField])
  ) {
    return [customOriginalDateField];
  }

  return EXIF_ORIGINAL_DATES_FIELD_NAMES;
};

export const getOriginalDateFromExif = (
  exif: Tags,
): string | ExifDateTime | undefined | Date => {
  const getRawExifDateTimeAndFieldName = (
    dateFieldName: ExifDateTimeAndFieldName['dateFieldName'],
  ) => ({
    dateFieldName,
    exifDateTime: getExifDateTimeRawValue(exif[dateFieldName]),
  });

  const originalDateFields = getCustomOriginalDateField(exif);

  const sortedDateTimeArr = originalDateFields
    .map(getRawExifDateTimeAndFieldName)
    .filter(exifDateTimeValidator)
    .map(({ dateFieldName, exifDateTime }) => {
      const dateTime = getDateUTCFromExifDateTime(exifDateTime);
      logger.consoleLog(
        `🚀 [datesHelper] ${exif.FileName}:`,
        dateTime,
        exifDateTime.zoneName,
      );

      const emptyMinutes = hasNoMinutes(dateTime);
      const emptySeconds = hasNoSeconds(dateTime);
      const emptyMilliseconds = hasNoMilliseconds(dateTime);

      return {
        dateFieldName,
        dateTime,
        hasNoDateTime: hasNoDateTime(dateTime),
        hasNoMinutes: emptyMinutes && emptySeconds && emptyMilliseconds,
        hasNoSeconds: emptySeconds && emptyMilliseconds,
        hasNoMilliseconds: emptyMilliseconds,
        hasTimeZone: Boolean(exifDateTime.zoneName),
      };
    })
    .sort((a, b) => {
      if (a.hasNoDateTime && !b.hasNoDateTime) return 1;
      if (!a.hasNoDateTime && b.hasNoDateTime) return -1;
      if (b.hasTimeZone && !a.hasTimeZone) return 1;
      if (!b.hasTimeZone && a.hasTimeZone) return -1;
      if (a.hasNoMilliseconds && !b.hasNoMilliseconds) return 1;
      if (!a.hasNoMilliseconds && b.hasNoMilliseconds) return -1;
      if (a.hasNoSeconds && !b.hasNoSeconds) return 1;
      if (!a.hasNoSeconds && b.hasNoSeconds) return -1;
      if (a.hasNoMinutes && !b.hasNoMinutes) return 1;
      if (!a.hasNoMinutes && b.hasNoMinutes) return -1;
      if (isBefore(a.dateTime, b.dateTime)) return -1;
      if (isBefore(b.dateTime, a.dateTime)) return 1;
      return 0;
    });

  logger.debug('getOriginalDateFromExif', {
    camera: (exif as any).Product || `${exif.Make} - ${exif.Model}`,
    ...sortedDateTimeArr[0],
  });

  return sortedDateTimeArr[0]?.dateTime;
};

export const getVideoDurationInMillisecondsFromExif = (
  exif: Tags,
): number | null => {
  const durationField = EXIF_MEDIA_DURATION_FIELD_NAMES.find(
    (fieldName) => exif[fieldName],
  );

  if (durationField) {
    return Number(exif[durationField]) * 1000;
  }

  return null;
};
