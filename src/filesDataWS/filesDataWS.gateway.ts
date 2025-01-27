import { SyncPreviewsWSService } from './syncPreviewsWS.service';
import {
  forwardRef,
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { CustomLogger } from 'src/logger/logger.service';
import * as WebSocket from 'ws';
import { FilesDataWSActionOutputDto } from './dto/files-data-ws-output.dto';
import { FilesDataWSActionInputDto } from './dto/files-data-ws-input.dto';
import { WSApiStatus, WebSocketActions } from './constants';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { CreatePreviewsWSService } from './createPreviewsWS.service';

@Injectable()
export class FilesDataWSGateway
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new CustomLogger(FilesDataWSGateway.name);
  private wss: WebSocket.Server;
  private client: WebSocket;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SyncPreviewsWSService))
    private readonly syncPreviewsWSService: SyncPreviewsWSService,
    @Inject(forwardRef(() => CreatePreviewsWSService))
    private readonly createPreviewsWS: CreatePreviewsWSService,
  ) {}

  send(request: FilesDataWSActionOutputDto) {
    if (this.client.readyState !== WebSocket.OPEN) {
      this.logger.errorWSOut('Client is not open');
      return;
    }
    this.client.send(request.stringify());

    if (request.data.status === WSApiStatus.ERROR) {
      this.logger.errorWSOut('web-sockets', request.stringify());
    } else {
      this.logger.logWSOut(request.action, request.dataStringify(false));
    }
  }

  onMessage(filesDataAction: FilesDataWSActionInputDto) {
    switch (filesDataAction.action) {
      case WebSocketActions.SYNC_PREVIEWS:
        this.syncPreviewsWSService.startProcess();
        break;
      case WebSocketActions.CREATE_PREVIEWS:
        this.createPreviewsWS.startProcess(
          filesDataAction.data || {
            folderPath: '',
            mimeTypes: [],
          },
        );
        break;
      case WebSocketActions.CREATE_PREVIEWS_STOP:
        this.createPreviewsWS.stopProcess();
        break;
      default:
        this.send(
          new FilesDataWSActionOutputDto(null, {
            status: WSApiStatus.ERROR,
            message: 'Unknown action',
          }),
        );
        break;
    }
  }

  onModuleInit() {
    this.wss = new WebSocket.Server({ port: this.configService.wsPort });

    this.wss.on('connection', (ws: WebSocket) => {
      this.client = ws;
      this.logger.debug('Client connected');

      ws.on('message', async (message: string) => {
        this.logger.logWSIn(message);
        let filesDataAction = new FilesDataWSActionInputDto();
        filesDataAction.action = WebSocketActions.UNKNOWN_ACTION;

        try {
          filesDataAction = plainToInstance(
            FilesDataWSActionInputDto,
            JSON.parse(message),
          );
          await validateOrReject(filesDataAction);
          this.onMessage(filesDataAction);
        } catch (error) {
          if (Array.isArray(error)) {
            error.forEach((e) => {
              const isWrongAction = e.property === 'action';
              const ErrorAction = new FilesDataWSActionOutputDto(
                isWrongAction
                  ? WebSocketActions.UNKNOWN_ACTION
                  : filesDataAction.action,
                {
                  status: WSApiStatus.ERROR,
                  message: 'Action validation error',
                  data: e.constraints,
                },
              );

              this.send(ErrorAction);
            });
          } else {
            const ErrorAction = new FilesDataWSActionOutputDto(
              filesDataAction.action,
              {
                status: WSApiStatus.ERROR,
                message: 'Bad request',
                data: error?.message || error,
              },
            );
            this.send(ErrorAction);
          }
        }
      });

      ws.on('close', () => {
        this.logger.debug('Client disconnected');
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
      });
    });

    this.logger.debug(
      `WebSocket server started on ws://localhost:${this.wss.options.port}`,
    );
  }

  onModuleDestroy() {
    this.wss.close(() => {
      this.logger.debug('WebSocket server closed');
    });
  }

  onApplicationShutdown() {
    this.wss.close(() => {
      this.logger.debug('Shutting down WebSocket server...');
    });
  }
}
