import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import type { FileNameWithExt } from 'src/common/types';

export class CheckDuplicatesOriginalNamesInputDto {
  @IsArray({ message: 'originalNames must be an array' })
  @IsString({
    each: true,
    message: 'originalNames must be an array of strings',
  })
  @IsNotEmpty({ each: true, message: 'originalNames must not be empty' })
  originalNames: FileNameWithExt[];
}
