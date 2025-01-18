import { Test, TestingModule } from '@nestjs/testing';
import { SyncPreviewsWSService } from './syncPreviewsWS.service';
import { MediaDBService, PreviewListEntity } from 'src/files/mediaDB.service';
import { DiscStorageService } from 'src/files/discStorage.service';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import { WSApiStatus } from './constants';
import { CustomLogger } from 'src/logger/logger.service';
import { BulkWriteResult } from 'typeorm';
import { ObjectId } from 'mongodb';

describe('SyncPreviewsWSService', () => {
  let service: SyncPreviewsWSService;
  let mediaDBService: MediaDBService;
  let discStorageService: DiscStorageService;
  let filesDataWSGateway: FilesDataWSGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncPreviewsWSService,
        {
          provide: MediaDBService,
          useValue: {
            findNotEmptyPreviewsInDB: jest.fn(),
            updateMediaInDB: jest.fn(),
          },
        },
        {
          provide: DiscStorageService,
          useValue: {
            getAllFilesOnDisk: jest.fn(),
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

    service = module.get<SyncPreviewsWSService>(SyncPreviewsWSService);
    mediaDBService = module.get<MediaDBService>(MediaDBService);
    discStorageService = module.get<DiscStorageService>(DiscStorageService);
    filesDataWSGateway = module.get<FilesDataWSGateway>(FilesDataWSGateway);
  });

  describe('startProcess', () => {
    it('should not start if the status is not READY', async () => {
      service['_status'] = WSApiStatus.BUSY;
      const sendProcessIsBusySpy = jest.spyOn(
        service as any,
        'sendProcessIsBusy',
      );

      await service.startProcess();

      expect(sendProcessIsBusySpy).toHaveBeenCalled();
    });

    it('should call necessary methods when starting the process', async () => {
      jest
        .spyOn(service as any, 'getTotalDBElementsWithPreview')
        .mockResolvedValueOnce([]);
      jest
        .spyOn(service as any, 'getTotalDiskPreviewFiles')
        .mockResolvedValueOnce([]);
      const calculateSpy = jest.spyOn(
        service as any,
        'calculateListOfNotFoundPreviewIds',
      );
      const removeSpy = jest.spyOn(
        service as any,
        'removeNotFoundPreviewsFromDB',
      );

      await service.startProcess();

      expect(service['getTotalDBElementsWithPreview']).toHaveBeenCalled();
      expect(service['getTotalDiskPreviewFiles']).toHaveBeenCalled();
      expect(calculateSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('getTotalDBElementsWithPreview', () => {
    it('should return a list of previews and update the status', async () => {
      const mockPreviews: PreviewListEntity[] = [
        {
          _id: '1',
          preview: 'path1',
          fullSizeJpg: 'path2',
        } as unknown as PreviewListEntity,
      ];
      jest
        .spyOn(mediaDBService, 'findNotEmptyPreviewsInDB')
        .mockResolvedValueOnce(mockPreviews);

      const result = await service['getTotalDBElementsWithPreview']();

      expect(result).toEqual(mockPreviews);
      expect(mediaDBService.findNotEmptyPreviewsInDB).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(mediaDBService, 'findNotEmptyPreviewsInDB')
        .mockRejectedValueOnce(new Error('DB Error'));

      const result = await service['getTotalDBElementsWithPreview']();

      expect(result).toEqual([]);
    });
  });

  describe('getTotalDiskPreviewFiles', () => {
    it('should return a normalized list of files', async () => {
      const mockFiles = ['file1', 'file2'];
      jest
        .spyOn(discStorageService, 'getAllFilesOnDisk')
        .mockResolvedValueOnce({ filesList: mockFiles, directoriesList: [] });

      const result = await service['getTotalDiskPreviewFiles']();

      expect(result).toEqual(mockFiles.map((f) => f.normalize()));
      expect(discStorageService.getAllFilesOnDisk).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(discStorageService, 'getAllFilesOnDisk')
        .mockRejectedValueOnce(new Error('Disk Error'));

      const result = await service['getTotalDiskPreviewFiles']();

      expect(result).toEqual([]);
    });
  });

  describe('calculateListOfNotFoundPreviewIds', () => {
    it('should calculate IDs of not found previews', () => {
      const previews: PreviewListEntity[] = [
        {
          _id: '1',
          preview: '/file1',
          fullSizeJpg: '/file1_large',
        } as unknown as PreviewListEntity,
        {
          _id: '2',
          preview: '/file2',
          fullSizeJpg: null,
        } as unknown as PreviewListEntity,
      ];
      const diskFiles = ['file1', 'file1_large', 'file2_large'].map((f) =>
        f.normalize(),
      );

      const result = service['calculateListOfNotFoundPreviewIds'](
        previews,
        diskFiles,
      );

      expect(result).toEqual(['2']);
    });
  });

  describe('removeNotFoundPreviewsFromDB', () => {
    it('should update the database with empty fields', async () => {
      jest
        .spyOn(mediaDBService, 'updateMediaInDB')
        .mockResolvedValueOnce({ modifiedCount: 2 } as BulkWriteResult);

      const id1 = new ObjectId('507f1f77bcf86cd799439011');
      const id2 = new ObjectId('507f1f77bcf86cd799439012');

      await service['removeNotFoundPreviewsFromDB']([id1, id2]);

      expect(mediaDBService.updateMediaInDB).toHaveBeenCalledWith([
        { _id: id1, preview: '', fullSizeJpg: null },
        { _id: id2, preview: '', fullSizeJpg: null },
      ]);
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(mediaDBService, 'updateMediaInDB')
        .mockRejectedValueOnce(new Error('Update Error'));

      const id1 = new ObjectId('507f1f77bcf86cd799439011');
      const id2 = new ObjectId('507f1f77bcf86cd799439012');

      await service['removeNotFoundPreviewsFromDB']([id1, id2]);

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
