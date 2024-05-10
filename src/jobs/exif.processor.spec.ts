import { Test, TestingModule } from '@nestjs/testing';
import type { GetExifJob } from './exif.processor';
import { ExifProcessor } from './exif.processor';
import type { Job } from 'bull';
import { ConfigService } from 'src/config/config.service';
import { MainDirPath } from 'src/common/constants';

const read = jest.fn().mockResolvedValue({ Model: 'TestCamera' });

jest.mock('exiftool-vendored', () => {
  class MockedExifTool {
    read = read;
    end = jest.fn();
  }

  return {
    ...jest.requireActual('exiftool-vendored'),
    ExifTool: MockedExifTool,
  };
});

describe('ExifProcessor', () => {
  let exifProcessor: ExifProcessor;
  let mockJob: Job<GetExifJob>;
  let mockConfigService: ConfigService;

  beforeEach(async () => {
    mockJob = {
      id: '1',
      data: { filePaths: ['test.jpg'], mainDir: 'temp' },
    } as Partial<Job<GetExifJob>> as Job<GetExifJob>;
    mockConfigService = {
      mainDirPath: MainDirPath.dev,
    } as Partial<ConfigService> as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExifProcessor,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    exifProcessor = module.get<ExifProcessor>(ExifProcessor);
  });

  it('should be defined', () => {
    expect(exifProcessor).toBeDefined();
  });

  it('should process exif job and return exif data', async () => {
    const expectedExifData = { 'test.jpg': { Model: 'TestCamera' } };
    const filePath = 'test.jpg';
    const previewPath = `${mockConfigService.mainDirPath}/${mockJob.data.mainDir}/${filePath}`;

    const result = await exifProcessor.processGetExifJob(mockJob);

    expect(result).toEqual(expectedExifData);
    expect(read).toHaveBeenCalledWith(previewPath);
  });

  it('should throw error if exif job fails', async () => {
    read.mockRejectedValue(new Error('EXIF read failure'));

    await expect(exifProcessor.processGetExifJob(mockJob)).rejects.toThrow(
      'Failed to read EXIF data',
    );
  });
});
