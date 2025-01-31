import {
  resolveAllSettled,
  ResolveAllSettledOptions,
} from './resolveAllSettled';

export interface RejectedAllSettledError<T = unknown> {
  originalValue?: T;
  errorMessage: string;
}

export class CustomPromise<T> {
  private internalPromise: Promise<T>;

  constructor(
    executor: (
      resolve: (value: T) => void,
      reject: (reason: RejectedAllSettledError<T>) => void,
    ) => void,
  ) {
    this.internalPromise = new Promise((resolve, reject) => {
      try {
        executor(resolve, (reason?: RejectedAllSettledError<T>) => {
          if (!reason) {
            reject({
              originalValue: undefined,
              errorMessage: 'An unknown error occurred',
            });
            return;
          }

          reject({
            ...reason,
            errorMessage: reason.errorMessage ?? 'An unknown error occurred',
          });
        });
      } catch (error) {
        reject({
          originalValue: undefined,
          errorMessage: error.message,
        });
      }
    });
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?:
      | ((
          reason: RejectedAllSettledError<T>,
        ) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): CustomPromise<TResult1 | TResult2> {
    return new CustomPromise((resolve, reject) => {
      this.internalPromise
        .then(
          (value) => {
            try {
              resolve(onfulfilled ? onfulfilled(value) : (value as any));
            } catch (error) {
              reject(error);
            }
          },
          (reason) => {
            try {
              reject(onrejected ? onrejected(reason) : reason);
            } catch (error) {
              reject(error);
            }
          },
        )
        .catch(reject);
    });
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: RejectedAllSettledError<T>) => TResult | PromiseLike<TResult>)
      | null,
  ): CustomPromise<T | TResult> {
    return new CustomPromise((resolve, reject) => {
      this.internalPromise.catch((reason) => {
        if (onrejected) {
          Promise.resolve(onrejected(reason)).then(resolve).catch(reject);
        } else {
          reject(reason);
        }
      });
    });
  }

  finally(onfinally?: (() => void) | null): CustomPromise<T> {
    return new CustomPromise((resolve, reject) => {
      this.internalPromise.finally(onfinally).then(resolve).catch(reject);
    });
  }

  static resolve<T>(value: T): CustomPromise<T> {
    return new CustomPromise((resolve) => resolve(value));
  }

  static reject<T>(reason: RejectedAllSettledError<T>): CustomPromise<unknown> {
    return new CustomPromise((_, reject) => reject(reason));
  }

  static all<T>(promises: Iterable<CustomPromise<T>>): CustomPromise<T[]> {
    return new CustomPromise((resolve, reject) => {
      Promise.all([...promises].map((p) => p.internalPromise))
        .then(resolve)
        .catch(reject);
    });
  }

  static allSettled<T extends unknown[]>(
    promises: [...{ [K in keyof T]: CustomPromise<T[K]> }],
  ): CustomPromise<{ [K in keyof T]: T[K] }>;

  static allSettled<
    T extends unknown[],
    ErrorReason extends RejectedAllSettledError<T[number]>,
  >(
    promises: [...{ [K in keyof T]: CustomPromise<T[K]> }],
    options: ResolveAllSettledOptions,
  ): CustomPromise<{ [K in keyof T]: T[K] | ErrorReason }>;

  // Implementation of allSettled
  static allSettled<
    T extends unknown[],
    ErrorReason extends RejectedAllSettledError<T[number]>,
  >(
    promises: Iterable<CustomPromise<T>>,
    options: ResolveAllSettledOptions = {},
  ): CustomPromise<Array<T | ErrorReason>> {
    return new CustomPromise(async (resolve, reject) => {
      try {
        const results = await resolveAllSettled(
          [...promises].map((p) => p.internalPromise),
          options,
        );

        resolve(results as Array<T | ErrorReason>);
      } catch (error) {
        reject(error);
      }
    });
  }

  static separateResolvedAndRejectedEntities<T>(
    resolvedAndRejectedEntities: Array<T | RejectedAllSettledError<T>>,
  ) {
    const isRejected = (
      result: T | RejectedAllSettledError<T>,
    ): result is RejectedAllSettledError<T> =>
      Boolean((result as RejectedAllSettledError<T>).errorMessage);

    return {
      resolvedList: resolvedAndRejectedEntities
        .map((result) => {
          if (isRejected(result)) {
            return result.originalValue;
          }
          return result;
        })
        .filter(Boolean),
      errors: resolvedAndRejectedEntities
        .map((result) => {
          if (isRejected(result)) {
            return result.errorMessage;
          }
          return null;
        })
        .filter(Boolean),
    };
  }
}
