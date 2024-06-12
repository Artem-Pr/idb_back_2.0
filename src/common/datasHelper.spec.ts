import { isExifDateTime, toDateUTC } from './datesHelper';
import { ExifDateTime } from 'exiftool-vendored';

const mockExifDateTime = {
  rawValue: '2023:01:01 12:00:00.000',
} as ExifDateTime;

describe('dataHelpers', () => {
  describe('isExifDateTime', () => {
    it('should return true for a valid ExifDateTime object', () => {
      expect(isExifDateTime(mockExifDateTime)).toBe(true);
    });

    it('should return false for an invalid ExifDateTime object', () => {
      const invalidExifDateTime = {
        rawValue: 'invalid-date',
      } as ExifDateTime;
      expect(isExifDateTime(invalidExifDateTime)).toBe(false);
    });

    it('should return false for non-ExifDateTime inputs', () => {
      expect(isExifDateTime('2023-01-01')).toBe(false);
      expect(isExifDateTime(123456)).toBe(false);
      expect(isExifDateTime(null)).toBe(false);
      expect(isExifDateTime(undefined)).toBe(false);
    });
  });

  describe('toDateUTC', () => {
    it('should convert ExifDateTime to a UTC Date object', () => {
      const date = toDateUTC(mockExifDateTime);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2023-01-01T12:00:00.000Z');
    });

    it('should convert string date to a UTC Date object', () => {
      const dateString = '2023-01-01';
      const date = toDateUTC(dateString);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should convert Date object to a UTC Date object', () => {
      const inputDate = new Date('2023-01-01T12:00:00Z');
      const date = toDateUTC(inputDate);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(inputDate.getTime());
    });
  });
});
