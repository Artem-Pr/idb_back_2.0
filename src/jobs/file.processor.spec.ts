import { Test } from '@nestjs/testing';
import type {
  FileProcessingJob,
  ImagePreviewJob,
  NameWithPreviewPostfix,
} from './files.processor';
import { FileProcessor } from './files.processor';
import { ConfigService } from 'src/config/config.service';
import axios from 'axios';
import * as ffmpeg from 'fluent-ffmpeg';
import {
  FileNameWithExt,
  PreviewPath,
  SupportedMimetypes,
} from 'src/common/types';
import { MainDir, PreviewOptions } from 'src/common/constants';
import type { ImageStoreServiceOutputDto } from './dto/image-store-service-output.dto';
import type { ImageStoreServiceInputDto } from './dto/image-store-service-input.dto';
import { Job } from 'bull';
import { BadRequestException } from '@nestjs/common';

jest.mock('fluent-ffmpeg', () => {
  return jest.fn().mockReturnThis();
});
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FileProcessor', () => {
  let fileProcessor: FileProcessor;
  let mockConfigService: ConfigService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FileProcessor,
        {
          provide: ConfigService,
          useValue: {
            imageStoreServiceUrl: 'http://localhost:3001',
            rootPaths: {
              [MainDir.temp]: '../../test-data/temp',
              [MainDir.previews]: '../../test-data/previews',
              [MainDir.volumes]: '../../test-data/volumes',
            },
          },
        },
      ],
    }).compile();

    fileProcessor = moduleRef.get<FileProcessor>(FileProcessor);
    mockConfigService = moduleRef.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ProcessingFileJob', () => {
    let readyForImagePreview: jest.SpyInstance;
    let readyForVideoPreview: jest.SpyInstance;
    let createImagePreview: jest.SpyInstance;
    let createVideoPreview: jest.SpyInstance;

    beforeEach(() => {
      readyForImagePreview = jest.spyOn(fileProcessor, 'readyForImagePreview');
      readyForVideoPreview = jest.spyOn(fileProcessor, 'readyForVideoPreview');
      createImagePreview = jest.spyOn(fileProcessor, 'createImagePreview');
      createVideoPreview = jest.spyOn(fileProcessor, 'createVideoPreview');
    });

    afterEach(() => {
      readyForImagePreview.mockRestore();
      readyForVideoPreview.mockRestore();
      createImagePreview.mockRestore();
      createVideoPreview.mockRestore();
    });

    it('should process an image file when ready for image preview', async () => {
      const mockJob = {
        data: {
          fileName: 'to/image.jpg',
          fileType: 'image/jpeg',
          dirName: MainDir.temp,
        },
      } as Partial<Job<FileProcessingJob>> as Job<FileProcessingJob>;

      readyForImagePreview.mockReturnValue(true);
      createImagePreview.mockResolvedValue({
        previewPath: 'temp/to/image-preview.jpg',
      });

      const result = await fileProcessor.ProcessingFileJob(mockJob);

      expect(readyForImagePreview).toHaveBeenCalledWith(mockJob.data);
      expect(createImagePreview).toHaveBeenCalledWith(mockJob.data);
      expect(result).toHaveProperty('previewPath', 'temp/to/image-preview.jpg');
    });

    it('should process a video file when ready for video preview', async () => {
      const mockJob = {
        data: {
          fileName: 'video.mp4',
          fileType: 'video/mp4',
          dirName: MainDir.temp,
        },
      } as Partial<Job<FileProcessingJob>> as Job<FileProcessingJob>;

      readyForImagePreview.mockReturnValue(false);
      readyForVideoPreview.mockReturnValue(true);
      createVideoPreview.mockResolvedValue('temp/to/video-preview.mp4');

      const result = await fileProcessor.ProcessingFileJob(mockJob);

      expect(readyForVideoPreview).toHaveBeenCalledWith(mockJob.data);
      expect(createVideoPreview).toHaveBeenCalledWith(
        mockJob.data.fileName,
        mockJob.data.dirName,
      );
      expect(result).toHaveProperty('previewPath', 'temp/to/video-preview.mp4');
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const mockJob = {
        data: {
          fileName: 'file.txt' as FileNameWithExt,
          fileType: 'text/plain' as SupportedMimetypes['allFiles'],
          dirName: MainDir.temp,
        },
      } as Partial<Job<FileProcessingJob>> as Job<FileProcessingJob>;

      readyForImagePreview.mockReturnValue(false);
      readyForVideoPreview.mockReturnValue(false);

      await expect(fileProcessor.ProcessingFileJob(mockJob)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw an error if createImagePreview throws an error', async () => {
      const mockJob = {
        data: {
          fileName: 'to/image.jpg',
          fileType: 'image/jpeg',
          dirName: MainDir.temp,
        },
      } as Partial<Job<FileProcessingJob>> as Job<FileProcessingJob>;

      readyForImagePreview.mockReturnValue(true);
      createImagePreview.mockRejectedValue(
        new Error('createImagePreview error'),
      );

      await expect(fileProcessor.ProcessingFileJob(mockJob)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('addPreviewPostfix', () => {
    const testCases: {
      fileName: FileNameWithExt;
      expected: NameWithPreviewPostfix<FileNameWithExt>;
    }[] = [
      { fileName: 'test.jpg', expected: 'test-preview.jpg' },
      { fileName: 'test.MP4', expected: 'test-preview.jpg' },
      { fileName: 'test.png', expected: 'test-preview.jpg' },
      { fileName: 'test.jpeg', expected: 'test-preview.jpg' },
      { fileName: 'test-heic.HEIC', expected: 'test-heic-preview.jpg' },
    ];
    it.each(testCases)(
      'should add preview postfix to $fileName',
      ({ fileName, expected }) => {
        const result = fileProcessor.addPreviewPostfix(fileName);
        expect(result).toBe(expected);
      },
    );

    it('should replace the original extension with -preview.jpg', () => {
      const fileName: FileNameWithExt = 'document.AVI';
      const expected: NameWithPreviewPostfix<FileNameWithExt> =
        'document-preview.jpg';
      const result = fileProcessor.addPreviewPostfix(fileName);
      expect(result).toBe(expected);
    });

    it('should correctly handle filenames with multiple dots', () => {
      const fileName: FileNameWithExt = 'complex.name.image.jpg';
      const expected: NameWithPreviewPostfix<FileNameWithExt> =
        'complex.name.image-preview.jpg';
      const result = fileProcessor.addPreviewPostfix(fileName);
      expect(result).toBe(expected);
    });
  });

  describe('readyForImagePreview', () => {
    it('should return true for supported image mime type and extension', () => {
      const jobData: FileProcessingJob = {
        fileName: 'image.jpg',
        fileType: 'image/jpeg',
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForImagePreview(jobData)).toBe(true);
    });

    it('should return false for unsupported image mime type', () => {
      const jobData: FileProcessingJob = {
        fileName: 'image.jpg',
        fileType: 'image/unsupported' as SupportedMimetypes['allFiles'],
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForImagePreview(jobData)).toBe(false);
    });

    it('should return false for unsupported image extension', () => {
      const jobData: FileProcessingJob = {
        fileName: 'image.unsupported' as FileNameWithExt,
        fileType: 'image/jpeg',
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForImagePreview(jobData)).toBe(false);
    });
  });

  describe('readyForVideoPreview', () => {
    it('should return true for supported video mime type and extension', () => {
      const jobData: FileProcessingJob = {
        fileName: 'image.mp4',
        fileType: 'video/mp4',
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForVideoPreview(jobData)).toBe(true);
    });

    it('should return false for unsupported video mime type', () => {
      const jobData: FileProcessingJob = {
        fileName: 'image.mp4',
        fileType: 'video/unsupported' as SupportedMimetypes['allFiles'],
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForVideoPreview(jobData)).toBe(false);
    });

    it('should return false for unsupported video extension', () => {
      const jobData: FileProcessingJob = {
        fileName: 'image.unsupported' as FileNameWithExt,
        fileType: 'video/mp4',
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForVideoPreview(jobData)).toBe(false);
    });
  });

  describe('createImagePreview', () => {
    const imagePreviewJob: ImagePreviewJob = {
      fileName: 'test.jpg',
      fileType: 'image/jpeg',
      dirName: MainDir.temp,
    };

    it('should successfully create an image preview', async () => {
      const responseData: ImageStoreServiceOutputDto = {
        previewPath: 'temp/to/filename-preview.jpg',
      };
      const expectedParams: ImageStoreServiceInputDto = {
        inputMainDirName: MainDir.temp,
        fileNameWithExtension: imagePreviewJob.fileName,
        fileType: imagePreviewJob.fileType,
        resizeOptionsWidth: PreviewOptions.width,
        resizeOptionsHeight: PreviewOptions.height,
        resizeOptionsFit: PreviewOptions.fit,
        jpegOptionsQuality: PreviewOptions.quality,
      };

      mockedAxios.get.mockResolvedValue({ data: responseData });

      const result = await fileProcessor.createImagePreview(imagePreviewJob);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockConfigService.imageStoreServiceUrl}/sharp`,
        { params: expectedParams },
      );
      expect(result).toEqual(responseData);
    });

    it('should throw HttpException when the axios request fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        fileProcessor.createImagePreview(imagePreviewJob),
      ).rejects.toThrow('Error processing image:');
    });
  });

  describe('createVideoPreview', () => {
    const videoPath = 'test.mp4';

    beforeEach(() => {
      (ffmpeg as unknown as jest.Mock).mockClear();
      (ffmpeg as unknown as jest.Mock).mockImplementation(() => {
        return {
          screenshots: jest.fn().mockReturnThis(),
          on: jest.fn((event, callback) => {
            if (event === 'end') {
              callback();
            }
            return {
              on: jest.fn((errorEvent, errorCallback) => {
                if (errorEvent === 'error') {
                  errorCallback(new Error('Error creating video preview'));
                }
              }),
            };
          }),
        };
      });
    });

    it('should successfully create a video preview', async () => {
      const expectedPreviewPath: PreviewPath = 'temp/test-preview.jpg';

      const result = await fileProcessor.createVideoPreview(
        videoPath,
        MainDir.temp,
      );

      expect(ffmpeg).toHaveBeenCalledWith(`../../test-data/temp/${videoPath}`);
      expect(result).toEqual(expectedPreviewPath);
    });
  });
});
