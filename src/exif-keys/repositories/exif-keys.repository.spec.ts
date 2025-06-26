import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ExifKeysRepository } from './exif-keys.repository';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import { EXIF_KEYS_CONSTANTS } from '../constants/exif-keys.constants';

describe('ExifKeysRepository', () => {
  let repository: ExifKeysRepository;
  let mongoRepository: jest.Mocked<MongoRepository<ExifKeys>>;

  const mockExifKey: ExifKeys = {
    _id: 'test-id' as any,
    name: 'testKey',
    type: ExifValueType.STRING,
  };

  beforeEach(async () => {
    const mockMongoRepository = {
      find: jest.fn(),
      save: jest.fn(),
      aggregate: jest.fn(),
      clear: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExifKeysRepository,
        {
          provide: getRepositoryToken(ExifKeys),
          useValue: mockMongoRepository,
        },
      ],
    }).compile();

    repository = module.get<ExifKeysRepository>(ExifKeysRepository);
    mongoRepository = module.get(getRepositoryToken(ExifKeys));
  });

  describe('findAll', () => {
    it('should return all EXIF keys', async () => {
      const expectedKeys = [mockExifKey];
      mongoRepository.find.mockResolvedValue(expectedKeys);

      const result = await repository.findAll();

      expect(mongoRepository.find).toHaveBeenCalledWith();
      expect(result).toEqual(expectedKeys);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated results with default parameters', async () => {
      const mockExifKeys = [
        { _id: 'id1' as any, name: 'Aperture', type: ExifValueType.NUMBER },
        { _id: 'id2' as any, name: 'Camera', type: ExifValueType.STRING },
      ];

      const mockAggregationResult = [
        {
          items: mockExifKeys,
          totalCount: [{ count: 10 }],
        },
      ];

      mongoRepository.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggregationResult),
      } as any);

      const result = await repository.findPaginated({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          items: mockExifKeys,
          totalCount: 10,
          page: 1,
          perPage: 50,
          totalPages: 1,
        });
      }

      expect(mongoRepository.aggregate).toHaveBeenCalledWith([
        {
          $facet: {
            items: [{ $sort: { name: 1 } }, { $skip: 0 }, { $limit: 50 }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });

    it('should return paginated results with custom pagination', async () => {
      const mockExifKeys = [
        { _id: 'id1' as any, name: 'ISO', type: ExifValueType.NUMBER },
      ];

      const mockAggregationResult = [
        {
          items: mockExifKeys,
          totalCount: [{ count: 100 }],
        },
      ];

      mongoRepository.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggregationResult),
      } as any);

      const result = await repository.findPaginated({
        page: 2,
        perPage: 10,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          items: mockExifKeys,
          totalCount: 100,
          page: 2,
          perPage: 10,
          totalPages: 10,
        });
      }

      expect(mongoRepository.aggregate).toHaveBeenCalledWith([
        {
          $facet: {
            items: [{ $sort: { name: 1 } }, { $skip: 10 }, { $limit: 10 }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });

    it('should filter by type', async () => {
      const mockExifKeys = [
        { _id: 'id1' as any, name: 'Aperture', type: ExifValueType.NUMBER },
      ];

      const mockAggregationResult = [
        {
          items: mockExifKeys,
          totalCount: [{ count: 5 }],
        },
      ];

      mongoRepository.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggregationResult),
      } as any);

      const result = await repository.findPaginated({
        type: ExifValueType.NUMBER,
      });

      expect(result.success).toBe(true);
      expect(mongoRepository.aggregate).toHaveBeenCalledWith([
        { $match: { type: ExifValueType.NUMBER } },
        {
          $facet: {
            items: [{ $sort: { name: 1 } }, { $skip: 0 }, { $limit: 50 }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });

    it('should filter by searchTerm with case-insensitive regex', async () => {
      const mockExifKeys = [
        { _id: 'id1' as any, name: 'CameraModel', type: ExifValueType.STRING },
      ];

      const mockAggregationResult = [
        {
          items: mockExifKeys,
          totalCount: [{ count: 1 }],
        },
      ];

      mongoRepository.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggregationResult),
      } as any);

      const result = await repository.findPaginated({
        searchTerm: 'camera',
      });

      expect(result.success).toBe(true);
      expect(mongoRepository.aggregate).toHaveBeenCalledWith([
        { $match: { name: { $regex: 'camera', $options: 'i' } } },
        {
          $facet: {
            items: [{ $sort: { name: 1 } }, { $skip: 0 }, { $limit: 50 }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });

    it('should filter by both type and searchTerm', async () => {
      const mockExifKeys = [
        { _id: 'id1' as any, name: 'Aperture', type: ExifValueType.NUMBER },
      ];

      const mockAggregationResult = [
        {
          items: mockExifKeys,
          totalCount: [{ count: 1 }],
        },
      ];

      mongoRepository.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggregationResult),
      } as any);

      const result = await repository.findPaginated({
        type: ExifValueType.NUMBER,
        searchTerm: 'aper',
      });

      expect(result.success).toBe(true);
      expect(mongoRepository.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            type: ExifValueType.NUMBER,
            name: { $regex: 'aper', $options: 'i' },
          },
        },
        {
          $facet: {
            items: [{ $sort: { name: 1 } }, { $skip: 0 }, { $limit: 50 }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });

    it('should handle errors and return failure result', async () => {
      const error = new Error('Database error');
      mongoRepository.aggregate.mockReturnValue({
        toArray: jest.fn().mockRejectedValue(error),
      } as any);

      const result = await repository.findPaginated({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });

    it('should calculate total pages correctly', async () => {
      const mockAggregationResult = [
        {
          items: [],
          totalCount: [{ count: 47 }],
        },
      ];

      mongoRepository.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggregationResult),
      } as any);

      const result = await repository.findPaginated({
        perPage: 10,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalPages).toBe(5); // Math.ceil(47/10) = 5
      }
    });

    it('should handle empty aggregation result', async () => {
      mongoRepository.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await repository.findPaginated({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          items: [],
          totalCount: 0,
          page: 1,
          perPage: 50,
          totalPages: 0,
        });
      }
    });
  });

  describe('findByType', () => {
    it('should return EXIF keys filtered by type', async () => {
      const expectedKeys = [mockExifKey];
      mongoRepository.find.mockResolvedValue(expectedKeys);

      const result = await repository.findByType(ExifValueType.STRING);

      expect(mongoRepository.find).toHaveBeenCalledWith({
        where: { type: ExifValueType.STRING },
      });
      expect(result).toEqual(expectedKeys);
    });
  });

  describe('findExistingKeyNames', () => {
    it('should return success result with key names set', async () => {
      const mockKeys = [{ name: 'key1' }, { name: 'key2' }] as ExifKeys[];
      mongoRepository.find.mockResolvedValue(mockKeys);

      const result = await repository.findExistingKeyNames();

      expect(mongoRepository.find).toHaveBeenCalledWith({
        select: EXIF_KEYS_CONSTANTS.DATABASE.SELECT_FIELDS,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(new Set(['key1', 'key2']));
      }
    });

    it('should return failure result on database error', async () => {
      const error = new Error('Database error');
      mongoRepository.find.mockRejectedValue(error);

      const result = await repository.findExistingKeyNames();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(error);
      }
    });
  });

  describe('saveKeys', () => {
    it('should return success result with saved keys', async () => {
      const keysToSave = [mockExifKey];
      const savedKeys = [mockExifKey];
      mongoRepository.save.mockResolvedValue(savedKeys as any);

      const result = await repository.saveKeys(keysToSave);

      expect(mongoRepository.save).toHaveBeenCalledWith(keysToSave);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(savedKeys);
      }
    });

    it('should return failure result on database error', async () => {
      const keysToSave = [mockExifKey];
      const error = new Error('Save error');
      mongoRepository.save.mockRejectedValue(error);

      const result = await repository.saveKeys(keysToSave);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(error);
      }
    });
  });

  describe('findByNames', () => {
    it('should return keys matching the provided names', async () => {
      const names = ['key1', 'key2'];
      const expectedKeys = [mockExifKey];
      mongoRepository.find.mockResolvedValue(expectedKeys);

      const result = await repository.findByNames(names);

      expect(mongoRepository.find).toHaveBeenCalledWith({
        where: {
          name: { $in: names },
        },
      });
      expect(result).toEqual(expectedKeys);
    });

    it('should return empty array for empty names array', async () => {
      const result = await repository.findByNames([]);

      expect(mongoRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('should clear all keys and return success', async () => {
      mongoRepository.clear.mockResolvedValue();

      const result = await repository.clearAll();

      expect(mongoRepository.clear).toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it('should handle "ns not found" error as success', async () => {
      const error = new Error('ns not found');
      mongoRepository.clear.mockRejectedValue(error);

      const result = await repository.clearAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it('should return failure for other errors', async () => {
      const error = new Error('Other database error');
      mongoRepository.clear.mockRejectedValue(error);

      const result = await repository.clearAll();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });
});
