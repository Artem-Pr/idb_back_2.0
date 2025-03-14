import { Test, TestingModule } from '@nestjs/testing';
import { PathsController } from './paths.controller';
import { PathsService } from './paths.service';
import type { CheckDirectoryInputDto } from './dto/check-directory-input.dto';
import type { CheckDirectoryOutputDto } from './dto/check-directory-output.dto';
import { NotFoundException } from '@nestjs/common';
import type { DeleteDirectoryOutputDto } from './dto/delete-directory-output.dto';

describe('PathsController', () => {
  let controller: PathsController;
  let service: PathsService;
  const mockPaths = ['main/nestjs', 'typeorm', 'testing/jest/test'];
  const mockDirectoryQuery: CheckDirectoryInputDto = {
    directory: 'main/nestjs',
  };
  const mockCheckDirectoryResponse: CheckDirectoryOutputDto = {
    numberOfFiles: 0,
    numberOfSubdirectories: 0,
  };
  const deleteDirectoryResponse: DeleteDirectoryOutputDto = {
    directoriesToRemove: mockPaths,
    mediaList: [],
  };

  beforeEach(async () => {
    const mockPathsService = {
      getAllPathsFromDB: jest.fn().mockResolvedValue(mockPaths),
      checkDirectory: jest.fn().mockResolvedValue(mockCheckDirectoryResponse),
      deleteDirectory: jest.fn().mockResolvedValue(deleteDirectoryResponse),
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
    expect(service.getAllPathsFromDB).toHaveBeenCalled();
  });

  describe('checkDirectory', () => {
    it('should check if directory is valid', async () => {
      await expect(
        controller.checkDirectory(mockDirectoryQuery),
      ).resolves.toEqual(mockCheckDirectoryResponse);
      expect(service.checkDirectory).toHaveBeenCalledWith(
        mockDirectoryQuery.directory,
      );
    });

    it('should throw an error if directory input is invalid', async () => {
      jest
        .spyOn(service, 'checkDirectory')
        .mockRejectedValueOnce(
          new NotFoundException('There are no matching directories'),
        );

      const query: CheckDirectoryInputDto = { directory: 'invalid/directory' };
      await expect(controller.checkDirectory(query)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteDirectory', () => {
    it('should delete directory', async () => {
      await expect(
        controller.deleteDirectory(mockDirectoryQuery),
      ).resolves.toEqual(deleteDirectoryResponse);
      expect(service.deleteDirectory).toHaveBeenCalledWith('main/nestjs');
    });
  });
});
