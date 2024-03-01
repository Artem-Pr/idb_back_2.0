import { Test, TestingModule } from '@nestjs/testing';
import { KeywordsService } from './keywords.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Keyword } from './entities/keywords.entity';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';

describe('KeywordsService', () => {
  let service: KeywordsService;
  let repository: Repository<Keyword>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeywordsService,
        {
          provide: getRepositoryToken(Keyword),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KeywordsService>(KeywordsService);
    repository = module.get<Repository<Keyword>>(getRepositoryToken(Keyword));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an empty array if no keywords are found', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
    expect(await service.getKeywords()).toEqual([]);
  });

  it('should return keywords array if keywords are found', async () => {
    const keywords = ['nestjs', 'typeorm', 'testing'];
    jest.spyOn(repository, 'findOne').mockResolvedValueOnce({
      _id: new ObjectId(),
      name: 'keywords',
      keywordsArr: keywords,
    });
    expect(await service.getKeywords()).toEqual(keywords);
  });
});
