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

type WithNullOnly<T> = Exclude<T, undefined> | null;
type ExifDescription = WithNullOnly<
  Tags['Description' | 'ImageDescription' | 'UserComment' | 'Caption-Abstract']
>;
type ExifMegapixels = WithNullOnly<Tags['Megapixels']>;
type ExifImageSize = WithNullOnly<Tags['ImageSize']>;
type ExifKeywords = Exclude<Tags['Keywords' | 'Subject'], string | undefined>;
type ExifRating = WithNullOnly<Tags['Rating']>;

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
  megapixels: ExifMegapixels;

  @Column()
  imageSize: ExifImageSize;

  @Column('array')
  @Index()
  keywords: ExifKeywords;

  @Column()
  changeDate: number | null;

  @Column()
  @Index()
  originalDate: Date;

  @Column()
  @Index()
  filePath: DBFilePath;

  @Column()
  preview: DBPreviewPath;

  @Column()
  fullSizeJpg: DBFullSizePath | null;

  @Column()
  rating: ExifRating;

  @Column()
  description: ExifDescription;

  @Column()
  timeStamp: string; // default: 00:00:00.000

  @Column()
  exif: Tags;
}
