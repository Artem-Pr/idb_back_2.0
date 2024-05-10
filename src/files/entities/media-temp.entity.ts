import { DBCollections } from 'src/common/constants';
import { Entity } from 'typeorm';
import { Media } from './media.entity';

@Entity(DBCollections.temp)
export class MediaTemp extends Media {}
