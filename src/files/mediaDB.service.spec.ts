import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { UpdateMedia } from './mediaDB.service';
import { DBType, MediaDBService } from './mediaDB.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaTemp } from './entities/media-temp.entity';
import { Media } from './entities/media.entity';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import {
  createMediaMock,
  createMediaTempMock,
  createMockProcessFile,
  exifDataMock,
} from './__mocks__/mocks';
import type { FilePaths, GetSameFilesIfExist } from './types';
import type { UpdatedFilesInputDto } from './dto/update-files-input.dto';

describe('MediaDB', () => {
  let service: MediaDBService;
  let tempRepository: Repository<MediaTemp>;
  let mediaRepository: Repository<Media>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaDBService,
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

    service = module.get<MediaDBService>(MediaDBService);
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

  describe('addMediaToDB', () => {
    it('should call mediaRepository.save with the correct data', async () => {
      const mediaMock: Media = createMediaMock();
      jest.spyOn(mediaRepository, 'save').mockResolvedValue(mediaMock);

      await service.addMediaToDB(mediaMock);
      expect(mediaRepository.save).toHaveBeenCalledWith(mediaMock);
    });
  });

  describe('findMediaByIdsInDB', () => {
    it('should call mediaRepository.find with the correct data', async () => {
      const ids = [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];
      const expectedValue = {
        where: {
          _id: {
            $in: [
              new ObjectId(ids[0]),
              new ObjectId(ids[1]),
              new ObjectId(ids[2]),
            ],
          },
        },
      };
      jest.spyOn(mediaRepository, 'find').mockResolvedValue([]);

      await service.findMediaByIdsInDB(ids);
      expect(mediaRepository.find).toHaveBeenCalledWith(expectedValue);
    });
  });

  describe('findMediaByIdsInDBTemp', () => {
    it('should call tempRepository.find with the correct data', async () => {
      const ids = [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];
      const expectedValue = {
        where: {
          _id: {
            $in: [
              new ObjectId(ids[0]),
              new ObjectId(ids[1]),
              new ObjectId(ids[2]),
            ],
          },
        },
      };
      jest.spyOn(tempRepository, 'find').mockResolvedValue([]);

      await service.findMediaByIdsInDBTemp(ids);
      expect(tempRepository.find).toHaveBeenCalledWith(expectedValue);
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

  describe('updateMediaList', () => {
    const initialMedia1Object = {
      id: new ObjectId('507f1f77bcf86cd799439011'),
      name: 'test1',
      originalNameWithoutExt: 'test1',
    };
    const initialMedia2Object = {
      id: new ObjectId('507f1f77bcf86cd799439012'),
      name: 'test2',
      originalNameWithoutExt: 'test2',
    };

    let media1 = new Media();
    let media2 = new Media();

    let mediaList: Media[] = [];

    let updatedMedia1 = new Media();
    let updatedMedia2 = new Media();

    beforeEach(() => {
      media1 = createMediaMock(initialMedia1Object);
      media2 = createMediaMock(initialMedia2Object);

      mediaList = [media1, media2];
      updatedMedia1 = media1;
      updatedMedia2 = media2;
    });

    afterEach(() => {
      media1 = new Media();
      media2 = new Media();

      mediaList = [];

      updatedMedia1 = new Media();
      updatedMedia2 = new Media();

      jest.clearAllMocks();
    });

    it('should update media list in media repository', async () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '507f1f77bcf86cd799439011',
            updatedFields: {
              description: 'new description',
            },
          },
          {
            id: '507f1f77bcf86cd799439012',
            updatedFields: {
              keywords: ['new keyword'],
            },
          },
        ],
      };

      updatedMedia1.description = 'new description';
      updatedMedia2.keywords = ['new keyword'];

      const expectedResult: UpdateMedia[] = [
        { oldMedia: media1, newMedia: updatedMedia1 },
        { oldMedia: media2, newMedia: updatedMedia2 },
      ];

      jest.spyOn(mediaRepository, 'find').mockResolvedValue(mediaList);

      const result = await service.updateMediaList(
        filesToUpload,
        DBType.DBMedia,
      );

      expect(result).toEqual(expectedResult);
      expect(mediaRepository.find).toHaveBeenCalledTimes(1);
      expect(mediaRepository.find).toHaveBeenCalledWith({
        where: {
          _id: {
            $in: [
              new ObjectId('507f1f77bcf86cd799439011'),
              new ObjectId('507f1f77bcf86cd799439012'),
            ],
          },
        },
      });
    });

    it('should update media list in temp repository', async () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '507f1f77bcf86cd799439011',
            updatedFields: {
              description: 'new description',
            },
          },
          {
            id: '507f1f77bcf86cd799439012',
            updatedFields: {
              keywords: ['new keyword'],
            },
          },
        ],
      };

      updatedMedia1.description = 'new description';
      updatedMedia2.keywords = ['new keyword'];

      const expectedResult: UpdateMedia[] = [
        { oldMedia: media1, newMedia: updatedMedia1 },
        { oldMedia: media2, newMedia: updatedMedia2 },
      ];

      jest.spyOn(tempRepository, 'find').mockResolvedValue(mediaList);

      const result = await service.updateMediaList(
        filesToUpload,
        DBType.DBTemp,
      );

      expect(result).toEqual(expectedResult);
      expect(tempRepository.find).toHaveBeenCalledTimes(1);
      expect(tempRepository.find).toHaveBeenCalledWith({
        where: {
          _id: {
            $in: [
              new ObjectId('507f1f77bcf86cd799439011'),
              new ObjectId('507f1f77bcf86cd799439012'),
            ],
          },
        },
      });
    });

    it('should throw an error if ids are not found in database', async () => {
      const filesToUpload: UpdatedFilesInputDto = {
        files: [
          {
            id: '507f1f77bcf86cd799439011',
            updatedFields: {
              description: 'new description',
            },
          },
          {
            id: '507f1f77bcf86cd799439012',
            updatedFields: {
              keywords: ['new keyword'],
            },
          },
        ],
      };

      jest.spyOn(mediaRepository, 'find').mockResolvedValue([]);

      await expect(
        service.updateMediaList(filesToUpload, DBType.DBMedia),
      ).rejects.toThrow(
        new NotFoundException(
          `Ids not found in database: 507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012`,
        ),
      );
    });
  });

  describe('removeMediaFromTempDB', () => {
    it('should remove media from temp repository', async () => {
      const idsToRemove = [
        new ObjectId('507f1f77bcf86cd799439011'),
        new ObjectId('507f1f77bcf86cd799439012'),
      ];

      jest
        .spyOn(tempRepository, 'delete')
        .mockResolvedValue({ raw: [], affected: 1 });

      await service.removeMediaFromTempDB(idsToRemove);

      expect(tempRepository.delete).toHaveBeenCalledWith(idsToRemove);
    });
  });
});
