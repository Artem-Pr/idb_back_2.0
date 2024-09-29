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
import type { UpdatedFilesInputDto } from './dto/update-files-input.dto';
import { Media } from './entities/media.entity';
import type { GetFilesInputDto } from './dto/get-files-input.dto';
import type { GetFilesOutputDto } from './dto/get-files-output.dto';
import { SupportedImageMimetypes } from 'src/common/constants';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: FilesService;
  let mockConfigService: ConfigService;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as any;

    const mockFilesService = {
      getDuplicatesFromMediaDBByFilePaths: jest.fn(),
      getDuplicatesFromMediaDBByOriginalNames: jest.fn(),
      processFile: jest.fn(),
      saveFiles: jest.fn(),
      getFiles: jest.fn(),
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

  describe('getFiles', () => {
    it('should call filesService.getFiles and return its result', async () => {
      const filesQuery: GetFilesInputDto = {
        filters: { includeAllSearchTags: true, searchTags: ['01Cnt-Испания'] },
        sorting: {
          sort: {
            mimetype: -1,
            _id: 1,
            originalDate: -1,
            filePath: -1,
          },
          randomSort: true,
        },
        folders: { showSubfolders: true, isDynamicFolders: true },
        pagination: { page: 1, perPage: 50 },
        settings: { dontSavePreview: true },
      };

      const response: GetFilesOutputDto = {
        dynamicFolders: ['folder/1'],
        files: [
          {
            changeDate: 169971439808,
            description: null,
            duplicates: [],
            exif: {},
            filePath: '/3/2019.09.19 IMG_9046.jpg',
            id: '66f1bdd4556c15c33c7bdab0',
            imageSize: '5184x3456',
            keywords: [
              '01Cnt-Испания',
              '02Cty-Валенсия',
              '16Oth-путешествия',
              '08Typ-портрет',
            ],
            megapixels: 17.9,
            mimetype: SupportedImageMimetypes.jpeg,
            originalDate: new Date('1970-01-01T00:00:00.000Z'),
            originalName: '2019.09.19 IMG_9046.jpg',
            rating: null,
            size: 1916910,
            staticPath:
              'http://localhost:3000/volumes/3/2019.09.19 IMG_9046.jpg',
            staticPreview:
              'http://localhost:3000/previews/image-jpeg/preview/1970.01.01 - originalDate/2019.09.19 IMG_9046-preview.jpg',
            timeStamp: '00:00:00.000',
          },
        ],
        filesSizeSum: 1916910,
        searchPagination: {
          currentPage: 1,
          nPerPage: 50,
          resultsCount: 134,
          totalPages: 3,
        },
      };

      jest.spyOn(filesService, 'getFiles').mockResolvedValue(response);

      const result = await controller.getFiles(filesQuery);
      expect(filesService.getFiles).toHaveBeenCalledWith(filesQuery);
      expect(result).toBe(response);
    });
  });

  describe('saveFiles', () => {
    it('should call filesService.saveFiles and return its result', async () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '1',
            updatedFields: { originalName: 'test.jpg' },
          },
          {
            id: '2',
            updatedFields: { originalDate: 'test2.jpg' },
          },
        ],
      };

      const response = [new Media(), new Media()];

      jest.spyOn(filesService, 'saveFiles').mockResolvedValue(response);

      const result = await controller.saveFiles(filesToUpload);
      expect(filesService.saveFiles).toHaveBeenCalledWith(filesToUpload);
      expect(result).toBe(response);
    });
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
