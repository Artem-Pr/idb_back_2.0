import type { Media } from '../entities/media.entity';

export interface UpdateFilesOutputDto {
  response: Media[];
  errors: string[]; // TODO: better to use Error object with code and message instead of string
}
