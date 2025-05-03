import {
  formatDate,
  isValidExifDateTime,
  parseTimeStampToMilliseconds,
  toDateUTC,
  toMillisecondsUTC,
  nanosecondsToFormattedString,
  getISOStringWithUTC,
} from './datesHelper';
import { ExifDateTime } from 'exiftool-vendored';

const mockExifDateTime = {
  rawValue: '2023:01:01 12:00:00.000',
} as ExifDateTime;

describe('dataHelpers', () => {
  describe('isExifDateTime', () => {
    it('should return true for a valid ExifDateTime object', () => {
      expect(isValidExifDateTime(mockExifDateTime)).toBe(true);
    });

    it('should return false for an invalid ExifDateTime object', () => {
      const invalidExifDateTime = {
        rawValue: 'invalid-date',
      } as ExifDateTime;
      expect(isValidExifDateTime(invalidExifDateTime)).toBe(false);
    });

    it('should return false for non-ExifDateTime inputs', () => {
      expect(isValidExifDateTime('2023-01-01')).toBe(false);
      expect(isValidExifDateTime(123456)).toBe(false);
      expect(isValidExifDateTime(null)).toBe(false);
      expect(isValidExifDateTime(undefined)).toBe(false);
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

    it('should return 1970-01-01T00:00:00.000Z for invalid date', () => {
      const invalidDate = 'not-a-real-date';
      const date = toDateUTC(invalidDate);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('1970-01-01T00:00:00.000Z');
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

  describe('nanosecondsToFormattedString', () => {
    it('should format nanoseconds correctly for hours, minutes, seconds, and milliseconds', () => {
      const nanoseconds: bigint = 11543892825672n;
      const result = nanosecondsToFormattedString(nanoseconds);
      expect(result).toBe('03:12:23.892');
    });

    it('should format nanoseconds correctly if custom format is provided', () => {
      const nanoseconds = 11543892825672n;
      const customFormat = 'HH:mm:ss';
      const result = nanosecondsToFormattedString(nanoseconds, customFormat);
      expect(result).toBe('03:12:23');
    });

    it('should format nanoseconds correctly for minutes, seconds, and milliseconds', () => {
      const nanoseconds = 1154389282234n;
      const result = nanosecondsToFormattedString(nanoseconds);
      expect(result).toBe('00:19:14.389');
    });

    it('should throw an error if the duration format is invalid', () => {
      const nanoseconds = 5415123n;
      const invalidFormat = 'invalid';
      expect(() =>
        nanosecondsToFormattedString(nanoseconds, invalidFormat),
      ).toThrow('Invalid duration: invundefinedliundefined');
    });
  });

  describe('parseTimeStampToMilliseconds', () => {
    it('should return the correct milliseconds for a valid timestamp string', () => {
      const timeString = '01:30:15.123';
      const result = parseTimeStampToMilliseconds(timeString);
      expect(result).toBe(5415123); // 1 hour, 30 minutes, 15 seconds, 123 milliseconds in milliseconds
    });

    it('should return the correct milliseconds for a timestamp string with only hours and minutes', () => {
      const timeString = '01:30:00.000';
      const result = parseTimeStampToMilliseconds(timeString);
      expect(result).toBe(5400000); // 1 hour, 30 minutes in milliseconds
    });

    it('should return the correct milliseconds for a timestamp string with only minutes and seconds', () => {
      const timeString = '00:30:15.000';
      const result = parseTimeStampToMilliseconds(timeString);
      expect(result).toBe(1815000); // 30 minutes, 15 seconds in milliseconds
    });

    it('should return the correct milliseconds for a timestamp string with only seconds and milliseconds', () => {
      const timeString = '00:00:15.123';
      const result = parseTimeStampToMilliseconds(timeString);
      expect(result).toBe(15123); // 15 seconds, 123 milliseconds in milliseconds
    });

    it('should return the correct milliseconds for a timestamp string with only seconds', () => {
      const timeString = '00:00:15.000';
      const result = parseTimeStampToMilliseconds(timeString);
      expect(result).toBe(15000); // 15 seconds in milliseconds
    });

    it('should throw an error for an invalid timestamp string', () => {
      const timeString = 'invalid-time';
      expect(() => parseTimeStampToMilliseconds(timeString)).toThrow(
        'Invalid time stamp: invalid-time',
      );
    });
  });

  describe('getISOStringWithUTC', () => {
    it('should convert a Date object to ISO string with local UTC timezone', () => {
      const date = new Date('2023-01-01T12:00:00.000Z');
      const result = getISOStringWithUTC(date);
      expect(result).toBe('2023-01-01T13:00:00.000Z');
    });

    it('should convert a string date to ISO string with local UTC timezone', () => {
      const dateString = '2023-01-01';
      const result = getISOStringWithUTC(dateString);
      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should convert a timestamp to ISO string with local UTC timezone', () => {
      const timestamp = 1672531200000; // 2023-01-01T00:00:00.000Z
      const result = getISOStringWithUTC(timestamp);
      expect(result).toBe('2023-01-01T01:00:00.000Z');
    });

    it('should handle date strings with timezone information', () => {
      const dateWithTimezone = '2023-01-01T12:00:00+02:00';
      const result = getISOStringWithUTC(dateWithTimezone);
      expect(result).toBe('2023-01-01T11:00:00.000Z'); // 12:00 +01:00 is 11:00 UTC
    });
  });
});
