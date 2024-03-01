import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Keyword } from './entities/keywords.entity';
import { DBConfigConstants } from 'src/common/constants';

@Injectable()
export class KeywordsService {
  constructor(
    @InjectRepository(Keyword)
    private keywordsRepository: Repository<Keyword>,
  ) {}

  async getKeywords(): Promise<string[]> {
    const config = await this.keywordsRepository.findOne({
      where: {
        name: DBConfigConstants.keywords,
      },
    });
    return config ? config.keywordsArr : [];
  }
}
