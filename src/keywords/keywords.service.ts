import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { Keyword } from './entities/keywords.entity';
import { DBConfigConstants } from 'src/common/constants';
import { Media } from 'src/media/entities/media.entity';
import { difference } from 'ramda';

interface AggregatedKeywordsSetResult {
  results: string[];
}

@Injectable()
export class KeywordsService {
  private mediaMongoRepository: MongoRepository<Media>;

  constructor(
    @InjectRepository(Keyword)
    private keywordsRepository: Repository<Keyword>,
  ) {
    this.mediaMongoRepository =
      this.keywordsRepository.manager.getMongoRepository(Media);
  }

  async getKeywordsList(): Promise<string[]> {
    const config = await this.keywordsRepository.findOne({
      where: {
        name: DBConfigConstants.keywords,
      },
    });
    return config ? config.keywordsArr : [];
  }

  async getUnusedKeywords(): Promise<string[]> {
    const allKeywordsPromise = this.getKeywordsList();

    const usedKeywordsPromise = this.mediaMongoRepository
      .aggregate(
        [
          {
            $group: {
              _id: null,
              keywordsSet: { $addToSet: '$keywords' },
            },
          },
          {
            $project: {
              results: {
                $reduce: {
                  input: { $concatArrays: '$keywordsSet' },
                  initialValue: [],
                  in: { $setUnion: ['$$value', '$$this'] },
                },
              },
            },
          },
          { $unset: '_id' },
        ],
        { allowDiskUse: true },
      )
      .toArray()
      .then(
        (data) => (data as unknown as AggregatedKeywordsSetResult[])[0].results,
      );

    const [usedKeywords, allKeywords] = await Promise.all([
      usedKeywordsPromise,
      allKeywordsPromise,
    ]);

    const unusedKeywords = difference(allKeywords, usedKeywords);

    return unusedKeywords;
  }
}
