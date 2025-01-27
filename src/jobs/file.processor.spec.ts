import { Test } from '@nestjs/testing';
import type { CreateImagePreview, CreatePreviewJob } from './files.processor';
import { FileProcessor } from './files.processor';
import { ConfigService } from 'src/config/config.service';
import axios from 'axios';
import * as ffmpeg from 'fluent-ffmpeg';
import type {
  FileNameWithExt,
  NameWithPreviewPostfix,
  SupportedMimetypes,
} from 'src/common/types';
import {
  MainDir,
  PreviewOptions,
  PreviewPostfix,
  SupportedVideoMimeTypes,
  SupportedImageMimetypes,
} from 'src/common/constants';
import type { ImageStoreServiceOutputDto } from './dto/image-store-service-output.dto';
import type { ImageStoreServiceInputDto } from './dto/image-store-service-input.dto';
import { Job } from 'bull';
import { BadRequestException } from '@nestjs/common';
import { addPreviewPostfix } from 'src/common/fileNameHelpers';
import { DiscStorageService } from 'src/files/discStorage.service';

jest.mock('fluent-ffmpeg', () => {
  return jest.fn().mockReturnThis();
});
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const previewPathsReturnValueMock = {
  filePathWithRoot: '../../test-data/volumes/main/4/new name.mp4',
  fullSizePathWithMainDir:
    'previews/video-mp4/fullSize/2000.12.06 - originalDate/new name-67532b573772581470498460-fullSize.jpg',
  fullSizePathWithRoot:
    '../../test-data/previews/video-mp4/fullSize/2000.12.06 - originalDate/new name-67532b573772581470498460-fullSize.jpg',
  fullSizePathWithoutRoot:
    '/video-mp4/fullSize/2000.12.06 - originalDate/new name-67532b573772581470498460-fullSize.jpg',
  previewPathWithMainDir:
    'previews/video-mp4/preview/2000.12.06 - originalDate/new name-67532b573772581470498461-preview.jpg',
  previewPathWithRoot:
    '../../test-data/previews/video-mp4/preview/2000.12.06 - originalDate/new name-67532b573772581470498461-preview.jpg',
  previewPathWithoutRoot:
    '/video-mp4/preview/2000.12.06 - originalDate/new name-67532b573772581470498461-preview.jpg',
};

const getPreviewMainDirMockImplementation = (
  mediaFileMainDir: MainDir,
): MainDir => {
  return mediaFileMainDir === MainDir.volumes
    ? MainDir.previews
    : mediaFileMainDir;
};

