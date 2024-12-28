import { ImageStoreServiceInputDto } from 'src/jobs/dto/image-store-service-input.dto';
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
export const DEFAULT_TIME_STAMP = '00:00:00.000';

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

export type PreviewServiceOptions = {
  quality?: ImageStoreServiceInputDto['jpegOptionsQuality'];
  fit?: ImageStoreServiceInputDto['resizeOptionsFit'];
  width?: ImageStoreServiceInputDto['resizeOptionsWidth'];
  height?: ImageStoreServiceInputDto['resizeOptionsHeight'];
};

export type VideoPreviewOptions = {
  timestamps?: ScreenshotsConfig['timestamps'];
  thumbnailSize?: ScreenshotsConfig['size'];
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
  keywords = 'keywords',
  paths = 'paths',
}

export enum DBConfigConstants {
  keywords = 'keywords',
  paths = 'paths',
}

export enum ControllerPrefix {
  keywords = 'keywords',
  oldKeywords = 'old-keywords',
  keywordsItem = 'keyword/:keyword', // TODO: rename to unused-keyword/:keyword
  paths = 'paths',
  pathsOld = 'paths-old',
  unusedKeywords = 'unused-keywords',
  unusedKeywordsOld = 'unused-keywords-old',
  checkDirectory = 'check-directory',
  checkDirectoryOld = 'check-directory-old',
  checkDuplicates = 'check-duplicates',
  checkDuplicatesByFilePaths = 'check-duplicates-by-file-paths',
  saveFiles = 'save-files',
  getFiles = 'filtered-photos',
  uploadFile = 'upload-file',
  updateFiles = 'update-files',
  deleteFiles = 'delete-files',
  moveKeywordsToNewCollection = 'move-keywords-to-new-collection',
  movePathsToNewCollection = 'move-paths-to-new-collection',
  directory = 'directory',
  cleanTemp = 'clean-temp',
  updateMediaEntities = 'update-media-entities',
  testSystemMatchFiles = 'test-system/matching-files',
}

export enum PreviewPostfix {
  preview = 'preview',
  fullSize = 'fullSize',
}

export enum MainDir {
  temp = 'temp',
  volumes = 'volumes',
  previews = 'previews',
}

export enum MainDirPath {
  // dev = '../../test-data',
  dev = '/Volumes/Lexar_SL500/MEGA_sync/IDBase-test',
  prod = '/Users/artempriadkin/Development/test-data',
  docker = '/app',
  test = 'test-data',
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
    [MainDir.temp]: `${MainDirPath.test}/${MainDir.temp}`,
    [MainDir.volumes]: `${MainDirPath.test}/${MainDir.volumes}`,
    [MainDir.previews]: `${MainDirPath.test}/${MainDir.previews}`,
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
  exifProcessor = 'exif-processing',
  fileProcessor = 'file-processing',
}

export const Concurrency = Object.freeze({
  [Processors.fileProcessor]: 5,
  [Processors.exifProcessor]: 5,
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

export enum SupportedImageMimetypes {
  jpeg = 'image/jpeg',
  jpg = 'image/jpg',
  png = 'image/png',
  heic = 'image/heic',
  gif = 'image/gif',
  dng = 'image/x-adobe-dng',
}

export enum SupportedVideoMimeTypes {
  avi = 'video/x-msvideo',
  flv = 'video/x-flv',
  mkv = 'video/x-matroska',
  mov = 'video/quicktime',
  mp4 = 'video/mp4',
  mpeg = 'video/mpeg',
  ogg = 'video/ogg',
  webm = 'video/webm',
  wmv = 'video/x-ms-wmv',
}

export const SUPPORTED_IMAGE_EXTENSIONS: Array<SupportedImageExtensions> =
  Object.values(SupportedImageExtensions);

export const SUPPORTED_VIDEO_EXTENSIONS: Array<SupportedVideoExtensions> =
  Object.values(SupportedVideoExtensions);

export const SUPPORTED_IMAGE_MIMETYPES = Object.values(SupportedImageMimetypes);
export const SUPPORTED_VIDEO_MIMETYPES = Object.values(SupportedVideoMimeTypes);

export const SUPPORTED_MIMETYPES = [
  ...SUPPORTED_IMAGE_MIMETYPES,
  ...SUPPORTED_VIDEO_MIMETYPES,
];

export type SupportedExtensions =
  | SupportedImageExtensions
  | SupportedVideoExtensions;

export const SUPPORTED_MIMETYPE_REGEX = new RegExp(
  `^(${SUPPORTED_MIMETYPES.join('|')})$`,
  'i', // 'i' for case-insensitive
);

// Adjust the regex to match a dot followed by one of the extensions at the end of a string
export const SUPPORTED_EXTENSIONS_REGEX = new RegExp(
  `\\.(${[...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_VIDEO_EXTENSIONS].join('|')})$`,
  'i', // 'i' for case-insensitive
);

export const SUPPORTED_IMAGE_EXTENSIONS_REGEX = new RegExp(
  `\\.(${SUPPORTED_IMAGE_EXTENSIONS.join('|')})$`,
  'i', // 'i' for case-insensitive
);

export const SUPPORTED_VIDEO_EXTENSIONS_REGEX = new RegExp(
  `\\.(${SUPPORTED_VIDEO_EXTENSIONS.join('|')})$`,
  'i', // 'i' for case-insensitive
);
