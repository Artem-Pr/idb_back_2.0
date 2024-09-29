import { HttpException, HttpStatus } from '@nestjs/common';

export const deepCopy = <T extends object>(obj: T) =>
  JSON.parse(JSON.stringify(obj)) as T;

export const getRandomId = (numbers: number): string =>
  Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(numbers, '0');

export async function resolveAllSettled<T extends any[]>(
  promises: [...{ [K in keyof T]: Promise<T[K]> }],
): Promise<{ [K in keyof T]: T[K] }> {
  const results: PromiseSettledResult<any>[] =
    await Promise.allSettled(promises);

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      throw new HttpException(result.reason, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }) as { [K in keyof T]: T[K] };
}

export const getEscapedString = (string: string) => {
  return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
