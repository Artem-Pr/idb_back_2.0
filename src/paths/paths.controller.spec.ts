import { Test, TestingModule } from '@nestjs/testing';
import { PathsController } from './paths.controller';
import { PathsService } from './paths.service';

describe('PathsController', () => {
  let controller: PathsController;
  let service: PathsService;
  const mockPaths = ['main/nestjs', 'typeorm', 'testing/jest/test'];

  beforeEach(async () => {
    const mockPathsService = {
      getPaths: jest.fn().mockResolvedValue(mockPaths),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PathsController],
      providers: [
        {
          provide: PathsService,
          useValue: mockPathsService,
        },
      ],
    }).compile();

    controller = module.get<PathsController>(PathsController);
    service = module.get<PathsService>(PathsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get paths', async () => {
    await expect(controller.getPaths()).resolves.toEqual(mockPaths);
    expect(service.getPaths).toHaveBeenCalled();
  });
});
