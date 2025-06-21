import { ExifTypeDeterminationStrategy } from './exif-type-determination.strategy';
import { ExifValueType } from '../entities/exif-keys.entity';

describe('ExifTypeDeterminationStrategy', () => {
  let strategy: ExifTypeDeterminationStrategy;

  beforeEach(() => {
    strategy = new ExifTypeDeterminationStrategy();
  });

  describe('determineType', () => {
    describe('string values', () => {
      it('should return STRING for string value', () => {
        const result = strategy.determineType('test string');
        expect(result).toBe(ExifValueType.STRING);
      });

      it('should return STRING for empty string', () => {
        const result = strategy.determineType('');
        expect(result).toBe(ExifValueType.STRING);
      });

      it('should return STRING for string with special characters', () => {
        const result = strategy.determineType('test@#$%^&*()');
        expect(result).toBe(ExifValueType.STRING);
      });
    });

    describe('number values', () => {
      it('should return NUMBER for positive integer', () => {
        const result = strategy.determineType(42);
        expect(result).toBe(ExifValueType.NUMBER);
      });

      it('should return NUMBER for negative integer', () => {
        const result = strategy.determineType(-42);
        expect(result).toBe(ExifValueType.NUMBER);
      });

      it('should return NUMBER for zero', () => {
        const result = strategy.determineType(0);
        expect(result).toBe(ExifValueType.NUMBER);
      });

      it('should return NUMBER for floating point number', () => {
        const result = strategy.determineType(3.14159);
        expect(result).toBe(ExifValueType.NUMBER);
      });

      it('should return NUMBER for negative floating point', () => {
        const result = strategy.determineType(-2.718);
        expect(result).toBe(ExifValueType.NUMBER);
      });
    });

    describe('string array values', () => {
      it('should return STRING_ARRAY for array of strings', () => {
        const result = strategy.determineType([
          'string1',
          'string2',
          'string3',
        ]);
        expect(result).toBe(ExifValueType.STRING_ARRAY);
      });

      it('should return STRING_ARRAY for single element string array', () => {
        const result = strategy.determineType(['single']);
        expect(result).toBe(ExifValueType.STRING_ARRAY);
      });

      it('should return STRING_ARRAY for array with empty strings', () => {
        const result = strategy.determineType(['', 'valid', '']);
        expect(result).toBe(ExifValueType.STRING_ARRAY);
      });

      it('should return STRING_ARRAY for mixed array starting with string', () => {
        // Note: Strategy only checks first element, so mixed arrays with string first
        // are considered string arrays
        const result = strategy.determineType(['string', 123, true]);
        expect(result).toBe(ExifValueType.STRING_ARRAY);
      });
    });

    describe('NOT_SUPPORTED values', () => {
      it('should return NOT_SUPPORTED for empty array', () => {
        const result = strategy.determineType([]);
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for array with undefined first element', () => {
        const result = strategy.determineType([undefined, 'string']);
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for array with non-string first element', () => {
        const result = strategy.determineType([123, 'string']);
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for array of numbers', () => {
        const result = strategy.determineType([1, 2, 3]);
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for object', () => {
        const result = strategy.determineType({ key: 'value' });
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for null', () => {
        const result = strategy.determineType(null);
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for undefined', () => {
        const result = strategy.determineType(undefined);
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for boolean', () => {
        const result = strategy.determineType(true);
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for function', () => {
        const result = strategy.determineType(() => 'test');
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for Date object', () => {
        const result = strategy.determineType(new Date());
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return NOT_SUPPORTED for nested object', () => {
        const result = strategy.determineType({
          nested: {
            key: 'value',
          },
        });
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });
    });

    describe('edge cases', () => {
      it('should return NOT_SUPPORTED for array with null first element', () => {
        const result = strategy.determineType([null, 'string']);
        expect(result).toBe(ExifValueType.NOT_SUPPORTED);
      });

      it('should return STRING_ARRAY for array starting with empty string', () => {
        const result = strategy.determineType(['', 'second']);
        expect(result).toBe(ExifValueType.STRING_ARRAY);
      });

      it('should handle very large numbers', () => {
        const result = strategy.determineType(Number.MAX_SAFE_INTEGER);
        expect(result).toBe(ExifValueType.NUMBER);
      });

      it('should handle very small numbers', () => {
        const result = strategy.determineType(Number.MIN_SAFE_INTEGER);
        expect(result).toBe(ExifValueType.NUMBER);
      });

      it('should handle Infinity', () => {
        const result = strategy.determineType(Infinity);
        expect(result).toBe(ExifValueType.NUMBER);
      });

      it('should handle NaN', () => {
        const result = strategy.determineType(NaN);
        expect(result).toBe(ExifValueType.NUMBER);
      });
    });
  });

  describe('private method behavior', () => {
    it('should validate string arrays correctly', () => {
      // Test the private isValidStringArray method indirectly
      expect(strategy.determineType(['valid'])).toBe(
        ExifValueType.STRING_ARRAY,
      );
      expect(strategy.determineType([123])).toBe(ExifValueType.NOT_SUPPORTED);
      expect(strategy.determineType([])).toBe(ExifValueType.NOT_SUPPORTED);
      expect(strategy.determineType([undefined])).toBe(
        ExifValueType.NOT_SUPPORTED,
      );
    });
  });
});
