import { IsArray, IsNotEmpty } from 'class-validator';
import type { FileNameWithExt } from 'src/common/types';
import { IsValidFileName } from 'src/common/validators';

export class CheckDuplicatesOriginalNamesInputDto {
  @IsArray({ message: 'originalNames must be an array' })
  @IsValidFileName({ each: true })
  @IsNotEmpty({ each: true, message: 'originalNames must not be empty' })
  originalNames: FileNameWithExt[];
}
