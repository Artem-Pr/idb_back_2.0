import { Test, TestingModule } from '@nestjs/testing';
import { PathsService } from './paths.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Paths } from './entities/paths.entity';
import { MongoRepository, Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PathsOLD } from './entities/pathsOLD.entity';
import { MediaDBService } from 'src/files/mediaDB.service';
import { DiscStorageService } from 'src/files/discStorage.service';
import { Media } from 'src/files/entities/media.entity';
import { createMediaMock } from 'src/files/__mocks__/mocks';

describe('PathsService', () => {
  const pathsMock = [
    'main',
    'main/nestjs',
    'main/nestjs/subDir',
    'Название папки на русском',
    'Название папки на русском/subDir',
    'typeorm',
    'testing',
    'testing/jest',
    'testing/jest/test',
  ];
  const media1 = createMediaMock({
    id: new ObjectId('662eb6a4aece4209057aa5d0'),
  });
  const media2 = createMediaMock({
    id: new ObjectId('662eb6a4aece4209057aa5d1'),
  });
  const mockMediaList = [media1, media2];
  const mockPathsFind = jest
    .fn()
    .mockResolvedValue(
      pathsMock.map((p) => ({ _id: new ObjectId(), path: p })),
    );
  let service: PathsService;
  let mediaDB: MediaDBService;
  let diskStorage: DiscStorageService;
  let pathsRepository: MongoRepository<Paths>;

  beforeEach(async () => {
    pathsRepository = {
      deleteMany: jest.fn(),
      find: mockPathsFind,
      insert: jest.fn(),
      insertMany: jest.fn(),
    } as Partial<Repository<Paths>> as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathsService,
        {
          provide: MediaDBService,
          useValue: {
            countFilesInDirectory: jest.fn(),
            findMediaByDirectoryInDB: jest
              .fn()
              .mockResolvedValue(mockMediaList),
            deleteMediaFromDB: jest.fn(),
            addMediaToDB: jest.fn(),
          },
        },
        {
          provide: DiscStorageService,
          useValue: {
            removeDirectory: jest.fn(),
            removePreviews: jest.fn(),
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
    diskStorage = module.get<DiscStorageService>(DiscStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPathsFromDB', () => {
    it('should return an empty array if no paths are found', async () => {
      mockPathsFind.mockResolvedValueOnce([]);
      expect(await service.getAllPathsFromDB()).toEqual([]);
    });

    it('should return paths array if paths are found', async () => {
      expect(await service.getAllPathsFromDB()).toEqual(pathsMock);
    });
  });

  describe('getSubdirectories', () => {
    it('should return an empty array and zero count for an empty paths array', () => {
      const result = service['getSubdirectories']('a/b', []);
      expect(result).toEqual({
        numberOfSubdirectories: 0,
        subDirectories: [],
      });
    });

    it('should return subdirectories and correct count for a valid directory', () => {
      const pathsArr = ['a/b/c', 'a/b/d', 'a/b/e/f', 'a/x/y'];
      const result = service['getSubdirectories']('a/b', pathsArr);
      expect(result).toEqual({
        numberOfSubdirectories: 3,
        subDirectories: ['a/b/c', 'a/b/d', 'a/b/e/f'],
      });
    });

    it('should return an empty array and zero count if no subdirectories match', () => {
      const pathsArr = ['a/x/y', 'b/c', 'c/d/e'];
      const result = service['getSubdirectories']('a/b', pathsArr);
      expect(result).toEqual({
        numberOfSubdirectories: 0,
        subDirectories: [],
      });
    });

    it('should handle paths with leading slashes', () => {
      const pathsArr = ['/a/b/c', '/a/b/d', '/a/x/y'];
      const result = service['getSubdirectories']('/a/b', pathsArr);
      expect(result).toEqual({
        numberOfSubdirectories: 2,
        subDirectories: ['a/b/c', 'a/b/d'],
      });
    });

    it('should not include the directory itself as a subdirectory', () => {
      const pathsArr = ['a/b', 'a/b/c', 'a/b/d'];
      const result = service['getSubdirectories']('a/b', pathsArr);
      expect(result).toEqual({
        numberOfSubdirectories: 2,
        subDirectories: ['a/b/c', 'a/b/d'],
      });
    });
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

  describe('getDirAndSubfolders', () => {
    it('should return an empty array for an empty string', () => {
      expect(service['getDirAndSubfolders']('')).toEqual([]);
    });

    it('should return an empty array for a root directory', () => {
      expect(service['getDirAndSubfolders']('/')).toEqual([]);
    });

    it('should return subfolders for a simple path', () => {
      expect(service['getDirAndSubfolders']('a/b/c')).toEqual([
        'a',
        'a/b',
        'a/b/c',
      ]);
    });

    it('should return subfolders for a path with leading and trailing slashes', () => {
      expect(service['getDirAndSubfolders']('/a/b/c/')).toEqual([
        'a',
        'a/b',
        'a/b/c',
      ]);
    });

    it('should handle paths with extra slashes', () => {
      expect(service['getDirAndSubfolders']('///a///b///c///')).toEqual([
        'a',
        'a/b',
        'a/b/c',
      ]);
    });

    it('should handle a single directory', () => {
      expect(service['getDirAndSubfolders']('a')).toEqual(['a']);
    });

    it('should handle deeply nested directories', () => {
      expect(service['getDirAndSubfolders']('a/b/c/d/e')).toEqual([
        'a',
        'a/b',
        'a/b/c',
        'a/b/c/d',
        'a/b/c/d/e',
      ]);
    });
  });

  describe('getDirAndSubfoldersFromArray', () => {
    it('should return an empty array for an empty array', () => {
      expect(service.getDirAndSubfoldersFromArray([])).toEqual([]);
    });

    it('should return subfolders for a single directory', () => {
      expect(service.getDirAndSubfoldersFromArray(['a/b/c'])).toEqual([
        'a',
        'a/b',
        'a/b/c',
      ]);
    });

    it('should return subfolders for multiple directories', () => {
      expect(service.getDirAndSubfoldersFromArray(['a/b', 'c/d'])).toEqual([
        'a',
        'a/b',
        'c',
        'c/d',
      ]);
    });

    it('should handle directories with leading and trailing slashes', () => {
      expect(
        service.getDirAndSubfoldersFromArray(['/a/b/c/', '/d/e/']),
      ).toEqual(['a', 'a/b', 'a/b/c', 'd', 'd/e']);
    });

    it('should handle directories with extra slashes', () => {
      expect(
        service.getDirAndSubfoldersFromArray([
          '///a///b///c///',
          '///d///e///',
        ]),
      ).toEqual(['a', 'a/b', 'a/b/c', 'd', 'd/e']);
    });

    it('should handle a mixture of single and deeply nested directories', () => {
      expect(service.getDirAndSubfoldersFromArray(['a', 'b/c/d/e'])).toEqual([
        'a',
        'b',
        'b/c',
        'b/c/d',
        'b/c/d/e',
      ]);
    });
  });

  describe('isPathAlreadyExistsInDB', () => {
    it('should call pathsRepository.find with correct parameters', async () => {
      const path = 'path';
      const expectedParams = { where: { path } };

      await service['isPathAlreadyExistsInDB'](path);

      expect(pathsRepository.find).toHaveBeenCalledWith(expectedParams);
    });

    it('should return true if path already exists', async () => {
      const path = 'path';
      jest
        .spyOn(pathsRepository, 'find')
        .mockResolvedValueOnce([{ _id: new ObjectId(), path }]);

      const result = await service['isPathAlreadyExistsInDB'](path);

      expect(result).toBe(true);
    });
  });

  describe('addPathToDB', () => {
    it('should add a new path if it does not exist', async () => {
      const newPath = 'new/path';
      jest.spyOn(pathsRepository, 'find');
      jest.spyOn(pathsRepository, 'insert');
      mockPathsFind.mockResolvedValueOnce([]);

      await service.addPathToDB(newPath);

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

      await service.addPathToDB(existingPath);

      expect(pathsRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('addPathsToDB', () => {
    it('should add new paths that do not exist yet', async () => {
      const newPaths = ['SD', 'main/SD'];
      const existedPaths = pathsMock;
      const allPaths = [...newPaths, ...existedPaths];
      jest.spyOn(pathsRepository, 'find');
      jest.spyOn(pathsRepository, 'insertMany');

      await service.addPathsToDB(allPaths);

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

      await service.addPathsToDB(pathsMock);

      expect(pathsRepository.find).toHaveBeenCalledWith({
        where: {
          path: { $in: pathsMock },
        },
      });
      expect(pathsRepository.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('deletePathsFromDB', () => {
    it('should call pathsRepository.deleteMany with correct parameters', async () => {
      const paths = ['path1', 'path2'];
      const expectedParams = { path: { $in: paths } };

      await service.deletePathsFromDB(paths);

      expect(pathsRepository.deleteMany).toHaveBeenCalledWith(expectedParams);
    });
  });

  describe('deleteDirAndSubDirsFromDB', () => {
    it('should delete dir and subfolders', async () => {
      const pathToDelete = 'main';

      const result = await service['deleteDirAndSubDirsFromDB'](pathToDelete);

      expect(result).toEqual(['main/nestjs', 'main/nestjs/subDir', 'main']);
    });

    it('should throw an error if dir does not exist', async () => {
      const pathToDelete = 'non-existing-dir';

      await expect(
        service['deleteDirAndSubDirsFromDB'](pathToDelete),
      ).rejects.toThrow(
        new NotFoundException('There are no matching directories'),
      );
    });
  });

  describe('deleteMediaByDirectoryFromDB', () => {
    it('should call mediaDB.deleteMediaFromDB with correct parameters', async () => {
      await service['deleteMediaByDirectoryFromDB']('any path');

      expect(mediaDB.deleteMediaFromDB).toHaveBeenCalledWith([
        media1._id,
        media2._id,
      ]);
    });
  });

  describe('getPreviewsAndFullPathsFormMediaList', () => {
    it('should return previews and full paths if fullSizeJpg is present', () => {
      const result =
        service['getPreviewsAndFullPathsFormMediaList'](mockMediaList);

      expect(result).toEqual([
        '/path/to/mockFile-preview.jpg',
        '/path/to/mockFile-fullSize.jpg',
        '/path/to/mockFile-preview.jpg',
        '/path/to/mockFile-fullSize.jpg',
      ]);
    });

    it('should return only previews if fullSizeJpg is not present', () => {
      const mockMedia1 = createMediaMock();
      const mockMedia2 = createMediaMock();
      mockMedia1.fullSizeJpg = null;
      mockMedia2.fullSizeJpg = null;

      const result = service['getPreviewsAndFullPathsFormMediaList']([
        mockMedia1,
        mockMedia2,
      ]);

      expect(result).toEqual([
        '/path/to/mockFile-preview.jpg',
        '/path/to/mockFile-preview.jpg',
      ]);
    });

    it('should return an empty array if mediaList is empty', () => {
      const mediaList: Media[] = [];

      const result = service['getPreviewsAndFullPathsFormMediaList'](mediaList);

      expect(result).toEqual([]);
    });
  });

  describe('restoreDataIfDeletionError', () => {
    it('should restore data', async () => {
      jest.spyOn(service, 'addPathsToDB');

      await service['restoreDataIfDeletionError'](
        ['dir to restore'],
        mockMediaList,
      );

      expect(service.addPathsToDB).toHaveBeenCalledWith(['dir to restore']);
      expect(mediaDB.addMediaToDB).toHaveBeenCalledWith(mockMediaList);
    });
  });

  describe('deleteDirectory', () => {
    const expectedResult = {
      directoriesToRemove: ['main/nestjs', 'main/nestjs/subDir', 'main'],
      mediaList: mockMediaList,
    };

    it('should return correct result', async () => {
      const result = await service.deleteDirectory('main');

      expect(result).toEqual(expectedResult);
    });

    it('should call deletePathsFromDB with correct parameters', async () => {
      jest.spyOn(service, 'deletePathsFromDB');

      await service.deleteDirectory('main');

      expect(service.deletePathsFromDB).toHaveBeenCalledWith([
        'main/nestjs',
        'main/nestjs/subDir',
        'main',
      ]);
    });

    it('should call mediaDB.deleteMediaFromDB with correct parameters', async () => {
      jest.spyOn(mediaDB, 'deleteMediaFromDB');

      await service.deleteDirectory('main');

      expect(mediaDB.deleteMediaFromDB).toHaveBeenCalledWith([
        media1._id,
        media2._id,
      ]);
    });

    it('should call diskStorageService.removeDirectory with correct parameters', async () => {
      jest.spyOn(diskStorage, 'removeDirectory');

      await service.deleteDirectory('/main/');

      expect(diskStorage.removeDirectory).toHaveBeenCalledWith('main');
    });

    it('should call diskStorageService.removePreviews with correct parameters', async () => {
      jest.spyOn(diskStorage, 'removePreviews');

      await service.deleteDirectory('/main/');

      expect(diskStorage.removePreviews).toHaveBeenCalledWith([
        '/path/to/mockFile-preview.jpg',
        '/path/to/mockFile-fullSize.jpg',
        '/path/to/mockFile-preview.jpg',
        '/path/to/mockFile-fullSize.jpg',
      ]);
    });

    it('should restore data if deletion error', async () => {
      jest.spyOn(service, 'addPathsToDB');
      jest.spyOn(mediaDB, 'addMediaToDB');
      jest
        .spyOn(diskStorage, 'removePreviews')
        .mockRejectedValue(new Error('mocked error'));

      try {
        await service.deleteDirectory('main');
      } catch {
        expect(service.addPathsToDB).toHaveBeenCalledWith([
          'main/nestjs',
          'main/nestjs/subDir',
          'main',
        ]);
        expect(mediaDB.addMediaToDB).toHaveBeenCalledWith(mockMediaList);
      }
    });

    it('should throw exception if deletion error', async () => {
      jest.spyOn(service, 'addPathsToDB');
      jest.spyOn(mediaDB, 'addMediaToDB');
      jest
        .spyOn(diskStorage, 'removePreviews')
        .mockRejectedValue(new Error('mocked error'));

      await expect(service.deleteDirectory('main')).rejects.toThrow(
        new InternalServerErrorException('mocked error'),
      );
    });
  });
});
