import type { ExifDateTime, Tags } from 'exiftool-vendored';

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

// нашел много разных вариантов даты, возможно надо их протестировать
export const getOriginalDateFromExif = (
  exif: Tags,
): string | ExifDateTime | undefined => {
  if (exif.HandlerVendorID === 'Apple' && exif.MIMEType === 'video/quicktime') {
    return exif.CreationDate || exif.DateTimeOriginal || exif.MediaCreateDate;
  }

  return (
    exif.SubSecDateTimeOriginal ||
    exif.SubSecCreateDate ||
    exif.DateTimeOriginal ||
    exif.CreationDate || // Видео для iPhone с тайм зоной
    exif.CreateDate ||
    exif.ModifyDate ||
    exif.MediaCreateDate
  );
};
