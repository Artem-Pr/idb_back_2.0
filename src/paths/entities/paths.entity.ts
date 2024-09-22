import { DBCollections } from 'src/common/constants';
import { Entity, ObjectIdColumn, Column } from 'typeorm';
import type { ObjectId } from 'mongodb';

@Entity(DBCollections.paths)
export class Paths {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  path: string;
}
