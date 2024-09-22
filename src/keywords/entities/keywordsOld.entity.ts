import { DBCollections } from 'src/common/constants';
import { Entity, ObjectIdColumn, Column } from 'typeorm';
import type { ObjectId } from 'mongodb';

@Entity(DBCollections.config)
export class KeywordOld {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column('array')
  keywordsArr: string[];
}
