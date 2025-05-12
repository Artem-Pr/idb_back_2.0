import { Injectable, OnModuleInit } from '@nestjs/common';
import { EVENTS, ServerOptions, Server } from '@tus/server';
import { FileStore } from '@tus/file-store';
import { v4 as uuidV4 } from 'uuid';
import { ControllerPrefix, MainDir } from 'src/common/constants';
import type { IncomingMessage, ServerResponse } from 'http';
import { CustomLogger } from 'src/logger/logger.service';
import { ConfigService } from 'src/config/config.service';
import { extname } from 'path';
import type { TusMetadata } from './models/tus-metadata.model';
import { assertRawTusMetadata } from './models/tus-metadata.model';
import { validateFileName } from 'src/common/validators/tusValidators';

interface TusResponsePromise {
  metadata: TusMetadata;
  reject: (error?: any) => void;
  resolve: (
    tusResponse: Awaited<ReturnType<Defined<ServerOptions['onUploadFinish']>>>,
  ) => void;
}

const TUS_UPLOAD_PATH = `/${ControllerPrefix.tusUpload}`;

@Injectable()
export class TusService implements OnModuleInit {
  private logger = new CustomLogger(TusService.name, { timestamp: true });
  private tusServer: Server;
  private externalErrors: {
    [key: string]: Error;
  } = {};
  private tusResponsePromises: {
    [key: string]: (resObject: TusResponsePromise) => void;
  } = {};

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.tusServer = new Server({
      path: TUS_UPLOAD_PATH,
      datastore: new FileStore({
        directory: this.configService.rootPaths[MainDir.temp],
      }),
      namingFunction: (_req, metadata) => {
        const randomName = uuidV4();
        const fileExtName = extname(metadata?.filename || '');
        return `${randomName}${fileExtName}`;
      },
      onUploadCreate: async (_req, upload) => {
        assertRawTusMetadata(upload.metadata);

        return {
          metadata: upload.metadata,
        };
      },
      onResponseError: async (_req, err) => {
        const errorMessage =
          err instanceof Error ? err.message : err.body || 'Unknown error';
        return {
          status_code: 400,
          body: JSON.stringify({ error: errorMessage }),
        };
      },
      onIncomingRequest: async (_req, uploadId) => {
        if (this.externalErrors[uploadId]) {
          throw this.externalErrors[uploadId];
        }
      },
      onUploadFinish: async (_req, upload) => {
        return new Promise((resolve, reject) => {
          assertRawTusMetadata(upload.metadata);
          validateFileName(upload.id);
          const tusMetadata: TusMetadata = {
            changeDate: Number(upload.metadata.changeDate),
            filename: upload.id,
            filetype: upload.metadata.filetype,
            originalFilename: upload.metadata.filename,
            size: Number(upload.metadata.size),
          };

          this.tusResponsePromises[upload.id]({
            metadata: tusMetadata,
            resolve,
            reject: (error) => {
              this.externalErrors[upload.id] = error;
              reject(error);
            },
          });
        });
      },
    });

    this.tusServer.on(EVENTS.POST_CREATE, (_req, upload) => {
      this.logger.logMessage('Upload POST_CREATE', upload.metadata);
    });
    this.tusServer.on(EVENTS.POST_RECEIVE, (_req, upload) => {
      this.logger.logMessage(
        `Upload POST_RECEIVE - ${upload.metadata?.filename}`,
        {
          size: upload.size,
          offset: upload.offset,
        },
      );
    });
    this.tusServer.on(EVENTS.POST_FINISH, (_req, _res, upload) => {
      this.logger.logMessage(
        `Upload POST_FINISH - ${upload.metadata?.filename}`,
      );
    });

    this.logger.verbose(`Tus Server initialized`);
  }

  async handle(req: Request, res: Response) {
    this.tusServer.handle(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );

    const fileName = req.url.replace(`${TUS_UPLOAD_PATH}/`, '');

    return new Promise<TusResponsePromise>((resolve) => {
      this.tusResponsePromises[fileName] = resolve;
    });
  }
}
