import {
  NestInterceptor,
  Injectable,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MainDir } from 'src/common/constants';
import { ConfigService } from 'src/config/config.service';
import { v4 as uuidV4 } from 'uuid';

const UPLOADING_FILE_FIELD = 'filedata';

@Injectable()
export class FileMediaInterceptor implements NestInterceptor {
  constructor(private configService: ConfigService) {}

  async intercept(context: ExecutionContext, next: CallHandler<any>) {
    const fileIntConst = FileInterceptor(UPLOADING_FILE_FIELD, {
      storage: diskStorage({
        destination: this.configService.rootPaths[MainDir.temp],
        filename: (_req, file, callback) => {
          const randomName = uuidV4();
          const fileExtName = extname(file.originalname);
          callback(null, `${randomName}${fileExtName}`);
        },
      }),
    });

    const fileInt = new fileIntConst();

    return fileInt.intercept(context, next);
  }
}
