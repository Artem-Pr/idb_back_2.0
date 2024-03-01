import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KeywordsModule } from './keywords/keywords.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { PathsModule } from './paths/paths.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        console.log({
          type: 'mongodb',
          url: configService.get<string>('MONGODB_URI'),
          database: configService.get<string>('DB_NAME'),
          entities: [join(__dirname, '**/*.entity{.ts,.js}')],
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
        });

        return {
          type: 'mongodb',
          url: configService.get<string>('MONGODB_URI'),
          database: configService.get<string>('DB_NAME'),
          entities: [join(__dirname, '**/*.entity{.ts,.js}')],
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
        };
      },
      inject: [ConfigService],
    }),
    KeywordsModule,
    PathsModule,
  ],
})
export class AppModule {}
