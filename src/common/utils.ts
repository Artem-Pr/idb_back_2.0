import { HttpException, HttpStatus } from '@nestjs/common';
import { Media } from 'src/files/entities/media.entity';

export const deepCopy = <T extends object>(obj: T) =>
  JSON.parse(JSON.stringify(obj)) as T;

export const shallowCopyOfMedia = (media: Media) => {
  const mediaCopy = new Media();
  Object.keys(media).forEach((key) => {
    if (key !== '_id') {
      (mediaCopy as Record<string, any>)[key] = media[key];
    }
  });
  mediaCopy._id = media._id;
  return mediaCopy;
};

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

export const decodeString = <T extends string>(encodedString: T): T => {
  return Buffer.from(encodedString, 'binary').toString('utf-8') as T;
};

export const replaceHashWithPlaceholder = (
  filePath: string,
  hash: string = '-{hash}-',
): string => {
  return filePath.replace(/-[0-9a-f]{24}-/, hash);
};
