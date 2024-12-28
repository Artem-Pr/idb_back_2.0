import { ObjectId } from 'mongodb';
import {
  MainDir,
  MainDirPath,
  PreviewPostfix,
  SUPPORTED_EXTENSIONS_REGEX,
  SUPPORTED_IMAGE_EXTENSIONS_REGEX,
  SUPPORTED_IMAGE_MIMETYPES,
  SUPPORTED_MIMETYPES,
  SUPPORTED_VIDEO_EXTENSIONS_REGEX,
  SUPPORTED_VIDEO_MIMETYPES,
  SupportedImageExtensions,
} from './constants';
import { basename } from 'path';

import { formatDate } from './datesHelper';
import type {
  ConvertSlashToDash,
  DBFilePath,
  FileNameWithExt,
  FileNameWithImageExt,
  FileNameWithVideoExt,
  NameWithPreviewPostfix,
  PreviewDirDateName,
  RelativePreviewDirectory,
  RemoveExtension,
  SupportedMimetypes,
} from './types';
import type { ConfigType as DayjsConfigType } from 'dayjs';

export const getFullPathWithoutNameAndFirstSlash = (
  filePathWithName: DBFilePath | FileNameWithExt,
): string => filePathWithName.split('/').filter(Boolean).slice(0, -1).join('/');

interface GetPreviewPathProps<
  T extends SupportedMimetypes['allFiles'],
  S extends PreviewPostfix,
> {
  originalName: FileNameWithExt;
  mimeType: T;
  postFix: S;
  date: DayjsConfigType;
}

export const getPreviewPath = <
  TMimeType extends SupportedMimetypes['allFiles'],
  SPostfix extends PreviewPostfix,
>({
  originalName,
  mimeType,
  postFix,
  date,
}: GetPreviewPathProps<TMimeType, SPostfix>): RelativePreviewDirectory<
  TMimeType,
  SPostfix
> => {
  const mimeTypeFolderName = mimeType.replace(
    /\//g,
    '-',
  ) as ConvertSlashToDash<TMimeType>;
  const dateFolderName: PreviewDirDateName = `${formatDate(date)} - originalDate`;
  const fileName = addPreviewPostfix(originalName, postFix, true);
  const previewPath: RelativePreviewDirectory<TMimeType, SPostfix> =
    `/${mimeTypeFolderName}/${postFix}/${dateFolderName}/${fileName}`;
  return previewPath;
};

export const getPreviewPathDependsOnMainDir = <
  TMimeType extends SupportedMimetypes['allFiles'],
  SPostfix extends PreviewPostfix,
>({
  date,
  dirName,
  mimeType,
  originalName,
  postFix,
}: GetPreviewPathProps<TMimeType, SPostfix> & { dirName: MainDir }) => {
  if (dirName === MainDir.volumes || dirName === MainDir.previews) {
    const previewPathRelative = getPreviewPath({
      originalName: basename(originalName) as FileNameWithExt,
      mimeType,
      postFix,
      date,
    });

    return previewPathRelative;
  }

  return addPreviewPostfix(`/${originalName}`, postFix);
};

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

export const addPreviewPostfix = <
  T extends FileNameWithExt,
  P extends PreviewPostfix,
>(
  fileName: T,
  postfix: P,
  withHash = false,
): NameWithPreviewPostfix<T, P> => {
  const hash = withHash ? `-${new ObjectId().toHexString()}` : '';
  return `${fileName.replace(/\.\w+$/, `${hash}-${postfix}.${SupportedImageExtensions.jpg}`)}` as NameWithPreviewPostfix<
    T,
    P
  >;
};

export const removeExtraFirstSlash = (value: string): string =>
  value.replace(/^\/+/, '');

export const removeExtraLastSlash = (value: string): string =>
  value.replace(/\/+$/, '');

export const removeExtraSlashes = <T extends string>(value: T): T =>
  value.replace(/^\/+|\/+$/g, '') as T;

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

export const removeMainDir = <T extends `${MainDir}/${string}`>(
  path: T,
): T extends `${MainDir}/${infer R}` ? `/${R}` : never => {
  return `/${path.split('/').slice(1).join('/')}` as T extends `${MainDir}/${infer R}`
    ? `/${R}`
    : never;
};

export const removeMainDirPath = <
  T extends `${MainDirPath}/${MainDir}/${string}`,
>(
  path: T,
  mainDirPath: `${MainDirPath}/${MainDir}`,
) => {
  if (!path.startsWith(mainDirPath)) {
    throw new Error(
      `removeMainDirPath - path does not start with mainDirPath: ${path || 'empty path'}`,
    );
  }

  return path.slice(
    `${mainDirPath}/`.length,
  ) as T extends `${MainDirPath}/${MainDir}/${infer R}` ? R : never;
};

export const getUniqPathsRecursively = <T extends string>(paths: T[]): T[] => {
  const getArrayOfSubfolders = (fullPath: string): string[] => {
    const fullPathParts = fullPath.split('/');
    const fullPathWithoutLastFolder = fullPathParts.slice(0, -1).join('/');
    return fullPathParts.length === 1
      ? fullPathParts
      : [...getArrayOfSubfolders(fullPathWithoutLastFolder), fullPath];
  };

  const pathsWithSubfolders = paths
    .reduce<
      string[]
    >((accum, currentPath) => [...accum, ...getArrayOfSubfolders(currentPath)], [])
    .filter(Boolean);
  return Array.from(new Set(pathsWithSubfolders)).sort() as T[];
};

export const isSupportedImageExtension = (
  fileName: string,
): fileName is FileNameWithImageExt =>
  SUPPORTED_IMAGE_EXTENSIONS_REGEX.test(fileName);

export const isSupportedVideoExtension = (
  fileName: string,
): fileName is FileNameWithVideoExt =>
  SUPPORTED_VIDEO_EXTENSIONS_REGEX.test(fileName);

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
