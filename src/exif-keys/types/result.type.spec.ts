import { success, failure, Result } from './result.type';

describe('Result Type', () => {
  describe('success', () => {
    it('should create a success result with data', () => {
      const data = 'test data';
      const result = success(data);

      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
    });

    it('should create a success result with number data', () => {
      const data = 42;
      const result = success(data);

      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
    });

    it('should create a success result with object data', () => {
      const data = { key: 'value', count: 10 };
      const result = success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should create a success result with array data', () => {
      const data = [1, 2, 3, 'test'];
      const result = success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should create a success result with null data', () => {
      const data = null;
      const result = success(data);

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should create a success result with undefined data', () => {
      const data = undefined;
      const result = success(data);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('failure', () => {
    it('should create a failure result with Error', () => {
      const error = new Error('Test error');
      const result = failure(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should create a failure result with custom error message', () => {
      const error = new Error('Custom error message');
      const result = failure(error);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Custom error message');
    });

    it('should create a failure result with Error instance', () => {
      const error = new TypeError('Type error occurred');
      const result = failure(error);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TypeError);
      expect(result.error.message).toBe('Type error occurred');
    });
  });

  describe('type guards and usage patterns', () => {
    it('should work with success type guard', () => {
      const result: Result<string> = success('test');

      if (result.success) {
        expect(result.data).toBe('test');
        // TypeScript should infer that result.data is available here
        expect(typeof result.data).toBe('string');
      } else {
        fail('Expected success result');
      }
    });

    it('should work with failure type guard', () => {
      const result: Result<string> = failure(new Error('test error'));

      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('test error');
        // TypeScript should infer that result.error is available here
      } else {
        fail('Expected failure result');
      }
    });

    it('should handle chained operations with success', () => {
      const processResult = (input: string): Result<number> => {
        if (input === 'valid') {
          return success(42);
        }
        return failure(new Error('Invalid input'));
      };

      const result = processResult('valid');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should handle chained operations with failure', () => {
      const processResult = (input: string): Result<number> => {
        if (input === 'valid') {
          return success(42);
        }
        return failure(new Error('Invalid input'));
      };

      const result = processResult('invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Invalid input');
      }
    });
  });

  describe('complex type scenarios', () => {
    interface TestData {
      id: number;
      name: string;
      items: string[];
    }

    it('should work with complex object types', () => {
      const testData: TestData = {
        id: 1,
        name: 'Test Object',
        items: ['item1', 'item2'],
      };

      const result = success(testData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe('Test Object');
        expect(result.data.items).toEqual(['item1', 'item2']);
      }
    });

    it('should work with generic array types', () => {
      const numbers = [1, 2, 3, 4, 5];
      const result: Result<number[]> = success(numbers);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(5);
        expect(result.data[0]).toBe(1);
        expect(result.data[4]).toBe(5);
      }
    });

    it('should work with union types', () => {
      const stringOrNumber: string | number = 'test';
      const result: Result<string | number> = success(stringOrNumber);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe('string');
        expect(result.data).toBe('test');
      }
    });
  });
});
