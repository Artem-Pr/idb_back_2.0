import { InternalServerErrorException } from '@nestjs/common';
import { CustomLogger } from 'src/logger/logger.service';

const logger = new CustomLogger('utils');
export interface ResolveAllSettledOptions {
  dontRejectIfError?: boolean;
}

export interface RejectedAllSettledError<T = unknown> {
  originalValue?: T;
  errorMessage: string;
}

type ResolveAllSettledOverload = {
  <T extends unknown[]>(
    promises: [...{ [K in keyof T]: Promise<T[K]> }],
  ): Promise<{
    [K in keyof T]: T[K];
  }>;
  <T extends unknown[], ErrorReason extends RejectedAllSettledError<T>>(
    promises: [...{ [K in keyof T]: Promise<T[K]> }],
    options: ResolveAllSettledOptions,
  ): Promise<{
    [K in keyof T]: T[K] | ErrorReason;
  }>;
};

export const resolveAllSettled: ResolveAllSettledOverload = async <
  T extends unknown[],
  ErrorReason extends RejectedAllSettledError<T>,
>(
  promises: [...{ [K in keyof T]: Promise<T[K]> }],
  { dontRejectIfError }: ResolveAllSettledOptions = {},
) => {
  const results = await Promise.allSettled(promises);

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const reason: Partial<ErrorReason> = result.reason;
    const reasonMessage = reason?.errorMessage;

    if (dontRejectIfError && reasonMessage) {
      logger.logError({
        message: reasonMessage,
        method: 'resolveAllSettled',
        errorData: { reason },
      });

      return {
        originalValue: reason.originalValue,
        errorMessage: reasonMessage,
      } as ErrorReason;
    }

    logger.logError({
      message: result.reason,
      method: 'resolveAllSettled',
      errorData: { reason },
    });

    throw new InternalServerErrorException(result.reason);
  });
};
