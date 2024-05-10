import { ImageStoreServiceInputDto } from 'src/jobs/dto/image-store-service-input';
import type { SupportedMimetypes } from './types';
import { ScreenshotsConfig } from 'fluent-ffmpeg';

export const defaultHost = 'localhost';

export enum Protocols {
  HTTP = 'http',
  HTTPS = 'https',
  WS = 'ws',
}

export const DEFAULT_IMAGE_STORE_SERVICE_PORT = 3001;
export const DEFAULT_IMAGE_STORE_SERVICE_HOST = 'http://localhost';
export const IMAGE_STORE_SERVICE_ENDPOINT = 'sharp';
export const EXIFTOOL_TASK_TIMEOUT_MILLIS = 100000;
export const DEFAULT_PORT = 3000;
export const DEFAULT_HOST = `${Protocols.HTTP}://${defaultHost}`;
export const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017';
export const DEFAULT_DB_NAME = 'IDBase';
export const DEFAULT_DB_SYNCHRONIZE = false;

export enum Envs {
  DEV = 'development',
  TEST = 'test',
  PROD = 'production',
  DOCKER = 'docker',
}

export enum EnvConfigKeys {
  NODE_ENV = 'NODE_ENV',
  PORT = 'PORT',
  HOST = 'HOST',
  MONGODB_URI = 'MONGODB_URI',
  DB_NAME = 'DB_NAME',
  DB_SYNCHRONIZE = 'DB_SYNCHRONIZE',
  IMAGE_STORE_SERVICE_PORT = 'IMAGE_STORE_SERVICE_PORT',
  IMAGE_STORE_SERVICE_HOST = 'IMAGE_STORE_SERVICE_HOST',
}

type PreviewServiceOptions = {
  quality?: ImageStoreServiceInputDto['jpegOptionsQuality'];
  fit?: ImageStoreServiceInputDto['resizeOptionsFit'];
  width?: ImageStoreServiceInputDto['resizeOptionsWidth'];
  height?: ImageStoreServiceInputDto['resizeOptionsHeight'];
};

type VideoPreviewOptions = {
  timestamps: ScreenshotsConfig['timestamps'];
  thumbnailSize: ScreenshotsConfig['size'];
};

export const PreviewOptions: PreviewServiceOptions & VideoPreviewOptions =
  Object.freeze({
    quality: 60,
    fit: 'outside',
    width: 300,
    height: 300,
    // timestamps: ['5%'],
    // timestamps: ['01:30.000'],
    timestamps: [0],
    thumbnailSize: '1000x?',
  });

export enum DBCollections {
  config = 'config',
  photos = 'photos',
  temp = 'temp',
}

export enum DBConfigConstants {
  keywords = 'keywords',
  paths = 'paths',
}

export enum ControllerPrefix {
  keywords = 'keywords',
  paths = 'paths',
  unusedKeywords = 'unused-keywords',
  checkDirectory = 'check-directory',
  uploadFile = 'uploadItem', // TODO: rename to upload-file
}

export enum PreviewPostfix {
  preview = '-preview',
  fullSize = '-fullSize',
}

export enum MainDir {
  temp = 'temp',
  volumes = 'volumes',
  previews = 'previews',
}

export enum MainDirPath {
  dev = '../../test-data',
  prod = '/Users/artempriadkin/Development/test-data',
  docker = '/app',
}

export const MainDirPaths = Object.freeze({
  [Envs.DEV]: MainDirPath.dev,
  [Envs.TEST]: MainDirPath.dev,
  [Envs.PROD]: MainDirPath.prod,
  [Envs.DOCKER]: MainDirPath.docker,
});

export const Folders = Object.freeze({
  [Envs.DEV]: {
    [MainDir.temp]: `${MainDirPath.dev}/${MainDir.temp}`,
    [MainDir.volumes]: `${MainDirPath.dev}/${MainDir.volumes}`,
    [MainDir.previews]: `${MainDirPath.dev}/${MainDir.previews}`,
  },
  [Envs.TEST]: {
    [MainDir.temp]: `${MainDirPath.dev}/${MainDir.temp}`,
    [MainDir.volumes]: `${MainDirPath.dev}/${MainDir.volumes}`,
    [MainDir.previews]: `${MainDirPath.dev}/${MainDir.previews}`,
  },
  [Envs.PROD]: {
    [MainDir.temp]: `${MainDirPath.prod}/${MainDir.temp}`,
    [MainDir.volumes]: `${MainDirPath.prod}/${MainDir.volumes}`,
    [MainDir.previews]: `${MainDirPath.prod}/${MainDir.previews}`,
  },
  [Envs.DOCKER]: {
    [MainDir.temp]: `${MainDirPath.docker}/${MainDir.temp}`,
    [MainDir.volumes]: `${MainDirPath.docker}/${MainDir.volumes}`,
    [MainDir.previews]: `${MainDirPath.docker}/${MainDir.previews}`,
  },
} as const);

export enum Processors {
  fileProcessor = 'file-processing',
  exifProcessor = 'exif-processing',
}

export const Concurrency = Object.freeze({
  [Processors.fileProcessor]: 3,
  [Processors.exifProcessor]: 3,
});

export enum SupportedImageExtensions {
  jpg = 'jpg',
  jpeg = 'jpeg',
  png = 'png',
  heic = 'heic',
  gif = 'gif',
}

export enum SupportedVideoExtensions {
  mp4 = 'mp4',
  mov = 'mov',
  avi = 'avi',
  wmv = 'wmv',
}

export const SUPPORTED_IMAGE_EXTENSIONS: Array<
  SupportedImageExtensions | Uppercase<SupportedImageExtensions>
> = [
  ...Object.values(SupportedImageExtensions),
  ...Object.values(SupportedImageExtensions).map(
    (ext) => ext.toUpperCase() as Uppercase<SupportedImageExtensions>,
  ),
];

export const SUPPORTED_VIDEO_EXTENSIONS: Array<
  SupportedVideoExtensions | Uppercase<SupportedVideoExtensions>
> = [
  ...Object.values(SupportedVideoExtensions),
  ...Object.values(SupportedVideoExtensions).map(
    (ext) => ext.toUpperCase() as Uppercase<SupportedVideoExtensions>,
  ),
];

export const SUPPORTED_IMAGE_MIMETYPES = Object.values(
  SupportedImageExtensions,
).map((mimetype): SupportedMimetypes['image'] => `image/${mimetype}`);

export const SUPPORTED_VIDEO_MIMETYPES = Object.values(
  SupportedVideoExtensions,
).map((mimetype): SupportedMimetypes['video'] => `video/${mimetype}`);

export const SUPPORTED_MIMETYPES = [
  ...SUPPORTED_IMAGE_MIMETYPES,
  ...SUPPORTED_VIDEO_MIMETYPES,
];

export type SupportedExtensions =
  | SupportedImageExtensions
  | SupportedVideoExtensions;

// TODO: remove uppercase extensions, use 'i' to check case-insensitive
export const SUPPORTED_MIMETYPE_REGEX = new RegExp(
  `^(${SUPPORTED_MIMETYPES.join('|')})$`,
  'i', // 'i' for case-insensitive
);

// Adjust the regex to match a dot followed by one of the extensions at the end of a string
export const SUPPORTED_EXTENSIONS_REGEX = new RegExp(
  `\\.(${[...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_VIDEO_EXTENSIONS].join('|')})$`,
  'i', // 'i' for case-insensitive
);
