import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithExt,
} from 'src/common/types';
import type { StaticPath } from 'src/config/config.service';
import { Media } from './entities/media.entity';
import type { FileProcessingJob } from 'src/jobs/files.processor';
import type { UpdatedFieldsInputDto } from './dto/update-files-input.dto';

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

export interface FindBy extends UpdatedFieldsInputDto {}

export interface MediaOutput
  extends StaticPathsObj,
    Omit<Media, '_id' | 'preview' | 'fullSizeJpg'> {
  id: string;
  duplicates: DuplicateFile[];
}

export interface StaticPathsObj {
  staticPath: StaticPath<DBFilePath | DBFullSizePath>;
  staticPreview: StaticPath<DBPreviewPath>;
}

export interface FileProperties extends Omit<MediaOutput, 'filePath'> {
  filePath: null; // We dont need it for upload
}

export type DuplicateFile = Pick<
  Media,
  'filePath' | 'originalName' | 'mimetype'
> &
  StaticPathsObj;

export enum Sort {
  ASC = 1,
  DESC = -1,
}

export enum SortingFields {
  id = '_id',
  originalName = 'originalName',
  mimetype = 'mimetype',
  size = 'size',
  megapixels = 'megapixels',
  originalDate = 'originalDate',
  filePath = 'filePath',
  rating = 'rating',
  description = 'description',
}

export type SortingObject = Partial<Record<SortingFields, Sort>>;
