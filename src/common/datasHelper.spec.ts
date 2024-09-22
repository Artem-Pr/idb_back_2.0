import {
  formatDate,
  isExifDateTime,
  toDateUTC,
  toMillisecondsUTC,
} from './datesHelper';
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

  describe('toMillisecondsUTC', () => {
    it('should convert string date to milliseconds UTC', () => {
      const dateString = '2023-01-01';
      const date = toMillisecondsUTC(dateString);
      expect(date).toBe(new Date('2023-01-01T00:00:00.000Z').getTime());
      expect(date).toBe(1672531200000);
    });

    it('should convert Date object to milliseconds UTC', () => {
      const inputDate = new Date('2024-07-13T16:30:39.742Z');
      const date = toMillisecondsUTC(inputDate);
      expect(date).toBe(inputDate.getTime());
      expect(date).toBe(1720888239742);
      expect(date).toBe(new Date('2024-07-13T16:30:39.742Z').getTime());
    });

    it('should handle invalid dates correctly', () => {
      const invalidDate = 'not-a-real-date';
      const date = toMillisecondsUTC(invalidDate);
      expect(date).toBeNaN();
    });
  });

  describe('formatDate', () => {
    it('should format string date to the default format', () => {
      const dateString = '2023-01-02';
      const formattedDate = formatDate(dateString);
      // Assuming DATE_FORMAT is 'YYYY.MM.DD'
      expect(formattedDate).toBe('2023.01.02');
    });

    it('should format Date object to the default format', () => {
      const inputDate = new Date('2024-07-13T16:30:39.742Z');
      const formattedDate = formatDate(inputDate);
      // Assuming DATE_FORMAT is 'YYYY.MM.DD'
      expect(formattedDate).toBe('2024.07.13');
    });

    it('should allow custom format for string date', () => {
      const dateString = '2024-07-13T16:30:39.742Z';
      const customFormat = 'DD/MM/YYYY';
      const formattedDate = formatDate(dateString, customFormat);
      expect(formattedDate).toBe('13/07/2024');
    });

    it('should handle invalid dates correctly', () => {
      const invalidDate = 'not-a-real-date';
      const formattedDate = formatDate(invalidDate);
      expect(formattedDate).toBe('Invalid Date');
    });
  });
});
