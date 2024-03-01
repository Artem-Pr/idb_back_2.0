import { Module } from '@nestjs/common';
import { PathsService } from './paths.service';
import { PathsController } from './paths.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paths } from './entities/paths.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Paths])],
  controllers: [PathsController],
  providers: [PathsService],
})
export class PathsModule {}
