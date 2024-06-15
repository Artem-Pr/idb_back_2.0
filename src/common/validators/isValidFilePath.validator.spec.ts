import type { DBFilePath } from '../types';
import {
  IsValidFilePathConstraint,
  IsValidFilePath,
} from './isValidFilePath.validator';
import { registerDecorator } from 'class-validator';

jest.mock('class-validator', () => {
  const originalModule = jest.requireActual('class-validator');
  return {
    ...originalModule,
    registerDecorator: jest.fn(),
  };
});

describe('IsValidFilePathValidator', () => {
  describe('IsValidFilePathConstraint', () => {
    let validator: IsValidFilePathConstraint;

    beforeEach(() => {
      validator = new IsValidFilePathConstraint();
    });

    describe('validate', () => {
      it('should return true for a valid file path', () => {
        const result = validator.validate('/example.jpg' as DBFilePath);
        expect(result).toBe(true);
      });

      it('should return false for a file path not starting with a slash', () => {
        const result = validator.validate('example.jpg' as DBFilePath);
        expect(result).toBe(false);
      });

      it('should return false for a file path with an unsupported extension', () => {
        const result = validator.validate('/example.unsupported' as DBFilePath);
        expect(result).toBe(false);
      });
    });

    describe('defaultMessage', () => {
      it('should return the default error message', () => {
        const message = validator.defaultMessage();
        expect(message).toBe(
          'The filePath is not in a valid format. Should contain the leading slash and supported extension and should not be empty.',
        );
      });
    });
  });

  describe('IsValidFilePath', () => {
    it('should register the decorator with the correct properties', () => {
      const validationOptions = { message: 'Test Message' };
      const targetObject = new (class {
        someProperty: string;
      })();
      const propertyName = 'someProperty';

      IsValidFilePath(validationOptions)(targetObject, propertyName);

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

      IsValidFilePath()(targetObject, propertyName);

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
