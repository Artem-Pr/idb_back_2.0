import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
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
import { DiscStorageService } from './discStorage.service';
import { FileUploadDto } from './dto/upload-file-input.dto';
import { MediaDBService } from './mediaDB.service';
import { TusService } from './tus.service';
import type { FileNameWithExt, SupportedMimetypes } from 'src/common/types';
import { HttpStatus } from '@nestjs/common';
import type { GetFilesDescriptionsInputDto } from './dto/get-files-descriptions-input.dto';
import type { GetFilesDescriptionsOutputDto } from './dto/get-files-descriptions-output.dto';
import { GetExifValuesHandler } from './exif-values/handlers/get-exif-values.handler';
import { GetExifValueRangeHandler } from './exif-values/handlers/get-exif-value-range.handler';

describe('FilesController', () => {
  let filesController: FilesController;
  let filesService: FilesService;
  let configService: ConfigService;
  let tusService: TusService;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    } as any;

    const mockFilesService = {
      cleanTemp: jest.fn(),
      deleteFilesByIds: jest.fn(),
      getDuplicatesFromMediaDBByFilePaths: jest.fn(),
      getDuplicatesFromMediaDBByOriginalNames: jest.fn(),
      getFiles: jest.fn(),
      processFile: jest.fn(),
      saveFiles: jest.fn(),
      updateFiles: jest.fn(),
      getFilesDescriptions: jest.fn(),
    };

    const mockTusService = {
      handle: jest.fn(),
    };

    const mockGetExifValuesHandler = {
      handle: jest.fn(),
    };

    const mockGetExifValueRangeHandler = {
      handle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FileMediaInterceptor,
          useValue: new FileMediaInterceptor(configService),
        },
        { provide: FilesService, useValue: mockFilesService },
        { provide: ConfigService, useValue: configService },
        {
          provide: MediaDBService,
          useValue: { updateMediaInOldDBToMakeItValid: jest.fn() },
        },
        {
          provide: DiscStorageService,
          useValue: { emptyDirectory: jest.fn() },
        },
        {
          provide: TusService,
          useValue: mockTusService,
        },
        {
          provide: GetExifValuesHandler,
          useValue: mockGetExifValuesHandler,
        },
        {
          provide: GetExifValueRangeHandler,
          useValue: mockGetExifValueRangeHandler,
        },
      ],
    }).compile();

    filesController = module.get<FilesController>(FilesController);
    filesService = module.get<FilesService>(FilesService);
    tusService = module.get<TusService>(TusService);
  });

  it('should be defined', () => {
    expect(filesController).toBeDefined();
  });

  describe('getFiles', () => {
    it('should call filesService.getFiles and return its result', async () => {
      const filesQuery: GetFilesInputDto = {
        filters: { includeAllSearchTags: true, searchTags: ['01Cnt-Испания'] },
        sorting: {
          sort: {
            mimetype: -1,
            id: 1,
            originalDate: -1,
            filePath: -1,
          },
          randomSort: true,
        },
        folders: { showSubfolders: true, isDynamicFolders: true },
        pagination: { page: 1, perPage: 50 },
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
            staticVideoFullSize: null,
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

      const result = await filesController.getFiles(filesQuery);
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

      const result = await filesController.saveFiles(filesToUpload);
      expect(filesService.saveFiles).toHaveBeenCalledWith(filesToUpload);
      expect(result).toBe(response);
    });
  });

  describe('updateFiles', () => {
    it('should call filesService.updateFiles and return its result', async () => {
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

      jest
        .spyOn(filesService, 'updateFiles')
        .mockResolvedValue({ response, errors: [] });

      const result = await filesController.updateFiles(filesToUpload);
      expect(filesService.updateFiles).toHaveBeenCalledWith(filesToUpload);
      expect(result).toEqual({ response, errors: [] });
    });
  });

  describe('uploadFile', () => {
    it('should call processFile and return its result for a supported file', async () => {
      const supportedFile = {
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
        filename: 'image.jpg',
      } as Express.Multer.File & FileUploadDto;

      const processFileResponse = {
        response: 'http://localhost/image.jpg',
      } as unknown as UploadFileOutputDto;
      jest
        .spyOn(filesService, 'processFile')
        .mockResolvedValue(processFileResponse);

      const result = await filesController.uploadFile(supportedFile);
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
        await filesController.checkDuplicatesByOriginalNames(duplicatesQuery);
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
        await filesController.checkDuplicatesByFilePaths(duplicatesQuery);
      expect(
        filesService.getDuplicatesFromMediaDBByFilePaths,
      ).toHaveBeenCalledWith(duplicatesQuery.filePaths);
      expect(result).toBe(duplicatesResponse);
    });
  });

  describe('deleteFiles', () => {
    it('should call deleteFilesByIds', async () => {
      await filesController.deleteFiles({ ids: ['1', '2'] });
      expect(filesService.deleteFilesByIds).toHaveBeenCalled();
      expect(filesService.deleteFilesByIds).toHaveBeenCalledWith(['1', '2']);
    });
  });

  describe('cleanTemp', () => {
    it('should call cleanTemp', async () => {
      await filesController.cleanTemp();
      expect(filesService.cleanTemp).toHaveBeenCalled();
      expect(filesService.cleanTemp).toHaveBeenCalledWith();
    });
  });

  describe('handleNestedTusRequest', () => {
    it('should handle TUS request and return processed file response', async () => {
      const mockReq = {
        url: '/tus/123',
      } as unknown as Request;
      const mockRes = {} as unknown as Response;

      const mockTusResponse = {
        metadata: {
          filename: 'test.jpg' as FileNameWithExt,
          filetype: 'image/jpeg' as SupportedMimetypes['allFiles'],
          originalFilename: 'original.jpg' as FileNameWithExt,
          size: 1024,
          changeDate: 1234567890,
        },
        resolve: jest.fn(),
        reject: jest.fn().mockImplementation((error) => {
          throw error;
        }),
      };

      const mockFileServiceResponse = {
        properties: {
          id: '123',
          filename: 'test.jpg',
          mimetype: 'image/jpeg',
          originalname: 'original.jpg',
          size: 1024,
          duplicates: [],
          filePath: null,
          originalName: 'original.jpg',
          megapixels: 0,
          originalDate: new Date(),
          imageSize: '0x0',
          keywords: [],
          rating: null,
          description: null,
          exif: {},
          staticPath: null,
          staticPreview: null,
          staticVideoFullSize: null,
          timeStamp: '00:00:00.000',
          changeDate: 1234567890,
        },
      } as unknown as UploadFileOutputDto;

      jest.spyOn(tusService, 'handle').mockResolvedValue(mockTusResponse);
      jest
        .spyOn(filesService, 'processFile')
        .mockResolvedValue(mockFileServiceResponse);

      await filesController.handleNestedTusRequest(mockReq, mockRes);

      expect(tusService.handle).toHaveBeenCalledWith(mockReq, mockRes);
      expect(filesService.processFile).toHaveBeenCalledWith({
        filename: mockTusResponse.metadata.filename,
        mimetype: mockTusResponse.metadata.filetype,
        originalname: mockTusResponse.metadata.originalFilename,
        size: mockTusResponse.metadata.size,
      });
      expect(mockTusResponse.resolve).toHaveBeenCalledWith({
        status_code: HttpStatus.CREATED,
        body: JSON.stringify(
          FilesService.applyUTCChangeDateToFileOutput(
            mockFileServiceResponse,
            mockTusResponse.metadata.changeDate,
          ),
        ),
      });
    });

    it('should handle errors from TUS service', async () => {
      const mockReq = {
        url: '/tus/123',
      } as unknown as Request;
      const mockRes = {} as unknown as Response;

      jest
        .spyOn(tusService, 'handle')
        .mockRejectedValue(new Error('TUS error'));

      await expect(
        filesController.handleNestedTusRequest(mockReq, mockRes),
      ).rejects.toThrow('TUS error');
    });

    it('should handle errors from file processing', async () => {
      const mockReq = {
        url: '/tus/123',
      } as unknown as Request;
      const mockRes = {} as unknown as Response;

      const mockTusResponse = {
        metadata: {
          filename: 'test.jpg' as FileNameWithExt,
          filetype: 'image/jpeg' as SupportedMimetypes['allFiles'],
          originalFilename: 'original.jpg' as FileNameWithExt,
          size: 1024,
          changeDate: 1234567890,
        },
        resolve: jest.fn(),
        reject: jest.fn().mockImplementation((error) => {
          throw error;
        }),
      };

      jest.spyOn(tusService, 'handle').mockResolvedValue(mockTusResponse);
      jest
        .spyOn(filesService, 'processFile')
        .mockRejectedValue(new Error('File processing error'));

      await expect(
        filesController.handleNestedTusRequest(mockReq, mockRes),
      ).rejects.toThrow('File processing error');
    });
  });

  describe('getFilesDescriptions', () => {
    it('should call filesService.getFilesDescriptions and return its result', async () => {
      const query: GetFilesDescriptionsInputDto = {
        descriptionPart: 'test description',
        page: 1,
        perPage: 10,
      };

      const response: GetFilesDescriptionsOutputDto = {
        descriptions: ['test description 1', 'test description 2'],
        page: 1,
        perPage: 10,
        resultsCount: 2,
        totalPages: 1,
      };

      jest
        .spyOn(filesService, 'getFilesDescriptions')
        .mockResolvedValue(response);

      const result = await filesController.getFilesDescriptions(query);
      expect(filesService.getFilesDescriptions).toHaveBeenCalledWith(query);
      expect(result).toBe(response);
    });

    it('should use default values when optional parameters are not provided', async () => {
      const query: GetFilesDescriptionsInputDto = {
        descriptionPart: 'test',
      };

      const response: GetFilesDescriptionsOutputDto = {
        descriptions: ['test description'],
        page: 1,
        perPage: 10,
        resultsCount: 1,
        totalPages: 1,
      };

      jest
        .spyOn(filesService, 'getFilesDescriptions')
        .mockResolvedValue(response);

      const result = await filesController.getFilesDescriptions(query);
      expect(filesService.getFilesDescriptions).toHaveBeenCalledWith(query);
      expect(result).toBe(response);
    });

    it('should handle empty results', async () => {
      const query: GetFilesDescriptionsInputDto = {
        descriptionPart: 'nonexistent',
        page: 1,
        perPage: 10,
      };

      const response: GetFilesDescriptionsOutputDto = {
        descriptions: [],
        page: 1,
        perPage: 10,
        resultsCount: 0,
        totalPages: 0,
      };

      jest
        .spyOn(filesService, 'getFilesDescriptions')
        .mockResolvedValue(response);

      const result = await filesController.getFilesDescriptions(query);
      expect(filesService.getFilesDescriptions).toHaveBeenCalledWith(query);
      expect(result).toBe(response);
    });
  });
});
