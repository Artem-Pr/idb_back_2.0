import type { FullSizePath, PreviewPath } from 'src/common/types';

export class ImageStoreServiceOutputDto {
  fullSizePath?: FullSizePath;
  previewPath: PreviewPath;
}
