import { CustomPromise, RejectedAllSettledError } from './customPromise';
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
describe('CustomPromise', () => {
  it('should resolve with a value', async () => {
    const promise = new CustomPromise<number>((resolve) => resolve(42));
    await expect(promise).resolves.toBe(42);
  });

  //   it('should reject with a custom error', async () => {
  //     const error: RejectedAllSettledError<string> = {
  //       originalValue: 'failed',
  //       errorMessage: 'Something went wrong',
  //     };
  //     const promise = new CustomPromise<string>((_, reject) => reject(error));
  //     await expect(promise).rejects.toMatchObject(error);
  //   });

  it('should chain .then correctly', async () => {
    const promise = new CustomPromise<number>((resolve) => resolve(5))
      .then((value) => value * 2)
      .then((value) => value + 3);

    await expect(promise).resolves.toBe(13);
  });

  //   it('should handle rejection in .then', async () => {
  //     const error: RejectedAllSettledError<number> = {
  //       originalValue: 10,
  //       errorMessage: 'Invalid operation',
  //     };

  //     const promise = new CustomPromise<number>((_, reject) =>
  //       reject(error),
  //     ).then(null, (reason) => {
  //       return reason.originalValue! * 2;
  //     });

  //     await expect(promise).resolves.toBe(20);
  //   });

  it('should handle .catch correctly', async () => {
    const error: RejectedAllSettledError<string> = {
      originalValue: 'input',
      errorMessage: 'Error occurred',
    };

    const promise = new CustomPromise<string>((_, reject) =>
      reject(error),
    ).catch((reason) => {
      return `Recovered: ${reason.errorMessage}`;
    });

    await expect(promise).resolves.toBe('Recovered: Error occurred');
  });

  //   it('should execute .finally regardless of resolve/reject', async () => {
  //     const onFinally = jest.fn();

  //     const resolvedPromise = new CustomPromise((resolve) =>
  //       resolve('success'),
  //     ).finally(onFinally);
  //     const rejectedPromise = new CustomPromise((_, reject) =>
  //       reject({ errorMessage: 'failed' }),
  //     ).finally(onFinally);

  //     await expect(resolvedPromise).resolves.toBe('success');
  //     await expect(rejectedPromise).rejects.toMatchObject({
  //       errorMessage: 'failed',
  //     });

  //     expect(onFinally).toHaveBeenCalledTimes(2);
  //   });

  it('should resolve multiple promises with .all', async () => {
    const promise1 = CustomPromise.resolve(1);
    const promise2 = CustomPromise.resolve(2);
    const promise3 = CustomPromise.resolve(3);

    const allPromise = CustomPromise.all([promise1, promise2, promise3]);

    await expect(allPromise).resolves.toEqual([1, 2, 3]);
  });

  //   it('should reject with the first error in .all', async () => {
  //     const error: RejectedAllSettledError<number> = {
  //       originalValue: 0,
  //       errorMessage: 'Error in promise',
  //     };

  //     const promise1 = CustomPromise.resolve(1);
  //     const promise2 = CustomPromise.reject(error);
  //     const promise3 = CustomPromise.resolve(3);

  //     const allPromise = CustomPromise.all([promise1, promise2, promise3]);

  //     await expect(allPromise).rejects.toMatchObject(error);
  //   });

  //   it('should resolve and reject properly with .allSettled', async () => {
  //     const error: RejectedAllSettledError<number> = {
  //       originalValue: 0,
  //       errorMessage: 'Error occurred',
  //     };

  //     const promise1 = CustomPromise.resolve(1);
  //     const promise2 = CustomPromise.reject(error);
  //     const promise3 = CustomPromise.resolve(3);

  //     const allSettledPromise = CustomPromise.allSettled([
  //       promise1,
  //       promise2,
  //       promise3,
  //     ]);

  //     await expect(allSettledPromise).rejects.toThrow(
  //       new Error('Not implemented'),
  //     );
  //   });

  //   it('should separate resolved and rejected entities correctly', () => {
  //     const resolvedAndRejected = [
  //       1,
  //       { originalValue: 0, errorMessage: 'Error occurred' },
  //       3,
  //     ];

  //     const { updatedMediaList, errors } =
  //       CustomPromise.separateResolvedAndRejectedEntities(resolvedAndRejected);

  //     expect(updatedMediaList).toEqual([1, 0, 3]);
  //     expect(errors).toEqual(['Error occurred']);
  //   });

  it('should handle static resolve correctly', async () => {
    const promise = CustomPromise.resolve(123);
    await expect(promise).resolves.toBe(123);
  });

  //   it('should handle static reject correctly', async () => {
  //     const error: RejectedAllSettledError<string> = {
  //       errorMessage: 'Static rejection',
  //     };

  //     const promise = CustomPromise.reject(error);
  //     await expect(promise).rejects.toMatchObject(error);
  //   });
});
