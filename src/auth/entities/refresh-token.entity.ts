import { DBCollections } from 'src/common/constants';
import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { ObjectId } from 'mongodb';

@Entity(DBCollections.refreshTokens)
export class RefreshToken {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  token: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isRevoked: boolean;
}
