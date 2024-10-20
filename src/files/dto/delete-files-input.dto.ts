import { IsArray, IsDefined, IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteFilesInputDto {
  @IsDefined()
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsMongoId({ each: true })
  ids: string[];
}
