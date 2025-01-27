import { resolveAllSettled } from './resolveAllSettled';
import { InternalServerErrorException } from '@nestjs/common';

describe('resolveAllSettled', () => {
  it('should resolve all promises successfully', async () => {
    const promises = [
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ];
    const result = await resolveAllSettled(promises);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle rejected promises and throw HttpException', async () => {
    const promises = [
      Promise.resolve(1),
      Promise.reject(new Error('error reason')),
      Promise.resolve(3),
    ];
    await expect(resolveAllSettled(promises)).rejects.toThrow(
      new InternalServerErrorException('error reason'),
    );
  });

  it('should handle rejected promises and return error reason when dontRejectIfError is true', async () => {
    const promises = [
      Promise.resolve(1),
      Promise.reject({ errorMessage: 'error', originalValue: 2 }),
      Promise.resolve(3),
    ];
    const options = { dontRejectIfError: true };
    const result = await resolveAllSettled(promises, options);
    expect(result).toEqual([1, { errorMessage: 'error', originalValue: 2 }, 3]);
  });
});
