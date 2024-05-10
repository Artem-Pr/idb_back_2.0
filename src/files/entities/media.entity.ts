import type { Tags } from 'exiftool-vendored';
import { DBCollections } from 'src/common/constants';
import {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithExt,
  SupportedMimetypes,
} from 'src/common/types';
import { Entity, ObjectIdColumn, Column, ObjectId, Index } from 'typeorm';

@Entity(DBCollections.photos)
export class Media {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  @Index()
  originalName: FileNameWithExt;

  @Column()
  mimetype: SupportedMimetypes['allFiles'];

  @Column()
  size: number;

  @Column()
  megapixels?: number;

  @Column()
  imageSize?: string;

  @Column('array')
  @Index()
  keywords: string | string[];

  @Column()
  changeDate?: number | string;

  @Column()
  @Index()
  originalDate?: Date; // TODO: check type

  @Column()
  @Index()
  filePath: DBFilePath;

  @Column()
  preview: DBPreviewPath;

  @Column()
  fullSizeJpg?: DBFullSizePath;

  @Column()
  rating?: number;

  @Column()
  description?: string;

  @Column()
  timeStamp?: string; // 00:00:00.100

  @Column()
  exif: Tags;
}
