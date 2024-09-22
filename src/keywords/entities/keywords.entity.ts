import { DBCollections } from 'src/common/constants';
import { Entity, ObjectIdColumn, Column } from 'typeorm';
import type { ObjectId } from 'mongodb';

@Entity(DBCollections.keywords)
export class Keywords {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  keyword: string;
}
