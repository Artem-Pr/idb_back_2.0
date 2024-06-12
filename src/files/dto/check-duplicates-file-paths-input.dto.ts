import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import type { DBFilePath } from 'src/common/types';

export class CheckDuplicatesFilePathsInputDto {
  @IsArray({ message: 'filePaths must be an array' })
  @IsString({
    each: true,
    message: 'filePaths must be an array of strings',
  })
  @IsNotEmpty({ each: true, message: 'filePaths must not be empty' })
  filePaths: DBFilePath[];
}
