import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { MainDir, Processors } from 'src/common/constants';
import { addDestPrefix } from 'src/common/utils';
import { BullModule } from '@nestjs/bull';
import { FileProcessor } from 'src/jobs/files.processor';
import { ExifProcessor } from 'src/jobs/exif.processor';
import { ConfigService } from 'src/config/config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaTemp } from './entities/media-temp.entity';
import { MediaDB } from './mediaDB.service';
import { Media } from './entities/media.entity';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        dest: addDestPrefix(configService.rootPaths[MainDir.temp]),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: Processors.fileProcessor,
      },
      {
        name: Processors.exifProcessor,
      },
    ),
    TypeOrmModule.forFeature([MediaTemp, Media]),
  ],
  controllers: [FilesController],
  providers: [FilesService, MediaDB, FileProcessor, ExifProcessor],
})
export class FilesModule {}
