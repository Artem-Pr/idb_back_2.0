import { Module } from '@nestjs/common';
import { KeywordsModule } from './keywords/keywords.module';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { PathsModule } from './paths/paths.module';
import { FilesModule } from './files/files.module';
import { QueueModule } from './queue/queue.module';
import {
  ServeStaticModule,
  ServeStaticModuleOptions,
} from '@nestjs/serve-static';
import { ConfigService } from './config/config.service';
import { MainDir } from './common/constants';
import { ConfigModule } from './config/config.module';
import { values } from 'ramda';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const serveStaticConfig: ServeStaticModuleOptions[] = values(
          MainDir,
        ).map((dir) => ({
          rootPath: configService.rootPaths[dir],
          serveRoot: `/${dir}`,
        }));
        console.log('ServeStatic config: ', serveStaticConfig);

        return serveStaticConfig;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config: TypeOrmModuleOptions = {
          type: 'mongodb',
          url: configService.mongoDBUrl,
          database: configService.dbName,
          entities: [join(__dirname, '**/*.entity{.ts,.js}')],
          synchronize: configService.dbSynchronize,
        };
        console.log('TypeOrm config: ', config);

        return config;
      },
      inject: [ConfigService],
    }),
    KeywordsModule,
    PathsModule,
    FilesModule,
    QueueModule,
    LoggerModule,
  ],
})
export class AppModule {}
