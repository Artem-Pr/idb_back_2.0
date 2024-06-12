import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithExt,
} from 'src/common/types';
import type { StaticPath } from 'src/config/config.service';
import type { Media } from './entities/media.entity';
import type { FileProcessingJob } from 'src/jobs/files.processor';

export interface ProcessFile extends Express.Multer.File {
  filename: FileProcessingJob['fileName'];
  mimetype: FileProcessingJob['fileType'];
  originalname: FileNameWithExt;
}

export interface FilePaths {
  filePath: DBFilePath;
  fullSizePath?: DBFullSizePath;
  previewPath: DBPreviewPath;
}

export interface GetSameFilesIfExist
  extends Partial<Pick<Media, 'originalName' | 'filePath'>> {}

export interface StaticPathsObj {
  staticPath: StaticPath<DBFilePath | DBFullSizePath>;
  staticPreview: StaticPath<DBPreviewPath>;
}

export interface FileProperties
  extends StaticPathsObj,
    Omit<Media, '_id' | 'preview' | 'fullSizeJpg' | 'exif' | 'filePath'> {
  id: string;
  duplicates: DuplicateFile[];
  filePath: null; // We dont need it for upload
}

export type DuplicateFile = Pick<
  Media,
  'filePath' | 'originalName' | 'mimetype'
> &
  StaticPathsObj;
