import {
  SupportedImageMimetypes,
  SupportedVideoMimeTypes,
} from 'src/common/constants';
import type { FileNameWithExt } from 'src/common/types';
import { IsValidFileName, IsValidMimeType } from 'src/common/validators';

export class FileUploadDto {
  @IsValidFileName()
  filename: FileNameWithExt;

  @IsValidMimeType()
  mimetype: SupportedImageMimetypes | SupportedVideoMimeTypes;

  @IsValidFileName({ message: 'Invalid original file name' })
  originalname: FileNameWithExt;
}
