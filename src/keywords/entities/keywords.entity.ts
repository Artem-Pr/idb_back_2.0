import { Entity, ObjectIdColumn, Column, ObjectId } from 'typeorm';

@Entity('config')
export class Keyword {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column('array')
  keywordsArr: string[];
}
