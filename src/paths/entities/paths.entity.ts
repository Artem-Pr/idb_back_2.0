import { DBCollections } from 'src/common/constants';
import { Entity, ObjectIdColumn, Column, ObjectId } from 'typeorm';

@Entity(DBCollections.paths)
export class Paths {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  path: string;
}
