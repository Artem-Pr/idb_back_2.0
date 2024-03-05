import { Test, TestingModule } from '@nestjs/testing';
import { PathsService } from './paths.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Paths } from './entities/paths.entity';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Media } from 'src/media/entities/media.entity';
import { NotFoundException } from '@nestjs/common';

describe('PathsService', () => {
  let service: PathsService;
  let repository: Repository<Paths>;
  let mediaRepository: Repository<Media>;

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
        {
          provide: getRepositoryToken(Media),
          useValue: {
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PathsService>(PathsService);
    repository = module.get<Repository<Paths>>(getRepositoryToken(Paths));
    mediaRepository = module.get<Repository<Media>>(getRepositoryToken(Media));
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

  describe('checkDirectory', () => {
    it('should throw NotFoundException if directory is not found', async () => {
      jest.spyOn(service, 'getPaths').mockResolvedValueOnce([]);
      await expect(
        service.checkDirectory('nonexistent/directory'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return directory info if directory is found', async () => {
      jest
        .spyOn(service, 'getPaths')
        .mockResolvedValueOnce(['main/nestjs', 'main/nestjs/subdir']);
      jest.spyOn(service, 'countFilesInDirectory').mockResolvedValueOnce(5);

      const result = await service.checkDirectory('main/nestjs');
      expect(result.numberOfFiles).toEqual(5);
      expect(result.numberOfSubdirectories).toEqual(1);
    });

    it('should return numberOfSubdirectories === 0 if directory has no subdirectories', async () => {
      jest
        .spyOn(service, 'getPaths')
        .mockResolvedValueOnce(['main/nestjs', 'main']);
      jest.spyOn(service, 'countFilesInDirectory').mockResolvedValueOnce(0);

      const result = await service.checkDirectory('main/nestjs');
      expect(result.numberOfSubdirectories).toEqual(0);
    });
  });

  describe('countFilesInDirectory', () => {
    it('should return the number of files in a given directory', async () => {
      jest.spyOn(mediaRepository, 'count').mockResolvedValueOnce(10);
      const count = await service.countFilesInDirectory('main/nestjs');
      expect(count).toEqual(10);
    });
  });
});
