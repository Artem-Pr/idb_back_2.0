import { Injectable, PipeTransform } from '@nestjs/common';
import { decodeString } from '../utils';

@Injectable()
export class MulterFilenamePipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    file.originalname = decodeString(file.originalname);

    return file;
  }
}
