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
import { UpdateExifWSService } from './updateExifWS.service';
import {
  WsJwtAuthGuard,
  AuthenticatedWebSocket,
} from 'src/auth/guards/ws-jwt-auth.guard';

@Injectable()
export class FilesDataWSGateway
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new CustomLogger(FilesDataWSGateway.name);
  private wss: WebSocket.Server;
  private authenticatedClients: Map<AuthenticatedWebSocket, string> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SyncPreviewsWSService))
    private readonly syncPreviewsWSService: SyncPreviewsWSService,
    @Inject(forwardRef(() => CreatePreviewsWSService))
    private readonly createPreviewsWS: CreatePreviewsWSService,
    @Inject(forwardRef(() => UpdateExifWSService))
    private readonly updateExifWS: UpdateExifWSService,
    private readonly authGuard: WsJwtAuthGuard,
  ) {}

  send(request: FilesDataWSActionOutputDto, client?: AuthenticatedWebSocket) {
    const targetClient = client || this.getFirstAuthenticatedClient();

    if (!targetClient || targetClient.readyState !== WebSocket.OPEN) {
      this.logger.errorWSOut('Client is not open or not found');
      return;
    }

    targetClient.send(request.stringify());

    if (request.data.status === WSApiStatus.ERROR) {
      this.logger.errorWSOut('web-sockets', request.stringify());
    } else {
      this.logger.logWSOut(request.action, request.dataStringify(false));
    }
  }

  broadcast(request: FilesDataWSActionOutputDto) {
    this.authenticatedClients.forEach((_userId, client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.send(request, client);
      }
    });
  }

  private getFirstAuthenticatedClient(): AuthenticatedWebSocket | null {
    for (const [client] of this.authenticatedClients) {
      if (client.readyState === WebSocket.OPEN) {
        return client;
      }
    }
    return null;
  }

  async onMessage(
    filesDataAction: FilesDataWSActionInputDto,
    client: AuthenticatedWebSocket,
  ) {
    // Verify client is still authenticated
    if (!this.authenticatedClients.has(client)) {
      this.sendAuthError(client, 'Client not authenticated');
      return;
    }

    const user = client.user!;
    this.logger.debug(
      `Processing action ${filesDataAction.action} for user ${user.username}`,
    );

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
      case WebSocketActions.UPDATE_EXIF:
        this.updateExifWS.startProcess(
          filesDataAction.data || {
            folderPath: '',
            mimeTypes: [],
          },
        );
        break;
      case WebSocketActions.UPDATE_EXIF_STOP:
        this.updateExifWS.stopProcess();
        break;
      default:
        this.send(
          new FilesDataWSActionOutputDto(null, {
            status: WSApiStatus.ERROR,
            message: 'Unknown action',
          }),
          client,
        );
        break;
    }
  }

  private sendAuthError(client: WebSocket, message: string) {
    const errorResponse = new FilesDataWSActionOutputDto(
      WebSocketActions.UNKNOWN_ACTION,
      {
        status: WSApiStatus.ERROR,
        message: `Authentication Error: ${message}`,
      },
    );

    if (client.readyState === WebSocket.OPEN) {
      client.send(errorResponse.stringify());
    }

    client.close(1008, message); // Policy Violation close code
  }

  onModuleInit() {
    this.wss = new WebSocket.Server({ port: this.configService.wsPort });

    this.wss.on(
      'connection',
      async (ws: AuthenticatedWebSocket, request: any) => {
        this.logger.debug('New WebSocket connection attempt');

        // Attach the request to the WebSocket for token extraction
        (ws as any).upgradeReq = request;

        // Authenticate the connection
        const isAuthenticated =
          await WsJwtAuthGuard.validateWebSocketConnection(ws, this.authGuard);

        if (!isAuthenticated) {
          this.logger.warn('WebSocket connection failed authentication');
          this.sendAuthError(ws, 'Authentication failed');
          return;
        }

        // Add to authenticated clients
        this.authenticatedClients.set(ws, ws.user!.userId);
        this.logger.debug(
          `Client authenticated: ${ws.user!.username} (${ws.user!.userId})`,
        );

        // Send successful connection response
        const welcomeMessage = new FilesDataWSActionOutputDto(
          WebSocketActions.UNKNOWN_ACTION,
          {
            status: WSApiStatus.READY,
            message: `Connected as ${ws.user!.username}`,
            data: {
              user: {
                username: ws.user!.username,
                role: ws.user!.role,
              },
            },
          },
        );
        ws.send(welcomeMessage.stringify());

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
            await this.onMessage(filesDataAction, ws);
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

                this.send(ErrorAction, ws);
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
              this.send(ErrorAction, ws);
            }
          }
        });

        ws.on('close', () => {
          this.authenticatedClients.delete(ws);
          this.logger.debug(
            `Client disconnected: ${ws.user?.username || 'unknown'}`,
          );
        });

        ws.on('error', (error) => {
          this.logger.error(
            `WebSocket error for user ${ws.user?.username || 'unknown'}:`,
            error,
          );
          this.authenticatedClients.delete(ws);
        });
      },
    );

    this.logger.verbose(
      `WebSocket server with authentication started on ws://localhost:${this.wss.options.port}`,
    );
  }

  onModuleDestroy() {
    // Close all authenticated connections
    this.authenticatedClients.forEach((_userId, client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server shutting down');
      }
    });
    this.authenticatedClients.clear();

    this.wss.close(() => {
      this.logger.verbose('WebSocket server closed');
    });
  }

  onApplicationShutdown() {
    // Close all authenticated connections
    this.authenticatedClients.forEach((_userId, client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Application shutting down');
      }
    });
    this.authenticatedClients.clear();

    this.wss.close(() => {
      this.logger.verbose('Shutting down WebSocket server...');
    });
  }
}
