import { DBCollections } from 'src/common/constants';
import { Entity, ObjectIdColumn, Column, ObjectId } from 'typeorm';

@Entity(DBCollections.keywords)
export class Keywords {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  keyword: string;
}
