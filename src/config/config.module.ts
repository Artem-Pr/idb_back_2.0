import type { ModuleMetadata } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService as NestConfigService,
} from '@nestjs/config';
import { ConfigService } from './config.service';
import { EnvConfigKeys, Envs } from 'src/common/constants';

export const ConfigModuleMetadata: ModuleMetadata = {
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || Envs.DEV}`,
    }),
  ],
  providers: [
    {
      provide: ConfigService,
      useFactory: (nestConfigService: NestConfigService) => {
        const configService = new ConfigService();
        configService.port = nestConfigService.get(EnvConfigKeys.PORT);
        configService.host = nestConfigService.get(EnvConfigKeys.HOST);
        configService.wsPort = nestConfigService.get(EnvConfigKeys.WS_PORT);
        configService.wsHost = nestConfigService.get(EnvConfigKeys.WS_HOST);
        configService.nodeEnv = nestConfigService.get(EnvConfigKeys.NODE_ENV);
        configService.mongoDBUrl = nestConfigService.get(
          EnvConfigKeys.MONGODB_URI,
        );
        configService.dbName = nestConfigService.get(EnvConfigKeys.DB_NAME);
        configService.dbSynchronize = nestConfigService.get(
          EnvConfigKeys.DB_SYNCHRONIZE,
        );
        configService.imageStoreServicePort = nestConfigService.get(
          EnvConfigKeys.IMAGE_STORE_SERVICE_PORT,
        );
        configService.imageStoreServiceHost = nestConfigService.get(
          EnvConfigKeys.IMAGE_STORE_SERVICE_HOST,
        );
        return configService;
      },
      inject: [NestConfigService],
    },
  ],
  exports: [ConfigService],
};

@Global()
@Module(ConfigModuleMetadata)
export class ConfigModule {}
