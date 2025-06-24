import { Test, TestingModule } from '@nestjs/testing';
import { ExifKeysFactory } from './exif-keys.factory';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';

describe('ExifKeysFactory', () => {
  let factory: ExifKeysFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExifKeysFactory],
    }).compile();

    factory = module.get<ExifKeysFactory>(ExifKeysFactory);
  });

  describe('createExifKey', () => {
    it('should create an ExifKey with the provided name and type', () => {
      const name = 'testKey';
      const type = ExifValueType.STRING;

      const result = factory.createExifKey(name, type);

      expect(result).toBeInstanceOf(ExifKeys);
      expect(result.name).toBe(name);
      expect(result.type).toBe(type);
      expect(result._id).toBeUndefined(); // MongoDB will assign this
    });

    it('should create ExifKey with NUMBER type', () => {
      const name = 'numericKey';
      const type = ExifValueType.NUMBER;

      const result = factory.createExifKey(name, type);

      expect(result.name).toBe(name);
      expect(result.type).toBe(type);
    });

    it('should create ExifKey with STRING_ARRAY type', () => {
      const name = 'arrayKey';
      const type = ExifValueType.STRING_ARRAY;

      const result = factory.createExifKey(name, type);

      expect(result.name).toBe(name);
      expect(result.type).toBe(type);
    });

    it('should create ExifKey with NOT_SUPPORTED type', () => {
      const name = 'unsupportedKey';
      const type = ExifValueType.NOT_SUPPORTED;

      const result = factory.createExifKey(name, type);

      expect(result.name).toBe(name);
      expect(result.type).toBe(type);
    });
  });

  describe('createExifKeysFromMap', () => {
    it('should create an array of ExifKeys from a Map', () => {
      const exifKeysMap = new Map<string, ExifValueType>([
        ['key1', ExifValueType.STRING],
        ['key2', ExifValueType.NUMBER],
        ['key3', ExifValueType.STRING_ARRAY],
      ]);

      const result = factory.createExifKeysFromMap(exifKeysMap);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('key1');
      expect(result[0].type).toBe(ExifValueType.STRING);
      expect(result[1].name).toBe('key2');
      expect(result[1].type).toBe(ExifValueType.NUMBER);
      expect(result[2].name).toBe('key3');
      expect(result[2].type).toBe(ExifValueType.STRING_ARRAY);
    });

    it('should return empty array for empty Map', () => {
      const exifKeysMap = new Map<string, ExifValueType>();

      const result = factory.createExifKeysFromMap(exifKeysMap);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle Map with single entry', () => {
      const exifKeysMap = new Map<string, ExifValueType>([
        ['singleKey', ExifValueType.NOT_SUPPORTED],
      ]);

      const result = factory.createExifKeysFromMap(exifKeysMap);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('singleKey');
      expect(result[0].type).toBe(ExifValueType.NOT_SUPPORTED);
    });

    it('should preserve order of entries from Map', () => {
      const exifKeysMap = new Map<string, ExifValueType>([
        ['firstKey', ExifValueType.STRING],
        ['secondKey', ExifValueType.NUMBER],
        ['thirdKey', ExifValueType.STRING_ARRAY],
      ]);

      const result = factory.createExifKeysFromMap(exifKeysMap);

      expect(result[0].name).toBe('firstKey');
      expect(result[1].name).toBe('secondKey');
      expect(result[2].name).toBe('thirdKey');
    });
  });
});
