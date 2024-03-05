import { IsNotEmpty, IsString } from 'class-validator';

export class CheckDirectoryInputDto {
  @IsString()
  @IsNotEmpty()
  directory: string;
}
