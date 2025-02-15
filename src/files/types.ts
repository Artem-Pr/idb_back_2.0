import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithExt,
} from 'src/common/types';
import type { StaticPath } from 'src/config/config.service';
import { Media } from './entities/media.entity';
import type { CreatePreviewJob } from 'src/jobs/files.processor';
import type { UpdatedFieldsInputDto } from './dto/update-files-input.dto';
import { SortingFieldList } from './mediaDB.service';

export interface ProcessFile extends Express.Multer.File {
  filename: CreatePreviewJob['fileName'];
  mimetype: CreatePreviewJob['fileType'];
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
  staticVideoFullSize: StaticPath<DBFullSizePath> | null;
}

export interface FileProperties extends Omit<MediaOutput, 'filePath'> {
  filePath: null; // We dont need it for upload
}

export type DuplicateFile = Pick<
  Media,
  'filePath' | 'originalName' | 'mimetype' | 'exif'
> &
  StaticPathsObj;

export enum Sort {
  ASC = 1,
  DESC = -1,
}

export type SortingObject = Partial<Record<SortingFieldList, Sort>>;

// TODO: I need to keep it here to avoid circular dependency
export type SortingFieldListInputDto = Exclude<SortingFieldList, '_id'> | 'id';
export type SortingObjectInputDto = Partial<
  Record<SortingFieldListInputDto, Sort>
>;
