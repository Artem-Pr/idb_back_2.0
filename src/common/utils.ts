import { HttpException, HttpStatus } from '@nestjs/common';
import {
  MainDir,
  SUPPORTED_EXTENSIONS_REGEX,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_IMAGE_MIMETYPES,
  SUPPORTED_MIMETYPES,
  SUPPORTED_VIDEO_EXTENSIONS,
  SUPPORTED_VIDEO_MIMETYPES,
} from './constants';
import type {
  FileNameWithExt,
  FileNameWithImageExt,
  FileNameWithVideoExt,
  RemoveExtension,
  SupportedMimetypes,
} from './types';

export const removeExtraFirstSlash = (value: string): string =>
  value.replace(/^\/+/, '');

export const removeExtraLastSlash = (value: string): string =>
  value.replace(/\/+$/, '');

export const removeExtraSlashes = (value: string): string =>
  value.replace(/^\/+|\/+$/g, '');

type FolderPath = string;
type DestPrefixedPath = `./${FolderPath}`;
export const addDestPrefix = (
  folderPath: FolderPath | DestPrefixedPath,
): DestPrefixedPath => {
  if (!folderPath.startsWith('./')) {
    return `./${folderPath}`;
  }
  return folderPath as DestPrefixedPath;
};

export const removeMainDir = <T extends `${MainDir}/${string}`>(
  path: T,
): T extends `${MainDir}/${infer R}` ? `/${R}` : never => {
  return `/${path.split('/').slice(1).join('/')}` as T extends `${MainDir}/${infer R}`
    ? `/${R}`
    : never;
};

export const isSupportedImageExtension = (
  fileName: string,
): fileName is FileNameWithImageExt =>
  SUPPORTED_IMAGE_EXTENSIONS.includes(fileName.split('.').pop() || '');

export const isSupportedVideoExtension = (
  fileName: string,
): fileName is FileNameWithVideoExt =>
  SUPPORTED_VIDEO_EXTENSIONS.includes(fileName.split('.').pop() || '');

export const isSupportedExtension = (
  fileName: string,
): fileName is FileNameWithExt =>
  isSupportedImageExtension(fileName) || isSupportedVideoExtension(fileName);

export const isSupportedImageMimeType = (
  mimeType: string,
): mimeType is SupportedMimetypes['image'] =>
  SUPPORTED_IMAGE_MIMETYPES.includes(mimeType);

export const isSupportedVideoMimeType = (
  mimeType: string,
): mimeType is SupportedMimetypes['video'] =>
  SUPPORTED_VIDEO_MIMETYPES.includes(mimeType);

export const isSupportedMimeType = (
  mimeType: string,
): mimeType is SupportedMimetypes['allFiles'] =>
  SUPPORTED_MIMETYPES.includes(mimeType);

export const removeExtension = <T extends FileNameWithExt>(
  filename: T,
): RemoveExtension<T> => {
  // Check if the file has a supported extension
  if (isSupportedExtension(filename)) {
    // Use a regex to remove the extension from the filename
    return filename.replace(
      SUPPORTED_EXTENSIONS_REGEX,
      '',
    ) as RemoveExtension<T>;
  }

  // If the extension is not supported, log an error and return the original filename
  console.error('removeExtension - not supported extension:', filename);
  return filename;
};

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
