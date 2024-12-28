import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class MatchNumbersOfFilesTestInputDto {
  @Type(() => Number)
  @IsInt()
  pid: number;
}
