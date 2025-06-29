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
      typeConflicts: null,
    },
    {
      _id: new ObjectId(),
      name: 'Model',
      type: ExifValueType.STRING,
      typeConflicts: null,
    },
    {
      _id: new ObjectId(),
      name: 'ISO',
      type: ExifValueType.NUMBER,
      typeConflicts: null,
    },
    {
      _id: new ObjectId(),
      name: 'Keywords',
      type: ExifValueType.STRING_ARRAY,
      typeConflicts: null,
    },
  ];

  beforeEach(async () => {
    const mockExifKeysRepository = {
      findAll: jest.fn(),
      findByType: jest.fn(),
      findByNames: jest.fn(),
      findExistingKeys: jest.fn(),
      saveKeys: jest.fn(),
      clearAll: jest.fn(),
      findPaginated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExifKeysQueryService,
        {
          provide: 'IExifKeysRepository',
          useValue: mockExifKeysRepository,
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
      const mockMap = new Map<string, ExifKeys>();
      mockMap.set('Make', mockExifKeys[0]);
      mockMap.set('Model', mockExifKeys[1]);
      mockMap.set('ISO', mockExifKeys[2]);

      mockRepository.findExistingKeys.mockResolvedValue(success(mockMap));

      // Act
      const result = await service.getExistingKeyNames();

      // Assert
      expect(result).toEqual(existingNames);
      expect(mockRepository.findExistingKeys).toHaveBeenCalledTimes(1);
    });

    it('should return empty set if no keys exist', async () => {
      // Arrange
      const emptySet = new Set<string>();
      mockRepository.findExistingKeys.mockResolvedValue(
        success(new Map<string, ExifKeys>()),
      );

      // Act
      const result = await service.getExistingKeyNames();

      // Assert
      expect(result).toEqual(emptySet);
      expect(result.size).toBe(0);
      expect(mockRepository.findExistingKeys).toHaveBeenCalledTimes(1);
    });

    it('should throw error when repository returns failure', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockRepository.findExistingKeys.mockResolvedValue(failure(error));

      // Act & Assert
      await expect(service.getExistingKeyNames()).rejects.toThrow(
        'Failed to get existing key names: Database connection failed',
      );
      expect(mockRepository.findExistingKeys).toHaveBeenCalledTimes(1);
    });

    it('should handle repository rejection', async () => {
      // Arrange
      const error = new Error('Repository method failed');
      mockRepository.findExistingKeys.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getExistingKeyNames()).rejects.toThrow(
        'Repository method failed',
      );
      expect(mockRepository.findExistingKeys).toHaveBeenCalledTimes(1);
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

      mockRepository.findAll.mockResolvedValue(allKeys);
      mockRepository.findByType.mockResolvedValue(stringKeys);
      mockRepository.findByNames.mockResolvedValue(specificKeys);
      const mockMap = new Map<string, ExifKeys>();
      mockExifKeys.forEach((key) => mockMap.set(key.name, key));

      mockRepository.findExistingKeys.mockResolvedValue(success(mockMap));

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

  describe('getExifKeysPaginated', () => {
    it('should return paginated EXIF keys with default parameters', async () => {
      const mockExifKeys = [
        {
          _id: 'id1' as any,
          name: 'Aperture',
          type: ExifValueType.NUMBER,
          typeConflicts: null,
        },
        {
          _id: 'id2' as any,
          name: 'Camera',
          type: ExifValueType.STRING,
          typeConflicts: null,
        },
      ];

      const mockResult = success({
        items: mockExifKeys,
        totalCount: 10,
        page: 1,
        perPage: 50,
        totalPages: 1,
      });

      mockRepository.findPaginated.mockResolvedValue(mockResult);

      const result = await service.getExifKeysPaginated({});

      expect(result).toEqual({
        exifKeys: mockExifKeys,
        page: 1,
        perPage: 50,
        resultsCount: 10,
        totalPages: 1,
      });

      expect(mockRepository.findPaginated).toHaveBeenCalledWith({
        page: 1,
        perPage: 50,
        type: undefined,
        searchTerm: undefined,
      });
    });

    it('should return paginated EXIF keys with custom parameters', async () => {
      const mockExifKeys = [
        {
          _id: 'id1' as any,
          name: 'ISO',
          type: ExifValueType.NUMBER,
          typeConflicts: null,
        },
      ];

      const mockResult = success({
        items: mockExifKeys,
        totalCount: 100,
        page: 2,
        perPage: 10,
        totalPages: 10,
      });

      mockRepository.findPaginated.mockResolvedValue(mockResult);

      const result = await service.getExifKeysPaginated({
        page: 2,
        perPage: 10,
        type: ExifValueType.NUMBER,
      });

      expect(result).toEqual({
        exifKeys: mockExifKeys,
        page: 2,
        perPage: 10,
        resultsCount: 100,
        totalPages: 10,
      });

      expect(mockRepository.findPaginated).toHaveBeenCalledWith({
        page: 2,
        perPage: 10,
        type: ExifValueType.NUMBER,
        searchTerm: undefined,
      });
    });

    it('should throw error when repository fails', async () => {
      const mockError = new Error('Database error');
      const mockResult = failure(mockError);

      mockRepository.findPaginated.mockResolvedValue(mockResult);

      await expect(service.getExifKeysPaginated({})).rejects.toThrow(
        'Failed to get paginated EXIF keys: Database error',
      );
    });

    it('should handle empty results', async () => {
      const mockResult = success({
        items: [],
        totalCount: 0,
        page: 1,
        perPage: 50,
        totalPages: 0,
      });

      mockRepository.findPaginated.mockResolvedValue(mockResult);

      const result = await service.getExifKeysPaginated({});

      expect(result).toEqual({
        exifKeys: [],
        page: 1,
        perPage: 50,
        resultsCount: 0,
        totalPages: 0,
      });
    });

    it('should pass searchTerm to repository', async () => {
      const mockExifKeys = [
        {
          _id: 'id1' as any,
          name: 'CameraModel',
          type: ExifValueType.STRING,
          typeConflicts: null,
        },
      ];

      const mockResult = success({
        items: mockExifKeys,
        totalCount: 1,
        page: 1,
        perPage: 50,
        totalPages: 1,
      });

      mockRepository.findPaginated.mockResolvedValue(mockResult);

      const result = await service.getExifKeysPaginated({
        searchTerm: 'camera',
      });

      expect(result).toEqual({
        exifKeys: mockExifKeys,
        page: 1,
        perPage: 50,
        resultsCount: 1,
        totalPages: 1,
      });

      expect(mockRepository.findPaginated).toHaveBeenCalledWith({
        page: 1,
        perPage: 50,
        type: undefined,
        searchTerm: 'camera',
      });
    });

    it('should pass both type and searchTerm to repository', async () => {
      const mockExifKeys = [
        {
          _id: 'id1' as any,
          name: 'Aperture',
          type: ExifValueType.NUMBER,
          typeConflicts: null,
        },
      ];

      const mockResult = success({
        items: mockExifKeys,
        totalCount: 1,
        page: 1,
        perPage: 10,
        totalPages: 1,
      });

      mockRepository.findPaginated.mockResolvedValue(mockResult);

      const result = await service.getExifKeysPaginated({
        type: ExifValueType.NUMBER,
        searchTerm: 'aper',
        page: 1,
        perPage: 10,
      });

      expect(result).toEqual({
        exifKeys: mockExifKeys,
        page: 1,
        perPage: 10,
        resultsCount: 1,
        totalPages: 1,
      });

      expect(mockRepository.findPaginated).toHaveBeenCalledWith({
        page: 1,
        perPage: 10,
        type: ExifValueType.NUMBER,
        searchTerm: 'aper',
      });
    });
  });
});
