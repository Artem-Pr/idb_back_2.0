import { Module } from '@nestjs/common';
import { PathsService } from './paths.service';
import { PathsController } from './paths.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paths } from './entities/paths.entity';
import { PathsOLD } from './entities/pathsOLD.entity';
import { Media } from 'src/files/entities/media.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Paths, PathsOLD, Media])],
  controllers: [PathsController],
  providers: [PathsService],
  exports: [PathsService, TypeOrmModule],
})
export class PathsModule {}
