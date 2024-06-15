import { IsArray, IsNotEmpty } from 'class-validator';
import type { DBFilePath } from 'src/common/types';
import { IsValidFilePath } from 'src/common/validators';

export class CheckDuplicatesFilePathsInputDto {
  @IsArray({ message: 'filePaths must be an array' })
  @IsValidFilePath({ each: true })
  @IsNotEmpty({ each: true, message: 'filePaths must not be empty' })
  filePaths: DBFilePath[];
}
