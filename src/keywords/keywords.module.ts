import { Module } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { KeywordsController } from './keywords.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeywordOld } from './entities/keywordsOld.entity';
import { Keywords } from './entities/keywords.entity';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([KeywordOld, Keywords]), FilesModule],
  controllers: [KeywordsController],
  providers: [KeywordsService],
  exports: [KeywordsService, TypeOrmModule],
})
export class KeywordsModule {}
