import { Test, TestingModule } from '@nestjs/testing';
import { KeywordsService } from './keywords.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Media } from 'src/files/entities/media.entity';
import { Keywords } from './entities/keywords.entity';
import { KeywordOld } from './entities/keywordsOld.entity';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MediaDBService } from 'src/files/mediaDB.service';

const keywordsArrMock = ['nestjs', 'typeorm', 'testing'];

describe('KeywordsService', () => {
  let service: KeywordsService;
  let mediaDB: MediaDBService;
  let keywordsRepositoryMock: MongoRepository<Keywords>;
  let mediaMongoRepositoryMock: MongoRepository<Media>;

  beforeEach(async () => {
    mediaMongoRepositoryMock = {
      aggregate: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([
        {
          results: [],
        },
      ]),
    } as any;

    keywordsRepositoryMock = {
      manager: {
        getMongoRepository: jest.fn(() => mediaMongoRepositoryMock),
      },
      findOne: jest.fn().mockResolvedValue({
        _id: new ObjectId(),
        keyword: 'nestjs',
      }),
      find: jest
        .fn()
        .mockResolvedValue(
          keywordsArrMock.map((keyword) => ({ _id: new ObjectId(), keyword })),
        ),
      deleteMany: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockResolvedValue([]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeywordsService,
        {
          provide: MediaDBService,
          useValue: {
            getUsedKeywordsList: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Keywords),
          useValue: keywordsRepositoryMock,
        },
        {
          provide: getRepositoryToken(KeywordOld),
          useValue: keywordsRepositoryMock,
        },
      ],
    }).compile();

    service = module.get(KeywordsService);
    mediaDB = module.get(MediaDBService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllKeywords', () => {
    it('should return all keywords', async () => {
      jest.spyOn(keywordsRepositoryMock, 'find');

      const keywords = await service.getAllKeywords();

      expect(keywordsRepositoryMock.find).toHaveBeenCalled();
      expect(keywords).toEqual(keywordsArrMock);
    });
  });

  describe('getUnusedKeywords', () => {
    it('should return all keywords when no keywords are used', async () => {
      const unusedKeywords = await service.getUnusedKeywords();

      expect(unusedKeywords).toEqual(keywordsArrMock);
      expect(keywordsRepositoryMock.find).toHaveBeenCalled();
      expect(mediaDB.getUsedKeywordsList).toHaveBeenCalled();
    });

    it('should return unused keywords', async () => {
      const usedKeywords = ['nestjs', 'typeorm'];
      const unusedKeywords = ['testing'];

      jest
        .spyOn(mediaDB, 'getUsedKeywordsList')
        .mockResolvedValue(usedKeywords);

      expect(await service.getUnusedKeywords()).toEqual(unusedKeywords);
    });

    it('should return an empty array if all keywords are used', async () => {
      jest
        .spyOn(mediaDB, 'getUsedKeywordsList')
        .mockResolvedValue(keywordsArrMock);

      expect(await service.getUnusedKeywords()).toEqual([]);
    });
  });

  describe('removeUnusedKeywords', () => {
    it('should remove unused keywords and return a success message', async () => {
      const unusedKeywordsMock = ['keyword1', 'keyword2'];
      jest
        .spyOn(service, 'getUnusedKeywords')
        .mockResolvedValueOnce(unusedKeywordsMock);
      jest.spyOn(service, 'removeKeywords');

      const result = await service.removeUnusedKeywords();

      expect(service.getUnusedKeywords).toHaveBeenCalledTimes(1);
      expect(service.removeKeywords).toHaveBeenCalledWith(unusedKeywordsMock);
      expect(result).toEqual({
        message: `Removed unused keywords: ${unusedKeywordsMock.join(', ')}`,
      });
    });

    it('should throw an exception when there are no unused keywords', async () => {
      jest.spyOn(service, 'getUnusedKeywords').mockResolvedValueOnce([]);

      await expect(service.removeUnusedKeywords()).rejects.toThrow(
        new HttpException('No unused keywords found', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('removeUnusedKeyword', () => {
    it('should remove an unused keyword and return a success message', async () => {
      const keyword = 'keyword1';
      jest.spyOn(service, 'getUnusedKeywords').mockResolvedValueOnce([keyword]);
      jest.spyOn(service, 'removeKeywords');

      const result = await service.removeUnusedKeyword(keyword);

      expect(service.getUnusedKeywords).toHaveBeenCalled();
      expect(service.removeKeywords).toHaveBeenCalledWith([keyword]);
      expect(result).toEqual({
        message: `Keyword ${keyword} removed from unused keywords`,
      });
    });

    it('should throw an exception when the keyword is not found among unused keywords', async () => {
      const keyword = 'keyword1';
      jest.spyOn(service, 'getUnusedKeywords').mockResolvedValueOnce([]);

      await expect(service.removeUnusedKeyword(keyword)).rejects.toThrow(
        new HttpException(
          `Keyword ${keyword} not found in unused keywords`,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('addKeywords', () => {
    it('should add new keywords that do not exist yet', async () => {
      const newKeywords = ['nodejs', 'typescript'];
      const existedKeywords = keywordsArrMock;
      const allKeywords = [...newKeywords, ...existedKeywords];
      jest.spyOn(keywordsRepositoryMock, 'find');
      jest.spyOn(keywordsRepositoryMock, 'insertMany');

      await service.addKeywords(allKeywords);

      expect(keywordsRepositoryMock.find).toHaveBeenCalledWith({
        where: {
          keyword: { $in: allKeywords },
        },
      });
      expect(keywordsRepositoryMock.insertMany).toHaveBeenCalledWith(
        newKeywords.map((keyword) => ({ keyword })),
      );
    });

    it('should not add keywords that already exist', async () => {
      jest.spyOn(keywordsRepositoryMock, 'find');
      jest.spyOn(keywordsRepositoryMock, 'insertMany');

      await service.addKeywords(keywordsArrMock);

      expect(keywordsRepositoryMock.find).toHaveBeenCalledWith({
        where: {
          keyword: { $in: keywordsArrMock },
        },
      });
      expect(keywordsRepositoryMock.insertMany).not.toHaveBeenCalled();
    });
  });
});
