import { Test, TestingModule } from '@nestjs/testing';
import { UpdateExifWSService } from './updateExifWS.service';
import { MediaDBService } from 'src/files/mediaDB.service';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import { WSApiStatus } from './constants';
import { CustomLogger } from 'src/logger/logger.service';
import { Media } from 'src/files/entities/media.entity';
import { BulkWriteResult } from 'typeorm';
import { exifDataMock } from 'src/files/__mocks__/mocks';
import { ExifData, GetExifJob } from 'src/jobs/exif.processor';
import type { Job, Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { MainDir, Processors } from 'src/common/constants';

const mockExifFileName = 'test.jpg';
const exifJobResult: ExifData = {
  [mockExifFileName]: exifDataMock,
};

const mockExifJob = {
  finished: jest.fn().mockResolvedValue(exifJobResult),
} as Partial<Job<GetExifJob>> as Job<GetExifJob>;

describe('UpdateExifWSService', () => {
  let service: UpdateExifWSService;
  let exifQueue: Queue<GetExifJob>;
  let mediaDBService: MediaDBService;
  let filesDataWSGateway: FilesDataWSGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateExifWSService,
        {
          provide: getQueueToken(Processors.exifProcessor),
          useValue: { add: jest.fn(() => mockExifJob), obliterate: jest.fn() },
        },
        {
          provide: MediaDBService,
          useValue: {
            findFilePathsForMediaInFolder: jest.fn(),
            updateMediaInDB: jest.fn(),
          },
        },
        {
          provide: FilesDataWSGateway,
          useValue: {
            send: jest.fn(),
          },
        },
        CustomLogger,
      ],
    }).compile();

    service = module.get<UpdateExifWSService>(UpdateExifWSService);
    mediaDBService = module.get<MediaDBService>(MediaDBService);
    filesDataWSGateway = module.get<FilesDataWSGateway>(FilesDataWSGateway);
    exifQueue = module.get<Queue<GetExifJob>>(
      getQueueToken(Processors.exifProcessor),
    );
  });

  describe('stopProcess', () => {
    it('should stop the process', async () => {
      await service.stopProcess();

      expect(exifQueue.obliterate).toHaveBeenCalled();
    });
  });

  describe('startProcess', () => {
    it('should not start if the status is not READY', async () => {
      service['_status'] = WSApiStatus.BUSY;
      const sendProcessIsBusySpy = jest.spyOn(
        service as any,
        'sendProcessIsBusy',
      );

      await service.startProcess({ folderPath: '', mimeTypes: [] });

      expect(sendProcessIsBusySpy).toHaveBeenCalled();
    });

    it('should call necessary methods when starting the process', async () => {
      jest
        .spyOn(service as any, 'getFilePathListToUpdate')
        .mockResolvedValueOnce([]);
      jest.spyOn(service as any, 'getExifList').mockResolvedValueOnce([]);
      const updateMediaFilesInDBSpy = jest.spyOn(
        service as any,
        'updateMediaFilesInDB',
      );

      await service.startProcess({ folderPath: '', mimeTypes: [] });

      expect(service['getFilePathListToUpdate']).toHaveBeenCalled();
      expect(service['getExifList']).toHaveBeenCalled();
      expect(updateMediaFilesInDBSpy).toHaveBeenCalled();
    });
  });

  describe('getFilePathListToUpdate', () => {
    it('should return a list of objects and update the status', async () => {
      const mockMediaFiles: Pick<Media, '_id' | 'filePath'>[] = [
        { _id: '1', filePath: mockExifFileName } as unknown as Pick<
          Media,
          '_id' | 'filePath'
        >,
      ];
      jest
        .spyOn(mediaDBService, 'findFilePathsForMediaInFolder')
        .mockResolvedValueOnce(mockMediaFiles);

      const result = await service['getFilePathListToUpdate']({
        folderPath: '',
        mimeTypes: [],
      });

      expect(result).toEqual(mockMediaFiles);
      expect(mediaDBService.findFilePathsForMediaInFolder).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(mediaDBService, 'findFilePathsForMediaInFolder')
        .mockRejectedValueOnce(new Error('DB Error'));

      const result = await service['getFilePathListToUpdate']({
        folderPath: '',
        mimeTypes: [],
      });

      expect(result).toEqual([]);
    });
  });

  describe('getExifList', () => {
    it('should return a list of objects with exif', async () => {
      const mockMediaFiles: Pick<Media, '_id' | 'filePath'>[] = [
        { _id: '1', filePath: mockExifFileName } as unknown as Pick<
          Media,
          '_id' | 'filePath'
        >,
      ];

      const result = await service['getExifList'](mockMediaFiles);

      expect(result).toEqual([
        {
          _id: mockMediaFiles[0]._id,
          exif: exifJobResult[mockExifFileName],
        },
      ]);
      expect(exifQueue.add).toHaveBeenCalledWith({
        filePaths: [mockMediaFiles[0].filePath],
        mainDir: MainDir.volumes,
      });
      expect(mockExifJob.finished).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockMediaFiles: Media[] = [
        { _id: '1', filePath: 'path1' } as unknown as Media,
      ];
      jest
        .spyOn(mockExifJob, 'finished')
        .mockRejectedValueOnce(new Error('Unknown Error'));

      const result = await service['getExifList'](mockMediaFiles);

      expect(result).toEqual([]);
    });

    it('should return an empty array if there are no media files', async () => {
      const result = await service['getExifList']([]);

      expect(result).toEqual([]);
    });
  });

  describe('updateMediaFilesInDB', () => {
    it('should update the database with new previews', async () => {
      jest
        .spyOn(mediaDBService, 'updateMediaInDB')
        .mockResolvedValueOnce({ modifiedCount: 2 } as BulkWriteResult);

      const mockMediaFiles: Media[] = [
        { _id: '1', filePath: 'path1' } as unknown as Media,
      ];

      await service['updateMediaFilesInDB'](mockMediaFiles);

      expect(mediaDBService.updateMediaInDB).toHaveBeenCalledWith(
        mockMediaFiles,
      );
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(mediaDBService, 'updateMediaInDB')
        .mockRejectedValueOnce(new Error('Update Error'));

      const mockMediaFiles: Media[] = [
        { _id: '1', filePath: 'path1' } as unknown as Media,
      ];

      await service['updateMediaFilesInDB'](mockMediaFiles);

      expect(mediaDBService.updateMediaInDB).toHaveBeenCalled();
    });
  });

  describe('sendEvent', () => {
    it('should send an event via the gateway', () => {
      const mockEvent = { status: WSApiStatus.READY, message: 'Test Event' };

      service['sendEvent'](mockEvent);

      expect(filesDataWSGateway.send).toHaveBeenCalled();
    });
  });
});
