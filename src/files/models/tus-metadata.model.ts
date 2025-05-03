import type { FileNameWithExt, SupportedMimetypes } from 'src/common/types';
import {
  validateMimeType,
  validateFileName,
} from 'src/common/validators/tusValidators';

export interface TusMetadata {
  changeDate: number;
  filename: FileNameWithExt;
  filetype: SupportedMimetypes['allFiles'];
  originalFilename: FileNameWithExt;
  size: number;
}

export interface RawTusMetadata
  extends Omit<TusMetadata, 'size' | 'changeDate'> {
  name: TusMetadata['filename'];
  type: TusMetadata['filetype'];
  size: number | string;
  changeDate: number | string;
}

export function assertRawTusMetadata(
  metadata: RawTusMetadata | Record<string, string | null> | undefined,
): asserts metadata is RawTusMetadata {
  if (!metadata) {
    throw new Error('Metadata is undefined');
  }
  if (!metadata.filename) {
    throw new Error('Metadata filename is undefined');
  }
  if (!metadata.filetype) {
    throw new Error('Metadata filetype is undefined');
  }
  if (!metadata.name) {
    throw new Error('Metadata filename is undefined');
  }
  if (!metadata.type) {
    throw new Error('Metadata filetype is undefined');
  }
  if (!metadata.changeDate || isNaN(Number(metadata.changeDate))) {
    throw new Error('Metadata changeDate is undefined');
  }
  if (!metadata.size || isNaN(Number(metadata.size))) {
    throw new Error('Metadata size is not a number');
  }

  validateMimeType(metadata.filetype);
  validateFileName(metadata.filename);
}
