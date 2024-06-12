import { FileNameWithExt } from 'src/common/types';
import type { DuplicateFile } from '../types';

export interface CheckDuplicatesOriginalNamesOutputDto
  extends Record<FileNameWithExt, DuplicateFile[]> {}
