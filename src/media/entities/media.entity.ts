import { DBCollections } from 'src/common/constants';
import { Entity, ObjectIdColumn, Column, ObjectId, Index } from 'typeorm';

@Entity(DBCollections.photos)
export class Media {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  @Index()
  originalName: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  @Column()
  megapixels: number;

  @Column()
  imageSize: string;

  @Column('array')
  @Index()
  keywords: string[];

  @Column()
  changeDate: number;

  @Column()
  @Index()
  originalDate: Date; // TODO: check type

  @Column()
  @Index()
  filePath: string;

  @Column()
  preview: string;
}
