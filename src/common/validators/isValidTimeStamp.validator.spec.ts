import {
  IsValidTimeStampConstraint,
  IsValidTimeStamp,
} from './isValidTimeStamp.validator';
import { registerDecorator } from 'class-validator';

jest.mock('class-validator', () => {
  const originalModule = jest.requireActual('class-validator');
  return {
    ...originalModule,
    registerDecorator: jest.fn(),
  };
});

describe('IsValidTimeStampValidator', () => {
  describe('IsValidTimeStampConstraint', () => {
    let validator: IsValidTimeStampConstraint;

    beforeEach(() => {
      validator = new IsValidTimeStampConstraint();
    });

    describe('validate', () => {
      it('should return true for a valid timestamp', () => {
        const result = validator.validate('13:20:01.123');
        expect(result).toBe(true);
      });

      it('should return false for a timestamp with invalid hour', () => {
        const result = validator.validate('24:00:00.000');
        expect(result).toBe(false);
      });

      it('should return false for a timestamp with invalid format', () => {
        const result = validator.validate('13:20:1');
        expect(result).toBe(false);
      });

      it('should return false for a non-timestamp string', () => {
        const result = validator.validate('not-a-timestamp');
        expect(result).toBe(false);
      });
    });

    describe('defaultMessage', () => {
      it('should return the default error message', () => {
        const message = validator.defaultMessage();
        expect(message).toBe('timeStamp must be in the format HH:mm:ss.SSS');
      });
    });
  });

  describe('IsValidTimeStamp', () => {
    it('should register the decorator with the correct properties', () => {
      const validationOptions = { message: 'Test Message' };
      const targetObject = new (class {
        someProperty: string;
      })();
      const propertyName = 'someProperty';

      IsValidTimeStamp(validationOptions)(targetObject, propertyName);

      expect(registerDecorator).toHaveBeenCalledWith({
        propertyName: propertyName,
        target: targetObject.constructor,
        options: validationOptions,
        constraints: [],
        validator: expect.any(Function),
      });
    });

    it('should register the decorator without validation options when not provided', () => {
      const targetObject = new (class {
        someProperty: string;
      })();
      const propertyName = 'someProperty';

      IsValidTimeStamp()(targetObject, propertyName);

      expect(registerDecorator).toHaveBeenCalledWith({
        propertyName: propertyName,
        target: targetObject.constructor,
        options: undefined,
        constraints: [],
        validator: expect.any(Function),
      });
    });
  });
});
