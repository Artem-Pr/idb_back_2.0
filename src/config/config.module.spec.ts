import { Test } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigModuleMetadata } from './config.module';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EnvConfigKeys } from 'src/common/constants';

describe('ConfigModule', () => {
  let configService: ConfigService;
  let nestConfigService: NestConfigService;

  beforeEach(async () => {
    // Mock environment variables to prevent console warnings
    process.env[EnvConfigKeys.PORT] = '3000';
    process.env[EnvConfigKeys.HOST] = 'http://localhost';
    process.env[EnvConfigKeys.WS_PORT] = '3001';
    process.env[EnvConfigKeys.WS_HOST] = 'ws://localhost';
    process.env[EnvConfigKeys.NODE_ENV] = 'unit-test';
    process.env[EnvConfigKeys.MONGODB_URI] = 'mongodb://localhost:27017/test';
    process.env[EnvConfigKeys.DB_NAME] = 'test-db';
    process.env[EnvConfigKeys.DB_SYNCHRONIZE] = 'false';
    process.env[EnvConfigKeys.IMAGE_STORE_SERVICE_PORT] = '4000';
    process.env[EnvConfigKeys.IMAGE_STORE_SERVICE_HOST] = 'localhost';
    process.env[EnvConfigKeys.JWT_SECRET] = 'test-jwt-secret';
    process.env[EnvConfigKeys.JWT_EXPIRES_IN] = '1h';
    process.env[EnvConfigKeys.JWT_REFRESH_SECRET] = 'test-jwt-refresh-secret';
    process.env[EnvConfigKeys.JWT_REFRESH_EXPIRES_IN] = '24h';

    const moduleRef =
      await Test.createTestingModule(ConfigModuleMetadata).compile();

    configService = moduleRef.get<ConfigService>(ConfigService);
    nestConfigService = moduleRef.get<NestConfigService>(NestConfigService);
  });

  afterEach(() => {
    // Clean up environment variables after each test
    delete process.env[EnvConfigKeys.PORT];
    delete process.env[EnvConfigKeys.HOST];
    delete process.env[EnvConfigKeys.WS_PORT];
    delete process.env[EnvConfigKeys.WS_HOST];
    delete process.env[EnvConfigKeys.NODE_ENV];
    delete process.env[EnvConfigKeys.MONGODB_URI];
    delete process.env[EnvConfigKeys.DB_NAME];
    delete process.env[EnvConfigKeys.DB_SYNCHRONIZE];
    delete process.env[EnvConfigKeys.IMAGE_STORE_SERVICE_PORT];
    delete process.env[EnvConfigKeys.IMAGE_STORE_SERVICE_HOST];
    delete process.env[EnvConfigKeys.JWT_SECRET];
    delete process.env[EnvConfigKeys.JWT_EXPIRES_IN];
    delete process.env[EnvConfigKeys.JWT_REFRESH_SECRET];
    delete process.env[EnvConfigKeys.JWT_REFRESH_EXPIRES_IN];
  });

  it('should be defined', () => {
    expect(configService).toBeDefined();
  });

  it('should have the correct http port', () => {
    const port = nestConfigService.get(EnvConfigKeys.PORT);
    expect(configService.port).toBe(Number(port));
  });

  it('should have the correct http host', () => {
    const host = nestConfigService.get(EnvConfigKeys.HOST);
    expect(configService.host).toBe(host);
  });

  it('should have the correct ws port', () => {
    const wsPort = nestConfigService.get(EnvConfigKeys.WS_PORT);
    expect(configService.wsPort).toBe(Number(wsPort));
  });

  it('should have the correct ws host', () => {
    const wsHost = nestConfigService.get(EnvConfigKeys.WS_HOST);
    expect(configService.wsHost).toBe(wsHost);
  });

  it('should have the correct nodeEnv', () => {
    const nodeEnv = nestConfigService.get(EnvConfigKeys.NODE_ENV);
    expect(configService.nodeEnv).toBe(nodeEnv);
  });

  it('should have the correct mongoDBUrl', () => {
    const mongoDBUrl = nestConfigService.get(EnvConfigKeys.MONGODB_URI);
    expect(configService.mongoDBUrl).toBe(mongoDBUrl);
  });

  it('should have the correct dbName', () => {
    const dbName = nestConfigService.get(EnvConfigKeys.DB_NAME);
    expect(configService.dbName).toBe(dbName);
  });

  it('should have the correct dbSynchronize', () => {
    const dbSynchronize = nestConfigService.get(EnvConfigKeys.DB_SYNCHRONIZE);
    expect(configService.dbSynchronize).toBe(dbSynchronize === 'true');
  });

  it('should have the correct imageStoreServicePort', () => {
    const imageStoreServicePort = nestConfigService.get(
      EnvConfigKeys.IMAGE_STORE_SERVICE_PORT,
    );
    expect(configService.imageStoreServicePort).toBe(
      Number(imageStoreServicePort),
    );
  });

  it('should have the correct imageStoreServiceHost', () => {
    const imageStoreServiceHost = nestConfigService.get(
      EnvConfigKeys.IMAGE_STORE_SERVICE_HOST,
    );
    expect(configService.imageStoreServiceHost).toBe(imageStoreServiceHost);
  });
});
