import type { DBFilePath } from 'src/common/types';
import type { DuplicateFile } from '../types';

export interface CheckDuplicatesFilePathsOutputDto
  extends Record<DBFilePath, DuplicateFile[]> {}
