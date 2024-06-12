import type { Tags } from 'exiftool-vendored';
import type { FileProperties } from '../types';

export interface UploadFileOutputDto {
  exif: Tags;
  properties: FileProperties;
}
