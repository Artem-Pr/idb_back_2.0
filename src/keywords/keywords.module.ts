import { Module } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { KeywordsController } from './keywords.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeywordOld } from './entities/keywordsOld.entity';
import { Keywords } from './entities/keywords.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KeywordOld, Keywords])],
  controllers: [KeywordsController],
  providers: [KeywordsService],
})
export class KeywordsModule {}
