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
});
