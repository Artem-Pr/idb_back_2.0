import { Test, TestingModule } from '@nestjs/testing';
import { ExifKeysQueryService } from './exif-keys-query.service';
import { IExifKeysRepository } from '../repositories/exif-keys.repository';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import { success, failure } from '../types/result.type';
import { ObjectId } from 'mongodb';

describe('ExifKeysQueryService', () => {
  let service: ExifKeysQueryService;
  let mockRepository: jest.Mocked<IExifKeysRepository>;

  const mockExifKeys: ExifKeys[] = [
    {
      _id: new ObjectId(),
      name: 'Make',
      type: ExifValueType.STRING,
    },
    {
      _id: new ObjectId(),
      name: 'Model',
      type: ExifValueType.STRING,
    },
    {
      _id: new ObjectId(),
      name: 'ISO',
      type: ExifValueType.NUMBER,
    },
    {
      _id: new ObjectId(),
      name: 'Keywords',
      type: ExifValueType.STRING_ARRAY,
    },
  ];

  beforeEach(async () => {
    const mockRepositoryMethods = {
      findAll: jest.fn(),
      findByType: jest.fn(),
      findExistingKeyNames: jest.fn(),
      saveKeys: jest.fn(),
      findByNames: jest.fn(),
      clearAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExifKeysQueryService,
        {
          provide: 'IExifKeysRepository',
          useValue: mockRepositoryMethods,
        },
      ],
    }).compile();

    service = module.get<ExifKeysQueryService>(ExifKeysQueryService);
    mockRepository = module.get('IExifKeysRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllExifKeys', () => {
    it('should return all EXIF keys from repository', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue(mockExifKeys);

      // Act
      const result = await service.getAllExifKeys();

      // Assert
      expect(result).toEqual(mockExifKeys);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no keys found', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getAllExifKeys();

      // Assert
      expect(result).toEqual([]);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockRepository.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getAllExifKeys()).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getExifKeysByType', () => {
    it('should return EXIF keys filtered by type', async () => {
      // Arrange
      const stringKeys = mockExifKeys.filter(
        (key) => key.type === ExifValueType.STRING,
      );
      mockRepository.findByType.mockResolvedValue(stringKeys);

      // Act
      const result = await service.getExifKeysByType(ExifValueType.STRING);

      // Assert
      expect(result).toEqual(stringKeys);
      expect(result).toHaveLength(2);
      expect(mockRepository.findByType).toHaveBeenCalledWith(
        ExifValueType.STRING,
      );
      expect(mockRepository.findByType).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no keys found for type', async () => {
      // Arrange
      mockRepository.findByType.mockResolvedValue([]);

      // Act
      const result = await service.getExifKeysByType(
        ExifValueType.NOT_SUPPORTED,
      );

      // Assert
      expect(result).toEqual([]);
      expect(mockRepository.findByType).toHaveBeenCalledWith(
        ExifValueType.NOT_SUPPORTED,
      );
      expect(mockRepository.findByType).toHaveBeenCalledTimes(1);
    });

    it('should handle all ExifValueType enum values', async () => {
      // Arrange
      const testCases = [
        ExifValueType.STRING,
        ExifValueType.NUMBER,
        ExifValueType.STRING_ARRAY,
        ExifValueType.NOT_SUPPORTED,
      ];

      for (const type of testCases) {
        mockRepository.findByType.mockResolvedValue([]);

        // Act
        await service.getExifKeysByType(type);

        // Assert
        expect(mockRepository.findByType).toHaveBeenCalledWith(type);
      }

      expect(mockRepository.findByType).toHaveBeenCalledTimes(testCases.length);
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database query failed');
      mockRepository.findByType.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.getExifKeysByType(ExifValueType.STRING),
      ).rejects.toThrow('Database query failed');
      expect(mockRepository.findByType).toHaveBeenCalledTimes(1);
    });
  });

  describe('getExifKeysByNames', () => {
    it('should return EXIF keys filtered by names', async () => {
      // Arrange
      const names = ['Make', 'Model'];
      const filteredKeys = mockExifKeys.filter((key) =>
        names.includes(key.name),
      );
      mockRepository.findByNames.mockResolvedValue(filteredKeys);

      // Act
      const result = await service.getExifKeysByNames(names);

      // Assert
      expect(result).toEqual(filteredKeys);
      expect(result).toHaveLength(2);
      expect(mockRepository.findByNames).toHaveBeenCalledWith(names);
      expect(mockRepository.findByNames).toHaveBeenCalledTimes(1);
    });

    it('should handle empty names array', async () => {
      // Arrange
      mockRepository.findByNames.mockResolvedValue([]);

      // Act
      const result = await service.getExifKeysByNames([]);

      // Assert
      expect(result).toEqual([]);
      expect(mockRepository.findByNames).toHaveBeenCalledWith([]);
      expect(mockRepository.findByNames).toHaveBeenCalledTimes(1);
    });

    it('should handle single name', async () => {
      // Arrange
      const names = ['Make'];
      const filteredKeys = [mockExifKeys[0]];
      mockRepository.findByNames.mockResolvedValue(filteredKeys);

      // Act
      const result = await service.getExifKeysByNames(names);

      // Assert
      expect(result).toEqual(filteredKeys);
      expect(result).toHaveLength(1);
      expect(mockRepository.findByNames).toHaveBeenCalledWith(names);
    });

    it('should handle non-existent names', async () => {
      // Arrange
      const names = ['NonExistent1', 'NonExistent2'];
      mockRepository.findByNames.mockResolvedValue([]);

      // Act
      const result = await service.getExifKeysByNames(names);

      // Assert
      expect(result).toEqual([]);
      expect(mockRepository.findByNames).toHaveBeenCalledWith(names);
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database query failed');
      mockRepository.findByNames.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.getExifKeysByNames(['Make', 'Model']),
      ).rejects.toThrow('Database query failed');
      expect(mockRepository.findByNames).toHaveBeenCalledTimes(1);
    });
  });

  describe('getExistingKeyNames', () => {
    it('should return set of existing key names', async () => {
      // Arrange
      const existingNames = new Set(['Make', 'Model', 'ISO']);
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(existingNames),
      );

      // Act
      const result = await service.getExistingKeyNames();

      // Assert
      expect(result).toEqual(existingNames);
      expect(mockRepository.findExistingKeyNames).toHaveBeenCalledTimes(1);
    });

    it('should return empty set if no keys exist', async () => {
      // Arrange
      const emptySet = new Set<string>();
      mockRepository.findExistingKeyNames.mockResolvedValue(success(emptySet));

      // Act
      const result = await service.getExistingKeyNames();

      // Assert
      expect(result).toEqual(emptySet);
      expect(result.size).toBe(0);
      expect(mockRepository.findExistingKeyNames).toHaveBeenCalledTimes(1);
    });

    it('should throw error when repository returns failure', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockRepository.findExistingKeyNames.mockResolvedValue(failure(error));

      // Act & Assert
      await expect(service.getExistingKeyNames()).rejects.toThrow(
        'Failed to get existing key names: Database connection failed',
      );
      expect(mockRepository.findExistingKeyNames).toHaveBeenCalledTimes(1);
    });

    it('should handle repository rejection', async () => {
      // Arrange
      const error = new Error('Repository method failed');
      mockRepository.findExistingKeyNames.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getExistingKeyNames()).rejects.toThrow(
        'Repository method failed',
      );
      expect(mockRepository.findExistingKeyNames).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should work with realistic data flow', async () => {
      // Arrange
      const allKeys = mockExifKeys;
      const stringKeys = mockExifKeys.filter(
        (key) => key.type === ExifValueType.STRING,
      );
      const specificKeys = [mockExifKeys[0], mockExifKeys[1]];
      const existingNames = new Set(['Make', 'Model', 'ISO', 'Keywords']);

      mockRepository.findAll.mockResolvedValue(allKeys);
      mockRepository.findByType.mockResolvedValue(stringKeys);
      mockRepository.findByNames.mockResolvedValue(specificKeys);
      mockRepository.findExistingKeyNames.mockResolvedValue(
        success(existingNames),
      );

      // Act
      const allResult = await service.getAllExifKeys();
      const stringResult = await service.getExifKeysByType(
        ExifValueType.STRING,
      );
      const specificResult = await service.getExifKeysByNames([
        'Make',
        'Model',
      ]);
      const namesResult = await service.getExistingKeyNames();

      // Assert
      expect(allResult).toHaveLength(4);
      expect(stringResult).toHaveLength(2);
      expect(specificResult).toHaveLength(2);
      expect(namesResult.size).toBe(4);
      expect(namesResult.has('Make')).toBe(true);
      expect(namesResult.has('Model')).toBe(true);
      expect(namesResult.has('ISO')).toBe(true);
      expect(namesResult.has('Keywords')).toBe(true);
    });
  });
});
