import { Test } from '@nestjs/testing';
import { KeywordsService } from './keywords.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Keyword } from './entities/keywords.entity';
import { MongoRepository, AggregationCursor } from 'typeorm';
import { ObjectId } from 'mongodb';
import { DBConfigConstants } from 'src/common/constants';
import { Media } from 'src/media/entities/media.entity';

const keywordsArrMock = ['nestjs', 'typeorm', 'testing'];

describe('KeywordsService', () => {
  let service: KeywordsService;
  let keywordsRepositoryMock: MongoRepository<Keyword>;
  let mediaMongoRepositoryMock: MongoRepository<Media>;

  beforeEach(async () => {
    // Mock for the MediaMongoRepository
    mediaMongoRepositoryMock = {
      aggregate: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([
        {
          results: [],
        },
      ]),
    } as any;

    // Mock for the KeywordsRepository
    keywordsRepositoryMock = {
      manager: {
        getMongoRepository: jest.fn(() => mediaMongoRepositoryMock),
      },
      findOne: jest.fn().mockResolvedValue({
        _id: new ObjectId(),
        name: DBConfigConstants.keywords,
        keywordsArr: keywordsArrMock,
      }),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        KeywordsService,
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordsRepositoryMock,
        },
      ],
    }).compile();

    service = moduleRef.get(KeywordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKeywordsList', () => {
    it('should return an empty array if no keywords are found', async () => {
      jest.spyOn(keywordsRepositoryMock, 'findOne').mockResolvedValueOnce(null);
      expect(await service.getKeywordsList()).toEqual([]);
    });

    it('should return keywords array if keywords are found', async () => {
      expect(await service.getKeywordsList()).toEqual(keywordsArrMock);
    });
  });

  describe('getUnusedKeywords', () => {
    it('should return all keywords when no keywords are used', async () => {
      const unusedKeywords = await service.getUnusedKeywords();

      expect(unusedKeywords).toEqual(keywordsArrMock);
      expect(keywordsRepositoryMock.findOne).toHaveBeenCalled();
      expect(mediaMongoRepositoryMock.aggregate).toHaveBeenCalled();
      expect((mediaMongoRepositoryMock as any).toArray).toHaveBeenCalled();
    });

    it('should return unused keywords', async () => {
      const usedKeywords = ['nestjs', 'typeorm'];
      const unusedKeywords = ['testing'];

      jest.spyOn(mediaMongoRepositoryMock, 'aggregate').mockImplementation(
        () =>
          ({
            toArray: () =>
              Promise.resolve([
                {
                  results: usedKeywords,
                },
              ]),
          }) as unknown as AggregationCursor<Media>,
      );

      expect(await service.getUnusedKeywords()).toEqual(unusedKeywords);
    });

    it('should return an empty array if all keywords are used', async () => {
      jest.spyOn(mediaMongoRepositoryMock, 'aggregate').mockImplementation(
        () =>
          ({
            toArray: () =>
              Promise.resolve([
                {
                  results: keywordsArrMock,
                },
              ]),
          }) as unknown as AggregationCursor<Media>,
      );

      expect(await service.getUnusedKeywords()).toEqual([]);
    });
  });
});
