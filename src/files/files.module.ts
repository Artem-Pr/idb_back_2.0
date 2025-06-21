import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { MainDir, Processors } from 'src/common/constants';
import { addDestPrefix } from 'src/common/fileNameHelpers';
import { BullModule } from '@nestjs/bull';
import { FileProcessor } from 'src/jobs/files.processor';
import { ExifProcessor } from 'src/jobs/exif.processor';
import { ConfigService } from 'src/config/config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaTemp } from './entities/media-temp.entity';
import { MediaDBService } from './mediaDB.service';
import { Media } from './entities/media.entity';
import { ExifKeysModule } from './exif-keys/exif-keys.module';
import { DiscStorageService } from './discStorage.service';
import { PathsService } from 'src/paths/paths.service';
import { PathsModule } from 'src/paths/paths.module';
import { KeywordsService } from 'src/keywords/keywords.service';
import { KeywordsModule } from 'src/keywords/keywords.module';
import { TusService } from './tus.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        dest: addDestPrefix(configService.rootPaths[MainDir.temp]),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: Processors.fileProcessor },
      { name: Processors.exifProcessor },
    ),
    TypeOrmModule.forFeature([MediaTemp, Media]),
    ExifKeysModule,
    forwardRef(() => PathsModule),
    forwardRef(() => KeywordsModule),
    AuthModule,
  ],
  controllers: [FilesController],
  providers: [
    DiscStorageService,
    ExifProcessor,
    FileProcessor,
    FilesService,
    KeywordsService,
    MediaDBService,
    PathsService,
    TusService,
  ],
  exports: [
    MediaDBService,
    DiscStorageService,
    FilesService,
    TusService,
    ExifKeysModule,
  ],
})
export class FilesModule {}
