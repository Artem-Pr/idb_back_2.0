import { HttpException, HttpStatus } from '@nestjs/common';
import { resolveAllSettled } from './utils';
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
  });
});
