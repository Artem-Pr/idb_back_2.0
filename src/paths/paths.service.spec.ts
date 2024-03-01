import { Test, TestingModule } from '@nestjs/testing';
import { PathsService } from './paths.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Paths } from './entities/paths.entity';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';

describe('PathsService', () => {
  let service: PathsService;
  let repository: Repository<Paths>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathsService,
        {
          provide: getRepositoryToken(Paths),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PathsService>(PathsService);
    repository = module.get<Repository<Paths>>(getRepositoryToken(Paths));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an empty array if no paths are found', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
    expect(await service.getPaths()).toEqual([]);
  });

  it('should return paths array if paths are found', async () => {
    const paths = ['main/nestjs', 'typeorm', 'testing/jest/test'];
    jest.spyOn(repository, 'findOne').mockResolvedValueOnce({
      _id: new ObjectId(),
      name: 'paths',
      pathsArr: paths,
    });
    expect(await service.getPaths()).toEqual(paths);
  });
});
