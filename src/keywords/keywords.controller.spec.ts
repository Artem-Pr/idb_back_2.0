import { Test, TestingModule } from '@nestjs/testing';
import { KeywordsController } from './keywords.controller';
import { KeywordsService } from './keywords.service';

describe('KeywordsController', () => {
  let controller: KeywordsController;
  let service: KeywordsService;

  beforeEach(async () => {
    const mockKeywordsService = {
      getKeywords: jest.fn().mockResolvedValue(['keyword1', 'keyword2']),
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
    await expect(controller.getKeywords()).resolves.toEqual([
      'keyword1',
      'keyword2',
    ]);
    expect(service.getKeywords).toHaveBeenCalled();
  });
});
