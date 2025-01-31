import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from 'src/config/config.service';
import { CreatePreviewsWSService } from './createPreviewsWS.service';
import { SyncPreviewsWSService } from './syncPreviewsWS.service';
import { UpdateExifWSService } from './updateExifWS.service';
import { CustomLogger } from 'src/logger/logger.service';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import * as WebSocket from 'ws';

jest.mock('ws', () => {
  const WebSocketServerMock = jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
    clients: new Set(),
    options: { port: 1234 },
  }));

  return {
    Server: class WebSocketServer extends WebSocketServerMock {},
    WebSocket: jest.fn(),
  };
});

describe('FilesDataWSGateway', () => {
  let gateway: FilesDataWSGateway;
  let mockConfigService: ConfigService;
  let mockSyncPreviewsWSService: SyncPreviewsWSService;
  let mockCreatePreviewsWSService: CreatePreviewsWSService;
  let mockUpdateExifWSService: UpdateExifWSService;
  let mockLogger: CustomLogger;

  beforeEach(async () => {
    mockConfigService = { wsPort: 1234 } as any;
    mockSyncPreviewsWSService = { startProcess: jest.fn() } as any;
    mockCreatePreviewsWSService = {
      startProcess: jest.fn(),
      stopProcess: jest.fn(),
    } as any;
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      logWSIn: jest.fn(),
      logWSOut: jest.fn(),
      errorWSOut: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesDataWSGateway,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SyncPreviewsWSService, useValue: mockSyncPreviewsWSService },
        {
          provide: CreatePreviewsWSService,
          useValue: mockCreatePreviewsWSService,
        },
        { provide: UpdateExifWSService, useValue: mockUpdateExifWSService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    gateway = module.get<FilesDataWSGateway>(FilesDataWSGateway);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize WebSocket server on module init', () => {
    gateway.onModuleInit();
    expect(WebSocket.Server).toHaveBeenCalledWith({ port: 1234 });
  });
});
