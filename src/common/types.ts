import {
  Envs,
  Folders,
  MainDir,
  PreviewPostfix,
  SupportedImageExtensions,
  SupportedVideoExtensions,
} from './constants';

type YYYYMMDD = string;

export type ConvertSlashToDash<T> =
  T extends `${infer Prefix}/${infer Extension}` ? `${Prefix}-${Extension}` : T;

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

type NormalizedMainDir<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = (typeof Folders)[Env][MainFolder];

export type NormalizedImagePath<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = `${NormalizedMainDir<Env, MainFolder>}/${FileNameWithImageExt}`;

export type NormalizedVideoPath<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = `${NormalizedMainDir<Env, MainFolder>}/${FileNameWithVideoExt}`;

export type NormalizedMediaPath = NormalizedImagePath | NormalizedVideoPath;

type PreviewOrFullSizeName<T extends PreviewPostfix> =
  `${string}-${T}.${SupportedImageExtensions.jpg}`;

export type PreviewName = PreviewOrFullSizeName<PreviewPostfix.preview>;
export type PreviewPath = `${MainDir}/${PreviewName}`;
export type PreviewNormalizedPath<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = `${NormalizedMainDir<Env, MainFolder>}/${PreviewName}`;

export type FullSizeName = PreviewOrFullSizeName<PreviewPostfix.fullSize>;
export type FullSizePath = `${MainDir}/${FullSizeName}`;
export type FullSizeNormalizedPath<
  Env extends Envs = Envs,
  MainFolder extends MainDir = MainDir,
> = `${NormalizedMainDir<Env, MainFolder>}/${FullSizeName}`;

export type PathWithMainDir = `${MainDir}/${FileNameWithExt}`;

export type DBFilePath = `/${FileNameWithExt}`;
export type DBPreviewPath = `/${PreviewName}`;
export type DBFullSizePath = `/${FullSizeName}`;
export type NameWithPreviewPostfix<
  T extends FileNameWithExt,
  P extends PreviewPostfix = PreviewPostfix,
> = `${RemoveExtension<T>}-${P}.${SupportedImageExtensions.jpg}`;

export type PreviewDirDateName = `${YYYYMMDD} - originalDate`;

export type RelativePreviewDirectory<
  TMimeType extends
    SupportedMimetypes['allFiles'] = SupportedMimetypes['allFiles'],
  TPostFix extends PreviewPostfix = PreviewPostfix,
> = `/${ConvertSlashToDash<TMimeType>}/${TPostFix}/${PreviewDirDateName}/${PreviewOrFullSizeName<TPostFix>}`;

export type NormalizedPreviewDirectory<
  TMimeType extends
    SupportedMimetypes['allFiles'] = SupportedMimetypes['allFiles'],
  TPostFix extends PreviewPostfix = PreviewPostfix,
  Env extends Envs = Envs,
> = `${NormalizedMainDir<Env, MainDir.previews>}${RelativePreviewDirectory<TMimeType, TPostFix>}`;
