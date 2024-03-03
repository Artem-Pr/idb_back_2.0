import { Test, TestingModule } from '@nestjs/testing';
import { KeywordsController } from './keywords.controller';
import { KeywordsService } from './keywords.service';

const mockedKeywords = ['keyword1', 'keyword2'];
const mockedUnusedKeywords = ['unusedKeyword1', 'unusedKeyword2'];

describe('KeywordsController', () => {
  let controller: KeywordsController;
  let service: KeywordsService;

  beforeEach(async () => {
    const mockKeywordsService = {
      getKeywordsList: jest.fn().mockResolvedValue(mockedKeywords),
      getUnusedKeywords: jest.fn().mockResolvedValue(mockedUnusedKeywords),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeywordsController],
      providers: [
        {
          provide: KeywordsService,
          useValue: mockKeywordsService,
        },
      ],
    }).compile();

    controller = module.get<KeywordsController>(KeywordsController);
    service = module.get<KeywordsService>(KeywordsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get keywords', async () => {
    await expect(controller.getKeywordsList()).resolves.toEqual(mockedKeywords);
    expect(service.getKeywordsList).toHaveBeenCalled();
  });

  it('should get unused keywords', async () => {
    await expect(controller.getUnusedKeywords()).resolves.toEqual(
      mockedUnusedKeywords,
    );
  });
});
