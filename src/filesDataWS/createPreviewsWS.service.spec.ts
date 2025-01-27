import { Test, TestingModule } from '@nestjs/testing';
import { CreatePreviewsWSService } from './createPreviewsWS.service';
import { MediaDBService } from 'src/files/mediaDB.service';
import { FilesService } from 'src/files/files.service';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import { WSApiStatus } from './constants';
import { CustomLogger } from 'src/logger/logger.service';
import { Media } from 'src/files/entities/media.entity';
import { BulkWriteResult } from 'typeorm';

describe('CreatePreviewsWSService', () => {
  let service: CreatePreviewsWSService;
  let mediaDBService: MediaDBService;
  let filesService: FilesService;
  let filesDataWSGateway: FilesDataWSGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePreviewsWSService,
        {
          provide: MediaDBService,
          useValue: {
            findEmptyPreviewsInDB: jest.fn(),
            replaceMediaInDB: jest.fn(),
          },
        },
        {
          provide: FilesService,
          useValue: {
            updatePreviews: jest.fn(),
            stopAllPreviewJobs: jest.fn(),
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

    service = module.get<CreatePreviewsWSService>(CreatePreviewsWSService);
    mediaDBService = module.get<MediaDBService>(MediaDBService);
    filesService = module.get<FilesService>(FilesService);
    filesDataWSGateway = module.get<FilesDataWSGateway>(FilesDataWSGateway);
  });

  describe('stopProcess', () => {
    it('should stop the process', async () => {
      const stopAllPreviewJobsSpy = jest.spyOn(
        filesService,
        'stopAllPreviewJobs',
      );

      await service.stopProcess();

      expect(stopAllPreviewJobsSpy).toHaveBeenCalled();
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
        .spyOn(service as any, 'getMediaFilesToUpdate')
        .mockResolvedValueOnce([]);
      jest.spyOn(service as any, 'createPreviews').mockResolvedValueOnce([]);
      const updateMediaFilesInDBSpy = jest.spyOn(
        service as any,
        'updateMediaFilesInDB',
      );

      await service.startProcess({ folderPath: '', mimeTypes: [] });

      expect(service['getMediaFilesToUpdate']).toHaveBeenCalled();
      expect(service['createPreviews']).toHaveBeenCalled();
      expect(updateMediaFilesInDBSpy).toHaveBeenCalled();
    });
  });

  describe('getMediaFilesToUpdate', () => {
    it('should return a list of media files and update the status', async () => {
      const mockMediaFiles: Media[] = [
        { _id: '1', filePath: 'path1' } as unknown as Media,
      ];
      jest
        .spyOn(mediaDBService, 'findEmptyPreviewsInDB')
        .mockResolvedValueOnce(mockMediaFiles);

      const result = await service['getMediaFilesToUpdate']({
        folderPath: '',
        mimeTypes: [],
      });

      expect(result).toEqual(mockMediaFiles);
      expect(mediaDBService.findEmptyPreviewsInDB).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(mediaDBService, 'findEmptyPreviewsInDB')
        .mockRejectedValueOnce(new Error('DB Error'));

      const result = await service['getMediaFilesToUpdate']({
        folderPath: '',
        mimeTypes: [],
      });

      expect(result).toEqual([]);
    });
  });

  describe('createPreviews', () => {
    it('should create previews for media files', async () => {
      const mockMediaFiles: Media[] = [
        { _id: '1', filePath: 'path1' } as unknown as Media,
      ];
      jest
        .spyOn(filesService, 'updatePreviews')
        .mockResolvedValueOnce(mockMediaFiles[0]);

      const result = await service['createPreviews'](mockMediaFiles);

      expect(result).toEqual(mockMediaFiles);
      expect(filesService.updatePreviews).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockMediaFiles: Media[] = [
        { _id: '1', filePath: 'path1' } as unknown as Media,
      ];
      jest
        .spyOn(filesService, 'updatePreviews')
        .mockRejectedValueOnce(new Error('Update Error'));

      const result = await service['createPreviews'](mockMediaFiles);

      expect(result).toEqual([]);
    });

    it('should return an empty array if there are no media files', async () => {
      const result = await service['createPreviews']([]);

      expect(result).toEqual([]);
    });
  });

  describe('updateMediaFilesInDB', () => {
    it('should update the database with new previews', async () => {
      jest
        .spyOn(mediaDBService, 'replaceMediaInDB')
        .mockResolvedValueOnce({ modifiedCount: 2 } as BulkWriteResult);

      const mockMediaFiles: Media[] = [
        { _id: '1', filePath: 'path1' } as unknown as Media,
      ];

      await service['updateMediaFilesInDB'](mockMediaFiles);

      expect(mediaDBService.replaceMediaInDB).toHaveBeenCalledWith(
        mockMediaFiles,
      );
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(mediaDBService, 'replaceMediaInDB')
        .mockRejectedValueOnce(new Error('Update Error'));

      const mockMediaFiles: Media[] = [
        { _id: '1', filePath: 'path1' } as unknown as Media,
      ];

      await service['updateMediaFilesInDB'](mockMediaFiles);

      expect(mediaDBService.replaceMediaInDB).toHaveBeenCalled();
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
