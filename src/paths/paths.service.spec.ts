import { Test, TestingModule } from '@nestjs/testing';
import { PathsService } from './paths.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Paths } from './entities/paths.entity';
import { MongoRepository, Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { NotFoundException } from '@nestjs/common';
import { PathsOLD } from './entities/pathsOLD.entity';
import { MediaDBService } from 'src/files/mediaDB.service';

describe('PathsService', () => {
  const pathsMock = [
    'main/nestjs',
    'main/nestjs/subDir',
    'Название папки на русском',
    'Название папки на русском/subDir',
    'typeorm',
    'testing/jest/test',
  ];
  const mockPathsFind = jest
    .fn()
    .mockResolvedValue(
      pathsMock.map((p) => ({ _id: new ObjectId(), path: p })),
    );
  let service: PathsService;
  let mediaDB: MediaDBService;
  let pathsRepository: MongoRepository<Paths>;

  beforeEach(async () => {
    pathsRepository = {
      find: mockPathsFind,
      insertMany: jest.fn(),
      insert: jest.fn(),
    } as Partial<Repository<Paths>> as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathsService,
        {
          provide: MediaDBService,
          useValue: {
            countFilesInDirectory: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Paths),
          useValue: pathsRepository,
        },
        {
          provide: getRepositoryToken(PathsOLD),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PathsService>(PathsService);
    mediaDB = module.get<MediaDBService>(MediaDBService);
  });

  afterEach(jest.clearAllMocks);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an empty array if no paths are found', async () => {
    mockPathsFind.mockResolvedValueOnce([]);
    expect(await service.getPaths()).toEqual([]);
  });

  it('should return paths array if paths are found', async () => {
    expect(await service.getPaths()).toEqual(pathsMock);
  });

  describe('checkDirectory', () => {
    it('should throw NotFoundException if directory is not found', async () => {
      await expect(
        service.checkDirectory('nonexistent/directory'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return directory info if directory is found', async () => {
      jest.spyOn(mediaDB, 'countFilesInDirectory').mockResolvedValueOnce(5);

      const result = await service.checkDirectory('main/nestjs');
      expect(result.numberOfFiles).toEqual(5);
      expect(result.numberOfSubdirectories).toEqual(1);
    });

    it('should return numberOfSubdirectories === 0 if directory has no subdirectories', async () => {
      jest.spyOn(mediaDB, 'countFilesInDirectory').mockResolvedValueOnce(0);

      const result = await service.checkDirectory(
        'Название папки на русском/subDir',
      );
      expect(result.numberOfSubdirectories).toEqual(0);
    });
  });

  describe('addPaths', () => {
    it('should add new paths that do not exist yet', async () => {
      const newPaths = ['SD', 'main/SD'];
      const existedPaths = pathsMock;
      const allPaths = [...newPaths, ...existedPaths];
      jest.spyOn(pathsRepository, 'find');
      jest.spyOn(pathsRepository, 'insertMany');

      await service.addPaths(allPaths);

      expect(pathsRepository.find).toHaveBeenCalledWith({
        where: {
          path: { $in: allPaths },
        },
      });
      expect(pathsRepository.insertMany).toHaveBeenCalledWith(
        newPaths.map((path) => ({ path })),
      );
    });

    it('should not add paths that already exist', async () => {
      jest.spyOn(pathsRepository, 'find');
      jest.spyOn(pathsRepository, 'insertMany');

      await service.addPaths(pathsMock);

      expect(pathsRepository.find).toHaveBeenCalledWith({
        where: {
          path: { $in: pathsMock },
        },
      });
      expect(pathsRepository.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('addPath', () => {
    it('should add a new path if it does not exist', async () => {
      const newPath = 'new/path';
      jest.spyOn(pathsRepository, 'find').mockResolvedValue([]);
      jest.spyOn(pathsRepository, 'insert');

      await service.addPath(newPath);

      expect(pathsRepository.find).toHaveBeenCalledWith({
        where: {
          path: newPath,
        },
      });
      expect(pathsRepository.insert).toHaveBeenCalledWith({ path: newPath });
    });

    it('should not add a path if it already exists', async () => {
      const existingPath = 'existing/path';
      jest
        .spyOn(pathsRepository, 'find')
        .mockResolvedValueOnce([{ _id: new ObjectId(), path: existingPath }]);
      jest.spyOn(pathsRepository, 'insert');

      await service.addPath(existingPath);

      expect(pathsRepository.insert).not.toHaveBeenCalled();
    });
  });
});
