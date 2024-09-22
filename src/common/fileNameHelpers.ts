import {
  MainDir,
  PreviewPostfix,
  SUPPORTED_EXTENSIONS_REGEX,
  SUPPORTED_IMAGE_EXTENSIONS_REGEX,
  SUPPORTED_IMAGE_MIMETYPES,
  SUPPORTED_MIMETYPES,
  SUPPORTED_VIDEO_EXTENSIONS_REGEX,
  SUPPORTED_VIDEO_MIMETYPES,
  SupportedImageExtensions,
} from './constants';
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

export const getFullPathWithoutName = (
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
}: GetPreviewPathProps<TMimeType, SPostfix>) => {
  const mimeTypeFolderName = mimeType.replace(
    /\//g,
    '-',
  ) as ConvertSlashToDash<TMimeType>;
  const dateFolderName: PreviewDirDateName = `${formatDate(date)} - originalDate`;
  const fileName = addPreviewPostfix(originalName, postFix);
  const previewPath: RelativePreviewDirectory<TMimeType, SPostfix> =
    `/${mimeTypeFolderName}/${postFix}/${dateFolderName}/${fileName}`;
  return previewPath;
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
): NameWithPreviewPostfix<T, P> => {
  return `${fileName.replace(/\.\w+$/, `-${postfix}.${SupportedImageExtensions.jpg}`)}` as NameWithPreviewPostfix<
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
