import { DBCollections } from 'src/common/constants';
import { Entity, ObjectIdColumn, Column, ObjectId } from 'typeorm';

@Entity(DBCollections.config)
export class KeywordOld {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column('array')
  keywordsArr: string[];
}
