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
      getAllKeywords: jest.fn().mockResolvedValue(mockedKeywords),
      getUnusedKeywords: jest.fn().mockResolvedValue(mockedUnusedKeywords),
      removeUnusedKeywords: jest.fn().mockResolvedValue({
        message: `Removed unused keywords: keyword1, keyword2`,
      }),
      removeUnusedKeyword: jest.fn().mockResolvedValue({
        message: `Keyword keyword1 removed from unused keywords`,
      }),
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
    expect(service.getAllKeywords).toHaveBeenCalled();
  });

  it('should get unused keywords', async () => {
    await expect(controller.getUnusedKeywords()).resolves.toEqual(
      mockedUnusedKeywords,
    );
  });

  it('should remove unused keywords', async () => {
    await expect(controller.removeUnusedKeywords()).resolves.toEqual({
      message: `Removed unused keywords: keyword1, keyword2`,
    });
    expect(service.removeUnusedKeywords).toHaveBeenCalled();
  });

  it('should remove unused keyword', async () => {
    await expect(controller.removeUnusedKeyword('keyword1')).resolves.toEqual({
      message: `Keyword keyword1 removed from unused keywords`,
    });
    expect(service.removeUnusedKeyword).toHaveBeenCalled();
  });
});
