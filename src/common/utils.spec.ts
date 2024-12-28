import { HttpException, HttpStatus } from '@nestjs/common';
import {
  decodeString,
  deepCopy,
  getEscapedString,
  resolveAllSettled,
  shallowCopyOfMedia,
  generatePid,
  generatePidNumber,
} from './utils';
import { getRandomId } from './utils';
import { createMediaMock } from 'src/files/__mocks__/mocks';
import { ObjectId } from 'mongodb';
import { Media } from 'src/files/entities/media.entity';

describe('Utils', () => {
  describe('deepCopy', () => {
    it('should create a deep copy of a simple object', () => {
      const original = { a: 1, b: 'test', c: true };
      const copy = deepCopy(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original); // Ensure it's a different object
    });

    it('should create a deep copy of a nested object', () => {
      const original = { a: 1, b: { c: 'test', d: [2, 3, 4] } };
      const copy = deepCopy(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original); // Ensure it's a different object
      expect(copy.b).not.toBe(original.b); // Ensure nested objects are different
      expect(copy.b.d).not.toBe(original.b.d); // Ensure nested arrays are different
    });

    it('should handle an empty object', () => {
      const original = {};
      const copy = deepCopy(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original); // Ensure it's a different object
    });

    it('should handle arrays correctly', () => {
      const original = [1, 2, { a: 3 }, [4, 5]];
      const copy = deepCopy(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original); // Ensure it's a different object
      expect(copy[2]).not.toBe(original[2]); // Ensure nested objects are different
      expect(copy[3]).not.toBe(original[3]); // Ensure nested arrays are different
    });

    it('should handle null and undefined values correctly', () => {
      const original = { a: null, b: undefined };
      const copy = deepCopy(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original); // Ensure it's a different object
    });

    it('should handle objects with functions (functions will be omitted)', () => {
      const original = {
        a: 1,
        b: function () {
          return 'test';
        },
      };
      const copy = deepCopy(original);

      expect(copy).toEqual({ a: 1 }); // Functions are not serialized by JSON.stringify
      expect(copy).not.toBe(original); // Ensure it's a different object
    });
  });
  describe('shallowCopyOfMedia', () => {
    it('should create a shallow copy of a Media object', () => {
      const originalMedia = createMediaMock({
        id: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'original_media',
      });
      const mediaCopy = shallowCopyOfMedia(originalMedia);

      expect(mediaCopy).toEqual(originalMedia);
      expect(mediaCopy).not.toBe(originalMedia); // Ensure it's a different object
    });

    it('should not copy the _id field', () => {
      const originalMedia = createMediaMock({
        id: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'original_media',
      });
      const mediaCopy = shallowCopyOfMedia(originalMedia);

      expect(mediaCopy._id).toBe(originalMedia._id);
    });

    it('should copy all other fields', () => {
      const originalMedia = createMediaMock({
        id: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'original_media',
        originalNameWithoutExt: 'original_media',
      });
      const mediaCopy = shallowCopyOfMedia(originalMedia);

      Object.keys(originalMedia).forEach((key) => {
        if (key !== '_id') {
          expect(mediaCopy[key]).toEqual(originalMedia[key]);
        }
      });
    });

    it('should handle an empty Media object', () => {
      const originalMedia = new Media();
      const mediaCopy = shallowCopyOfMedia(originalMedia);

      expect(mediaCopy).toEqual(originalMedia);
      expect(mediaCopy).not.toBe(originalMedia); // Ensure it's a different object
    });
  });
  describe('getRandomId', () => {
    it('should return a string', () => {
      const result = getRandomId(5);
      expect(typeof result).toBe('string');
    });

    it('should return a string of the specified length', () => {
      const length = 10;
      const result = getRandomId(length);
      expect(result.length).toBe(length);
    });

    it('should return different values on subsequent calls', () => {
      const length = 8;
      const result1 = getRandomId(length);
      const result2 = getRandomId(length);
      expect(result1).not.toBe(result2);
    });
  });
  describe('resolveAllSettled', () => {
    it('should resolve all promises with their respective values', async () => {
      const promises = [Promise.resolve('value1'), Promise.resolve('value2')];
      await expect(resolveAllSettled(promises)).resolves.toEqual([
        'value1',
        'value2',
      ]);
    });

    it('should throw HttpException when any of the promises is rejected', async () => {
      const mockErrorMessage = 'mock error';
      const errorReason = new Error(mockErrorMessage);
      const promises = [Promise.resolve('value1'), Promise.reject(errorReason)];

      await expect(resolveAllSettled(promises)).rejects.toThrow(HttpException);
      await expect(resolveAllSettled(promises)).rejects.toThrow(
        mockErrorMessage,
      );
    });

    it('should have the correct status code in the thrown HttpException', async () => {
      const errorReason = new Error('mock error');
      const promises = [Promise.resolve('value1'), Promise.reject(errorReason)];

      try {
        await resolveAllSettled(promises);
      } catch (error) {
        if (error instanceof HttpException) {
          expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
          // Re-throw if it's not an instance of HttpException
          throw error;
        }
      }
    });
  });
  describe('getEscapedString', () => {
    it('should escape special characters', () => {
      const input = 'Hello(world)';
      const expectedOutput = 'Hello\\(world\\)';
      expect(getEscapedString(input)).toBe(expectedOutput);
    });

    it('should escape multiple special characters', () => {
      const input = 'Hello[world]{example}';
      const expectedOutput = 'Hello\\[world\\]\\{example\\}';
      expect(getEscapedString(input)).toBe(expectedOutput);
    });

    it('should escape characters used in regex', () => {
      const input = 'a+b*c?d.e^f$g|h#i\\j';
      const expectedOutput = 'a\\+b\\*c\\?d\\.e\\^f\\$g\\|h\\#i\\\\j';
      expect(getEscapedString(input)).toBe(expectedOutput);
    });

    it('should escape whitespace characters', () => {
      const input = 'hello world';
      const expectedOutput = 'hello\\ world';
      expect(getEscapedString(input)).toBe(expectedOutput);
    });

    it('should return the same string if no special characters', () => {
      const input = 'helloworld';
      const expectedOutput = 'helloworld';
      expect(getEscapedString(input)).toBe(expectedOutput);
    });

    it('should handle empty string', () => {
      const input = '';
      const expectedOutput = '';
      expect(getEscapedString(input)).toBe(expectedOutput);
    });
  });
  describe('decodeString', () => {
    it('should decode a binary encoded string to UTF-8', () => {
      const encodedString = '\x48\x65\x6c\x6c\x6f'; // 'Hello' in binary
      const result = decodeString(encodedString);
      expect(result).toBe('Hello');
    });

    it('should return an empty string when given an empty string', () => {
      const encodedString = '';
      const result = decodeString(encodedString);
      expect(result).toBe('');
    });

    it('should decode special characters correctly', () => {
      const encodedString = '\xC3\xA9'; // 'é' in binary
      const result = decodeString(encodedString);
      expect(result).toBe('é');
    });

    it('should handle non-ASCII characters correctly', () => {
      const encodedString = '\xE6\x9C\xAC'; // '本' in binary (Japanese character)
      const result = decodeString(encodedString);
      expect(result).toBe('本');
    });

    it('should handle a string with mixed characters correctly', () => {
      const encodedString = '\x48\xC3\xA9\x6C\x6C\xC3\xB8'; // 'Héllø' in binary
      const result = decodeString(encodedString);
      expect(result).toBe('Héllø');
    });
  });
  describe('generatePid', () => {
    it('should return a string of length 6', () => {
      const pid = generatePid();
      expect(pid).toHaveLength(6);
    });

    it('should return a string containing only digits', () => {
      const pid = generatePid();
      expect(pid).toMatch(/^\d{6}$/);
    });

    it('should return different values on subsequent calls', () => {
      const pid1 = generatePid();
      const pid2 = generatePid();
      expect(pid1).not.toBe(pid2);
    });
  });

  describe('generatePidNumber', () => {
    it('should return a number', () => {
      const pidNumber = generatePidNumber();
      expect(typeof pidNumber).toBe('number');
    });

    it('should return a number with 6 digits', () => {
      const pidNumber = generatePidNumber();
      expect(pidNumber).toBeGreaterThanOrEqual(100000);
      expect(pidNumber).toBeLessThan(1000000);
    });

    it('should return different values on subsequent calls', () => {
      const pidNumber1 = generatePidNumber();
      const pidNumber2 = generatePidNumber();
      expect(pidNumber1).not.toBe(pidNumber2);
    });
  });
});
