import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import type { ObjectId } from 'mongodb';

export enum ExifValueType {
  STRING = 'string',
  NUMBER = 'number',
  STRING_ARRAY = 'string_array',
  LONG_STRING = 'long_string',
  NOT_SUPPORTED = 'not_supported',
}

@Entity('exif_keys')
export class ExifKeys {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  @Index({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: ExifValueType,
    default: ExifValueType.STRING,
  })
  type: ExifValueType;

  @Column({ type: 'array', nullable: true, default: null })
  typeConflicts: ExifValueType[] | null;
}
