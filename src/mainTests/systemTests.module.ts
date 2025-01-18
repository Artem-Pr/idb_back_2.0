import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PathsModule } from 'src/paths/paths.module';
import { FilesModule } from 'src/files/files.module';
import { SystemTestsService } from './systemTests.service';
import { Paths } from 'src/paths/entities/paths.entity';
import { Media } from 'src/files/entities/media.entity';
import { SystemTestsController } from './systemTests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Paths, Media]),
    forwardRef(() => FilesModule),
    forwardRef(() => PathsModule),
  ],
  controllers: [SystemTestsController],
  providers: [SystemTestsService],
  exports: [SystemTestsService],
})
export class SystemTestsModule {}
