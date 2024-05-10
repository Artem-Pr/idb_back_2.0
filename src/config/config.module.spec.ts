import { Test } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigModuleMetadata } from './config.module';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EnvConfigKeys } from 'src/common/constants';

describe('ConfigModule', () => {
  let configService: ConfigService;
  let nestConfigService: NestConfigService;

  beforeEach(async () => {
    const moduleRef =
      await Test.createTestingModule(ConfigModuleMetadata).compile();

    configService = moduleRef.get<ConfigService>(ConfigService);
    nestConfigService = moduleRef.get<NestConfigService>(NestConfigService);
  });

  it('should be defined', () => {
    expect(configService).toBeDefined();
  });

  it('should have the correct port', () => {
    const port = nestConfigService.get(EnvConfigKeys.PORT);
    expect(configService.port).toBe(Number(port));
  });

  it('should have the correct host', () => {
    const host = nestConfigService.get(EnvConfigKeys.HOST);
    expect(configService.host).toBe(host);
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
