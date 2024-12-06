// "sharp": "^0.30.5"
// "@types/sharp": "^0.30.5"

import { MainDir } from 'src/common/constants';

export interface FitEnum {
  contain: 'contain';
  cover: 'cover';
  fill: 'fill';
  inside: 'inside';
  outside: 'outside';
}

interface RGBA {
  r?: number | undefined;
  g?: number | undefined;
  b?: number | undefined;
  alpha?: number | undefined;
}

type Color = string | RGBA;

interface KernelEnum {
  nearest: 'nearest';
  cubic: 'cubic';
  mitchell: 'mitchell';
  lanczos2: 'lanczos2';
  lanczos3: 'lanczos3';
}

export interface ResizeOptions {
  /** Alternative means of specifying width. If both are present this take priority. */
  width?: number | undefined;
  /** Alternative means of specifying height. If both are present this take priority. */
  height?: number | undefined;
  /** How the image should be resized to fit both provided dimensions, one of cover, contain, fill, inside or outside. (optional, default 'cover') */
  fit?: keyof FitEnum | undefined;
  /** Position, gravity or strategy to use when fit is cover or contain. (optional, default 'centre') */
  position?: number | string | undefined;
  /** Background colour when using a fit of contain, parsed by the color module, defaults to black without transparency. (optional, default {r:0,g:0,b:0,alpha:1}) */
  background?: Color | undefined;
  /** The kernel to use for image reduction. (optional, default 'lanczos3') */
  kernel?: keyof KernelEnum | undefined;
  /** Do not enlarge if the width or height are already less than the specified dimensions, equivalent to GraphicsMagick's > geometry option. (optional, default false) */
  withoutEnlargement?: boolean | undefined;
  /** Do not reduce if the width or height are already greater than the specified dimensions, equivalent to GraphicsMagick's < geometry option. (optional, default false) */
  withoutReduction?: boolean | undefined;
  /** Take greater advantage of the JPEG and WebP shrink-on-load feature, which can lead to a slight moiré pattern on some images. (optional, default true) */
  fastShrinkOnLoad?: boolean | undefined;
}

export class ImageStoreServiceInputDto {
  inputMainDirName: MainDir;
  fileNameWithExtension: string;
  outputPreviewMainDirName?: MainDir;
  outputFullSizeMainDirName?: MainDir;
  outputPreviewFilePath?: string;
  outputFullSizeFilePath?: string;
  previewSubfolder?: string;
  fullSizeSubfolder?: string;
  fileType?: string;
  convertHeicToFullSizeJpeg?: 'true' | 'false';
  resizeOptionsWidth?: number;
  resizeOptionsHeight?: number;
  resizeOptionsFit?: ResizeOptions['fit'];
  jpegOptionsQuality?: number;
}
