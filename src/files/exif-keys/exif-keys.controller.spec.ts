import { Test, TestingModule } from '@nestjs/testing';
import { ExifKeysController } from './exif-keys.controller';
import { ExifKeysService } from './exif-keys.service';
import { ExifKeys, ExifValueType } from './entities/exif-keys.entity';
import { ObjectId } from 'mongodb';

describe('ExifKeysController', () => {
  let controller: ExifKeysController;
  let service: ExifKeysService;

  const mockExifKeys: ExifKeys[] = [
    {
      _id: new ObjectId(),
      name: 'Make',
      type: ExifValueType.STRING,
    },
    {
      _id: new ObjectId(),
      name: 'DateTimeOriginal',
      type: ExifValueType.STRING,
    },
    {
      _id: new ObjectId(),
      name: 'ISO',
      type: ExifValueType.NUMBER,
    },
  ];

  const mockExifKeysService = {
    getAllExifKeys: jest.fn().mockResolvedValue(mockExifKeys),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExifKeysController],
      providers: [
        {
          provide: ExifKeysService,
          useValue: mockExifKeysService,
        },
      ],
    }).compile();

    controller = module.get<ExifKeysController>(ExifKeysController);
    service = module.get<ExifKeysService>(ExifKeysService);

    // Reset mock calls between tests
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllExifKeys', () => {
    it('should return an array of exif keys', async () => {
      const result = await controller.getAllExifKeys();

      expect(result).toEqual(mockExifKeys);
      expect(service.getAllExifKeys).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no exif keys exist', async () => {
      mockExifKeysService.getAllExifKeys.mockResolvedValueOnce([]);

      const result = await controller.getAllExifKeys();

      expect(result).toEqual([]);
      expect(service.getAllExifKeys).toHaveBeenCalledTimes(1);
    });
  });
});
