import { DBCollections } from 'src/common/constants';
import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import type { ObjectId } from 'mongodb';

export enum ExifValueType {
  STRING = 'string',
  NUMBER = 'number',
  STRING_ARRAY = 'string[]',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}

@Entity(DBCollections.exifKeys)
export class ExifKeys {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  @Index({ unique: true })
  name: string;

  @Column()
  type: ExifValueType;
}
