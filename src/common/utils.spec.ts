import { HttpException, HttpStatus } from '@nestjs/common';
import { getEscapedString, resolveAllSettled } from './utils';
import { getRandomId } from './utils';

describe('Utils', () => {
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
  });
});
