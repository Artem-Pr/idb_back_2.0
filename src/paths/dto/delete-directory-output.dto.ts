import type { Media } from 'src/files/entities/media.entity';

export interface DeleteDirectoryOutputDto {
  directoriesToRemove: string[];
  mediaList: Media[];
}
