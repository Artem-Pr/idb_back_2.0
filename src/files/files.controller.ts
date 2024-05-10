import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ControllerPrefix } from 'src/common/constants';
import { isSupportedExtension, isSupportedMimeType } from 'src/common/utils';
import { FilesService } from './files.service';
import { FileMediaInterceptor } from './file.interceptor';

@Controller() // TODO : Define a POST endpoint at /files/uploadItem : @Controller('file')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post(ControllerPrefix.uploadFile)
  @UseInterceptors(FileMediaInterceptor)
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File upload failed');
    }
    if (
      !isSupportedExtension(file.filename) ||
      !isSupportedMimeType(file.mimetype) ||
      !isSupportedExtension(file.originalname)
    ) {
      throw new HttpException(
        'Unsupported file type',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    return this.filesService
      .processFile({
        ...file,
        filename: file.filename,
        mimetype: file.mimetype,
        originalname: file.originalname,
      })
      .then((response) => response);
  }
}
