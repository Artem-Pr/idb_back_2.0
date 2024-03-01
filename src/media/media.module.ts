import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Keyword } from 'src/keywords/entities/keywords.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Keyword])],
  providers: [MediaService],
  controllers: [MediaController],
})
export class MediaModule {}
