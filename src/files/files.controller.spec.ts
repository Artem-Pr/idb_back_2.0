import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { BadRequestException, HttpException } from '@nestjs/common';
import { FileMediaInterceptor } from './file.interceptor';
import { ConfigService } from 'src/config/config.service';
import type { UploadFileOutputDto } from './dto/upload-file-output.dto';
import type { CheckDuplicatesOriginalNamesInputDto } from './dto/check-duplicates-original-names-input.dto';
import type { CheckDuplicatesOriginalNamesOutputDto } from './dto/check-duplicates-original-names-output.dto';
import { uploadFileMock } from './__mocks__/mocks';
import type { CheckDuplicatesFilePathsInputDto } from './dto/check-duplicates-file-paths-input.dto';
import type { CheckDuplicatesFilePathsOutputDto } from './dto/check-duplicates-file-paths-output.dto';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: FilesService;
  let mockConfigService: ConfigService;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as any;

    const mockFilesService = {
      processFile: jest.fn(),
      getDuplicatesFromMediaDBByOriginalNames: jest.fn(),
      getDuplicatesFromMediaDBByFilePaths: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: mockFilesService },
        {
          provide: FileMediaInterceptor,
          useValue: new FileMediaInterceptor(mockConfigService),
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    filesService = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should throw BadRequestException when no file is uploaded', async () => {
      try {
        await controller.uploadFile(undefined as any);
        fail('The controller did not throw a BadRequestException'); // This line should not be reached
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('File upload failed');
      }
    });

    it('should throw HttpException when uploaded file has unsupported extension', async () => {
      const unsupportedFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        filename: 'test.txt',
      } as Express.Multer.File;

      try {
        await controller.uploadFile(unsupportedFile);
        fail('The controller did not throw a BadRequestException'); // This line should not be reached
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toBe('Unsupported file type');
      }
    });

    it('should throw HttpException when uploaded file has unsupported mime type', async () => {
      const unsupportedMime = {
        originalname: 'test.png',
        mimetype: 'application/octet-stream',
        filename: 'test.png',
      } as Express.Multer.File;

      try {
        await controller.uploadFile(unsupportedMime);
        fail('The controller did not throw a BadRequestException'); // This line should not be reached
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toBe('Unsupported file type');
      }
    });

    it('should call processFile and return its result for a supported file', async () => {
      const supportedFile = {
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
        filename: 'image.jpg',
      } as Express.Multer.File;

      const processFileResponse = {
        response: 'http://localhost/image.jpg',
      } as unknown as UploadFileOutputDto;
      jest
        .spyOn(filesService, 'processFile')
        .mockResolvedValue(processFileResponse);

      const result = await controller.uploadFile(supportedFile);
      expect(filesService.processFile).toHaveBeenCalledWith(supportedFile);
      expect(result).toBe(processFileResponse);
    });
  });

  describe('checkDuplicatesByOriginalNames', () => {
    it('should call getDuplicatesFromMediaDBByOriginalNames and return its result', async () => {
      const duplicatesQuery: CheckDuplicatesOriginalNamesInputDto = {
        originalNames: ['image1.jpg', 'image2.jpg'],
      };

      const duplicatesResponse: CheckDuplicatesOriginalNamesOutputDto = {
        'mockImage.jpg': [],
        'mockImage2.jpg': uploadFileMock.properties.duplicates,
      };

      jest
        .spyOn(filesService, 'getDuplicatesFromMediaDBByOriginalNames')
        .mockResolvedValue(duplicatesResponse);

      const result =
        await controller.checkDuplicatesByOriginalNames(duplicatesQuery);
      expect(
        filesService.getDuplicatesFromMediaDBByOriginalNames,
      ).toHaveBeenCalledWith(duplicatesQuery.originalNames);
      expect(result).toBe(duplicatesResponse);
    });
  });

  describe('checkDuplicatesByFilePaths', () => {
    it('should call getDuplicatesFromMediaDBByFilePaths and return its result', async () => {
      const duplicatesQuery: CheckDuplicatesFilePathsInputDto = {
        filePaths: ['/image1.jpg', '/image2.jpg'],
      };

      const duplicatesResponse: CheckDuplicatesFilePathsOutputDto = {
        '/mockImage.jpg': [],
        '/mockImage2.jpg': uploadFileMock.properties.duplicates,
      };

      jest
        .spyOn(filesService, 'getDuplicatesFromMediaDBByFilePaths')
        .mockResolvedValue(duplicatesResponse);

      const result =
        await controller.checkDuplicatesByFilePaths(duplicatesQuery);
      expect(
        filesService.getDuplicatesFromMediaDBByFilePaths,
      ).toHaveBeenCalledWith(duplicatesQuery.filePaths);
      expect(result).toBe(duplicatesResponse);
    });
  });
});