describe('FileProcessor', () => {
  let fileProcessor: FileProcessor;
  let mockConfigService: ConfigService;
  const getPreviewMainDirMock = jest
    .fn()
    .mockImplementation(getPreviewMainDirMockImplementation);
  const getPreviewPathsMock = jest
    .fn()
    .mockReturnValue(previewPathsReturnValueMock);

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
        {
          provide: DiscStorageService,
          useValue: {
            getPreviewPaths: getPreviewPathsMock,
            getPreviewMainDir: getPreviewMainDirMock,
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

  describe('CreatePreviewsJob', () => {
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
      const jobData: CreatePreviewJob = {
        fileName: 'to/image.jpg',
        fileType: SupportedImageMimetypes.jpeg,
        dirName: MainDir.temp,
      };

      const previewPaths = {
        outputFullSizeFilePath: '/to/image-fullSize.jpg',
        outputPreviewFilePath: '/to/image-preview.jpg',
      };

      const mockJob = {
        data: jobData,
      } as Job<CreatePreviewJob>;

      readyForImagePreview.mockReturnValue(true);
      createImagePreview.mockResolvedValue({
        previewPath: 'temp/to/image-preview.jpg',
      });

      const result = await fileProcessor.CreatePreviewsJob(mockJob);

      expect(readyForImagePreview).toHaveBeenCalledWith(mockJob.data);
      expect(createImagePreview).toHaveBeenCalledWith({
        ...mockJob.data,
        ...previewPaths,
      });
      expect(result).toHaveProperty('previewPath', 'temp/to/image-preview.jpg');
    });

    it('should process a video file when ready for video preview', async () => {
      const jobData: CreatePreviewJob = {
        fileName: 'video.mp4',
        fileType: SupportedVideoMimeTypes.mp4,
        dirName: MainDir.temp,
      };

      const mockJob = {
        data: jobData,
      } as Job<CreatePreviewJob>;

      readyForImagePreview.mockReturnValue(false);
      readyForVideoPreview.mockReturnValue(true);
      createVideoPreview.mockResolvedValue({
        previewPath: 'temp/to/video-preview.mp4',
      });

      const result = await fileProcessor.CreatePreviewsJob(mockJob);

      expect(readyForVideoPreview).toHaveBeenCalledWith(mockJob.data);
      expect(createVideoPreview).toHaveBeenCalledWith(jobData);
      expect(result).toHaveProperty('previewPath', 'temp/to/video-preview.mp4');
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const jobData: CreatePreviewJob = {
        fileName: 'file.txt' as FileNameWithExt,
        fileType: 'text/plain' as SupportedMimetypes['allFiles'],
        dirName: MainDir.temp,
      };

      const mockJob = {
        data: jobData,
      } as Job<CreatePreviewJob>;

      readyForImagePreview.mockReturnValue(false);
      readyForVideoPreview.mockReturnValue(false);

      await expect(fileProcessor.CreatePreviewsJob(mockJob)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw an error if createImagePreview throws an error', async () => {
      const jobData: CreatePreviewJob = {
        fileName: 'to/image.jpg',
        fileType: SupportedImageMimetypes.jpeg,
        dirName: MainDir.temp,
      };

      const mockJob = {
        data: jobData,
      } as Job<CreatePreviewJob>;

      readyForImagePreview.mockReturnValue(true);
      createImagePreview.mockRejectedValue(
        new Error('createImagePreview error'),
      );

      await expect(fileProcessor.CreatePreviewsJob(mockJob)).rejects.toThrow(
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
        const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
        expect(result).toBe(expected);
      },
    );

    it('should replace the original extension with -preview.jpg', () => {
      const fileName: FileNameWithExt = 'document.AVI';
      const expected: NameWithPreviewPostfix<FileNameWithExt> =
        'document-preview.jpg';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
      expect(result).toBe(expected);
    });

    it('should correctly handle filenames with multiple dots', () => {
      const fileName: FileNameWithExt = 'complex.name.image.jpg';
      const expected: NameWithPreviewPostfix<FileNameWithExt> =
        'complex.name.image-preview.jpg';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
      expect(result).toBe(expected);
    });
  });

  describe('readyForImagePreview', () => {
    it('should return true for supported image mime type and extension', () => {
      const jobData: CreatePreviewJob = {
        fileName: 'image.jpg',
        fileType: SupportedImageMimetypes.jpg,
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForImagePreview(jobData)).toBe(true);
    });

    it('should return false for unsupported image mime type', () => {
      const jobData: CreatePreviewJob = {
        fileName: 'image.jpg',
        fileType: 'image/unsupported' as SupportedMimetypes['allFiles'],
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForImagePreview(jobData)).toBe(false);
    });

    it('should return false for unsupported image extension', () => {
      const jobData: CreatePreviewJob = {
        fileName: 'image.unsupported' as FileNameWithExt,
        fileType: SupportedImageMimetypes.jpg,
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForImagePreview(jobData)).toBe(false);
    });
  });

  describe('readyForVideoPreview', () => {
    it('should return true for supported video mime type and extension', () => {
      const jobData: CreatePreviewJob = {
        fileName: 'image.mp4',
        fileType: SupportedVideoMimeTypes.mp4,
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForVideoPreview(jobData)).toBe(true);
    });

    it('should return false for unsupported video mime type', () => {
      const jobData: CreatePreviewJob = {
        fileName: 'image.mp4',
        fileType: 'video/unsupported' as SupportedMimetypes['allFiles'],
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForVideoPreview(jobData)).toBe(false);
    });

    it('should return false for unsupported video extension', () => {
      const jobData: CreatePreviewJob = {
        fileName: 'image.unsupported' as FileNameWithExt,
        fileType: SupportedVideoMimeTypes.mp4,
        dirName: MainDir.temp,
      };
      expect(fileProcessor.readyForVideoPreview(jobData)).toBe(false);
    });
  });

  describe('createImagePreview', () => {
    const imagePreviewJob: CreateImagePreview = {
      fileName: 'test.jpg',
      fileType: SupportedImageMimetypes.jpg,
      dirName: MainDir.temp,
      outputPreviewFilePath:
        '/image-jpeg/preview/${string} - originalDate/${string}-preview.jpg',
      outputFullSizeFilePath:
        '/image-jpeg/fullSize/${string} - originalDate/${string}-fullSize.jpg',
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
        outputPreviewMainDirName: MainDir.temp,
        outputFullSizeFilePath:
          '/image-jpeg/fullSize/${string} - originalDate/${string}-fullSize.jpg',
        outputPreviewFilePath:
          '/image-jpeg/preview/${string} - originalDate/${string}-preview.jpg',
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

  describe('getPreviewPathWithoutPostfix', () => {
    it('should return correct preview path for temp directory', () => {
      const jobData: CreatePreviewJob = {
        fileName: 'test.jpg',
        fileType: SupportedImageMimetypes.jpg,
        dirName: MainDir.temp,
      };

      const result = fileProcessor['getPreviewPathWithoutPostfix'](
        jobData,
        PreviewPostfix.preview,
      );

      expect(result).toBe('/test-preview.jpg');
    });

    it('should return correct preview path for volumes directory', () => {
      const jobData: CreatePreviewJob = {
        fileName: 'test.jpg',
        fileType: SupportedImageMimetypes.jpg,
        dirName: MainDir.volumes,
        date: new Date('2024-11-16'),
      };

      const expectedPattern =
        /^\/image-jpg\/preview\/2024\.11\.16 - originalDate\/test-[0-9a-f]{24}-preview\.jpg$/;

      const result = fileProcessor['getPreviewPathWithoutPostfix'](
        jobData,
        PreviewPostfix.preview,
      );

      expect(result).toEqual(expect.stringMatching(expectedPattern));
    });

    it('should return correct preview path if provided fileName contains folders', () => {
      const jobData: CreatePreviewJob = {
        fileName: '/main/folder/test.jpg',
        fileType: SupportedImageMimetypes.jpg,
        dirName: MainDir.volumes,
        date: new Date('2024-11-16'),
      };

      const expectedPattern =
        /^\/image-jpg\/preview\/2024\.11\.16 - originalDate\/test-[0-9a-f]{24}-preview\.jpg$/;

      const result = fileProcessor['getPreviewPathWithoutPostfix'](
        jobData,
        PreviewPostfix.preview,
      );

      expect(result).toEqual(expect.stringMatching(expectedPattern));
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
      mockedAxios.get.mockResolvedValue({ data: {} });
      const mainDir = MainDir.volumes;
      const filePathWithRoot = `/Users/artempriadkin/Development/test-data/${mainDir}/main/4/${videoPath}`;
      getPreviewPathsMock.mockReturnValue({
        ...previewPathsReturnValueMock,
        filePathWithRoot: filePathWithRoot,
      });

      const result = await fileProcessor.createVideoPreview({
        fileName: videoPath,
        fileType: SupportedVideoMimeTypes.mp4,
        dirName: mainDir,
      });

      expect(ffmpeg).toHaveBeenCalledWith(filePathWithRoot);
      expect(result).toEqual({
        fullSizePath:
          'previews/video-mp4/fullSize/2000.12.06 - originalDate/new name-67532b573772581470498460-fullSize.jpg',
        previewPath: undefined,
      });
    });
  });
});
