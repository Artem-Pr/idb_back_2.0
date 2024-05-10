import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService, ProcessFileResultDeprecated } from './files.service';
import { BadRequestException, HttpException } from '@nestjs/common';
import { FileMediaInterceptor } from './file.interceptor';
import { ConfigService } from 'src/config/config.service';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: FilesService;
  let mockConfigService: ConfigService;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as any;

    const mockFilesService = { processFile: jest.fn() };

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
      await expect(controller.uploadFile(unsupportedFile));
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
      await expect(controller.uploadFile(unsupportedMime));
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
    } as unknown as ProcessFileResultDeprecated;
    jest
      .spyOn(filesService, 'processFile')
      .mockResolvedValue(processFileResponse);

    const result = await controller.uploadFile(supportedFile);
    expect(filesService.processFile).toHaveBeenCalledWith(supportedFile);
    expect(result).toBe(processFileResponse);
  });
});
