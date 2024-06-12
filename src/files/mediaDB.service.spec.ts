import { Test, TestingModule } from '@nestjs/testing';
import { MediaDB } from './mediaDB.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaTemp } from './entities/media-temp.entity';
import { Media } from './entities/media.entity';
import { Repository } from 'typeorm';
import {
  createMediaMock,
  createMediaTempMock,
  createMockProcessFile,
  exifDataMock,
} from './__mocks__/mocks';
import type { FilePaths, GetSameFilesIfExist } from './types';

describe('MediaDB', () => {
  let service: MediaDB;
  let tempRepository: Repository<MediaTemp>;
  let mediaRepository: Repository<Media>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaDB,
        {
          provide: getRepositoryToken(MediaTemp),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Media),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<MediaDB>(MediaDB);
    tempRepository = module.get<Repository<MediaTemp>>(
      getRepositoryToken(MediaTemp),
    );
    mediaRepository = module.get<Repository<Media>>(getRepositoryToken(Media));
  });

  afterEach(jest.clearAllMocks);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addFileToDBTemp', () => {
    it('should create a new MediaTemp entry with the correct data', async () => {
      const filePathsMock: FilePaths = {
        filePath: '/path/to/file.jpg',
        fullSizePath: '/path/to-fullSize.jpg',
        previewPath: '/path/to-preview.jpg',
      };
      const fileMock = createMockProcessFile();

      const mediaTempMock: MediaTemp = createMediaTempMock();
      jest.spyOn(tempRepository, 'save').mockResolvedValue(mediaTempMock);

      const expectedResponse = {
        changeDate: null,
        description: 'test description',
        exif: {
          DateTimeOriginal: '2020-01-01 00:00:00',
          Description: 'test description',
          GPSPosition: '42.5, 42.5',
          ImageSize: '1920x1080',
          Megapixels: 12,
          Rating: 5,
        },
        filePath: '/path/to/file.jpg',
        fullSizeJpg: '/path/to-fullSize.jpg',
        imageSize: '1920x1080',
        keywords: [],
        megapixels: 12,
        mimetype: 'image/jpeg',
        originalDate: new Date('2020-01-01T00:00:00.000Z'),
        originalName: 'original_mock_file.jpg',
        preview: '/path/to-preview.jpg',
        rating: 5,
        size: 1024,
        timeStamp: '00:00:00.000',
      };

      const result = await service.addFileToDBTemp(
        exifDataMock,
        filePathsMock,
        fileMock,
      );

      expect(tempRepository.save).toHaveBeenCalledWith(expectedResponse);
      expect(result).toEqual(mediaTempMock);
    });
  });

  describe('getSameFilesIfExist', () => {
    it('should return an array of files with the same original name', async () => {
      const originalNameMock: GetSameFilesIfExist = {
        originalName: 'test.jpg',
      };
      const mediaArrayMock: Media[] = [
        createMediaMock({ name: 'test1', originalNameWithoutExt: 'test' }),
        createMediaMock({ name: 'test2', originalNameWithoutExt: 'test' }),
      ];

      jest.spyOn(mediaRepository, 'find').mockResolvedValue(mediaArrayMock);

      const result = await service.getSameFilesIfExist(originalNameMock);

      expect(mediaRepository.find).toHaveBeenCalledWith({
        where: originalNameMock,
      });
      expect(result).toEqual(mediaArrayMock);
    });

    it('should return an empty array if no files with the same original name exist', async () => {
      const originalNameMock: GetSameFilesIfExist = {
        originalName: 'nonexistent.jpg',
      };
      jest.spyOn(mediaRepository, 'find').mockResolvedValue([]);

      const result = await service.getSameFilesIfExist(originalNameMock);

      expect(mediaRepository.find).toHaveBeenCalledWith({
        where: originalNameMock,
      });
      expect(result).toEqual([]);
    });
  });
});
