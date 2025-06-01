import { DBCollections } from 'src/common/constants';
import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { ObjectId } from 'mongodb';

@Entity(DBCollections.blacklistedTokens)
export class BlacklistedToken {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  @Index()
  token: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
