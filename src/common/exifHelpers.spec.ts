import {
  getDescriptionFromExif,
  getKeywordsFromExif,
  getOriginalDateFromExif,
} from './exifHelpers';
import type { Tags } from 'exiftool-vendored';

describe('exifHelpers', () => {
  describe('getDescriptionFromExif', () => {
    it('should return Description if it exists', () => {
      const exif: Tags = { Description: 'Test Description' };
      expect(getDescriptionFromExif(exif)).toBe('Test Description');
    });

    it('should return ImageDescription if Description does not exist', () => {
      const exif: Tags = { ImageDescription: 'Image Description' };
      expect(getDescriptionFromExif(exif)).toBe('Image Description');
    });

    it('should return UserComment if Description and ImageDescription do not exist', () => {
      const exif: Tags = { UserComment: 'User Comment' };
      expect(getDescriptionFromExif(exif)).toBe('User Comment');
    });

    it('should return null if Description, ImageDescription, and UserComment do not exist', () => {
      const exif: Tags = {};
      expect(getDescriptionFromExif(exif)).toBe(null);
    });
  });

  describe('getKeywordsFromExif', () => {
    it('should return an array of keywords if Subject exists', () => {
      const exif: Tags = { Subject: ['keyword1', 'keyword2'] };
      expect(getKeywordsFromExif(exif)).toEqual(['keyword1', 'keyword2']);
    });

    it('should return an array of keywords if Keywords exists', () => {
      const exif: Tags = { Keywords: ['keyword1', 'keyword2'] };
      expect(getKeywordsFromExif(exif)).toEqual(['keyword1', 'keyword2']);
    });

    it('should split string keywords by "." if Keywords is a string', () => {
      const exif: Tags = { Keywords: 'keyword1.keyword2' };
      expect(getKeywordsFromExif(exif)).toEqual(['keyword1', 'keyword2']);
    });

    it('should return an empty array if Keywords does not exist', () => {
      const exif: Tags = {};
      expect(getKeywordsFromExif(exif)).toEqual([]);
    });
  });

  describe('getOriginalDateFromExif', () => {
    it('should return CreationDate for Apple quicktime video', () => {
      const exif: Tags = {
        HandlerVendorID: 'Apple',
        MIMEType: 'video/quicktime',
        CreationDate: '2020-01-01',
      };
      expect(getOriginalDateFromExif(exif)).toBe('2020-01-01');
    });

    it('Should MediaCreateDate if CreationDate does not exist for Apple quicktime video', () => {
      const exif: Tags = {
        HandlerVendorID: 'Apple',
        MIMEType: 'video/quicktime',
        MediaCreateDate: '2020-01-01',
      };
      expect(getOriginalDateFromExif(exif)).toBe('2020-01-01');
    });

    it('should return DateTimeOriginal if available', () => {
      const exif: Tags = { DateTimeOriginal: '2020-01-01' };
      expect(getOriginalDateFromExif(exif)).toBe('2020-01-01');
    });

    it('should return MediaCreateDate if DateTimeOriginal does not exist', () => {
      const exif: Tags = { MediaCreateDate: '2020-01-01' };
      expect(getOriginalDateFromExif(exif)).toBe('2020-01-01');
    });
  });
});
