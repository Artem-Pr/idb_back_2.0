import {
  Envs,
  Folders,
  MainDir,
  PreviewPostfix,
  SupportedImageExtensions,
  SupportedVideoExtensions,
} from './constants';

export type SupportedMimetypes = {
  image: `image/${SupportedImageExtensions}`;
  video: `video/${SupportedVideoExtensions}`;
  allFiles:
    | `image/${SupportedImageExtensions}`
    | `video/${SupportedVideoExtensions}`;
};

export type NormalizedSupportedImageExt =
  | SupportedImageExtensions
  | Uppercase<SupportedImageExtensions>;

export type NormalizedSupportedVideoExt =
  | SupportedVideoExtensions
  | Uppercase<SupportedVideoExtensions>;

export type FileNameWithImageExt = `${string}.${NormalizedSupportedImageExt}`;
export type FileNameWithVideoExt = `${string}.${NormalizedSupportedVideoExt}`;
export type FileNameWithExt = FileNameWithImageExt | FileNameWithVideoExt;
export type RemoveExtension<T extends FileNameWithExt> =
  T extends `${infer R}.${NormalizedSupportedImageExt | NormalizedSupportedVideoExt}`
    ? R
    : T;

export type NormalizedImagePath<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = `${(typeof Folders)[Env][MainFolder]}/${FileNameWithImageExt}`;

export type NormalizedVideoPath<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = `${(typeof Folders)[Env][MainFolder]}/${FileNameWithVideoExt}`;

export type NormalizedPath = NormalizedImagePath | NormalizedVideoPath;

export type PreviewName =
  `${string}${PreviewPostfix.preview}.${SupportedImageExtensions.jpg}`;
export type PreviewPath = `${MainDir}/${PreviewName}`;
export type PreviewNormalizedPath<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = `${(typeof Folders)[Env][MainFolder]}/${PreviewName}`;

export type FullSizeName =
  `${string}${PreviewPostfix.fullSize}.${SupportedImageExtensions.jpg}`;
export type FullSizePath = `${MainDir}/${FullSizeName}`;
export type FullSizeNormalizedPath<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = `${(typeof Folders)[Env][MainFolder]}/${FullSizeName}`;

export type PathWithMainDir = `${MainDir}/${FileNameWithExt}`;

export type DBFilePath = `/${FileNameWithExt}`;
export type DBPreviewPath = `/${PreviewName}`;
export type DBFullSizePath = `/${FullSizeName}`;
