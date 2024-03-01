import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { MediaModule } from './media/media.module';
import { KeywordsModule } from './keywords/keywords.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

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
    MediaModule,
    KeywordsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
