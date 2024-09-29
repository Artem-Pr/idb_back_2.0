import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { KeywordOld } from './entities/keywordsOld.entity';
import { DBConfigConstants } from 'src/common/constants';
import { Media } from 'src/files/entities/media.entity';
import { difference } from 'ramda';
import { Keywords } from './entities/keywords.entity';
import { MediaDBService } from 'src/files/mediaDB.service';

interface AggregatedKeywordsSetResult {
  results: string[];
}

@Injectable()
export class KeywordsService {
  private mediaMongoRepository: MongoRepository<Media>;

  constructor(
    @InjectRepository(KeywordOld)
    private keywordsRepositoryOld: MongoRepository<KeywordOld>,
    @InjectRepository(Keywords)
    private keywordsRepository: MongoRepository<Keywords>,
    private mediaDB: MediaDBService,
  ) {
    this.mediaMongoRepository =
      this.keywordsRepositoryOld.manager.getMongoRepository(Media);
  }

  async getKeywordsListFromOldCollection(): Promise<string[]> {
    const config = await this.keywordsRepositoryOld.findOne({
      where: {
        name: DBConfigConstants.keywords,
      },
    });
    return config ? config.keywordsArr : [];
  }

  async getAllKeywords(): Promise<string[]> {
    const keywordsEntities = await this.keywordsRepository.find();
    return keywordsEntities.map((keywordEntity) => keywordEntity.keyword);
  }

  async getUnusedKeywordsOld(): Promise<string[]> {
    const allKeywordsPromise = this.getKeywordsListFromOldCollection();

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

  async getUnusedKeywords(): Promise<string[]> {
    const allKeywordsPromise = this.getAllKeywords();
    const usedKeywordsPromise = this.mediaDB.getUsedKeywordsList();

    const [usedKeywords, allKeywords] = await Promise.all([
      usedKeywordsPromise,
      allKeywordsPromise,
    ]);

    const unusedKeywords = difference(allKeywords, usedKeywords);

    return unusedKeywords;
  }

  async removeUnusedKeywords(): Promise<{ message: string }> {
    const unusedKeywords = await this.getUnusedKeywords();
    if (unusedKeywords.length) {
      await this.removeKeywords(unusedKeywords);

      return {
        message: `Removed unused keywords: ${unusedKeywords.join(', ')}`,
      };
    }

    throw new HttpException('No unused keywords found', HttpStatus.BAD_REQUEST);
  }

  async removeUnusedKeyword(keyword: string): Promise<{ message: string }> {
    const unusedKeywords = await this.getUnusedKeywords();
    if (!unusedKeywords.includes(keyword)) {
      throw new HttpException(
        `Keyword ${keyword} not found in unused keywords`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.removeKeywords([keyword]);

    return {
      message: `Keyword ${keyword} removed from unused keywords`,
    };
  }

  async moveKeywordsToNewCollection(): Promise<void> {
    const keywordsList = await this.getKeywordsListFromOldCollection();

    await this.addKeywords(keywordsList);
  }

  async addKeywords(keywords: string[]): Promise<void> {
    const existingKeywords = await this.keywordsRepository.find({
      where: {
        keyword: { $in: keywords },
      },
    });

    const existingKeywordsStrings = existingKeywords.map((ek) => ek.keyword);

    const newKeywords = keywords.filter(
      (k) => !existingKeywordsStrings.includes(k),
    );

    const keywordsToInsert = newKeywords.map((keyword) => ({
      keyword,
    }));

    if (keywordsToInsert.length > 0) {
      await this.keywordsRepository.insertMany(keywordsToInsert);
    }
  }

  async removeKeywords(keywords: string[]): Promise<void> {
    await this.keywordsRepository.deleteMany({
      keyword: {
        $in: keywords,
      },
    });
  }
}
