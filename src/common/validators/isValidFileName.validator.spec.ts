import type { FileNameWithExt } from '../types';
import {
  IsValidFileNameConstraint,
  IsValidFileName,
} from './isValidFileName.validator';
import { registerDecorator } from 'class-validator';

jest.mock('class-validator', () => {
  const originalModule = jest.requireActual('class-validator');
  return {
    ...originalModule,
    registerDecorator: jest.fn(),
  };
});

describe('IsValidFileNameValidator', () => {
  describe('IsValidFileNameConstraint', () => {
    let validator: IsValidFileNameConstraint;

    beforeEach(() => {
      validator = new IsValidFileNameConstraint();
    });

    describe('validate', () => {
      it('should return true for a valid file name', () => {
        const result = validator.validate('example.jpg');
        expect(result).toBe(true);
      });

      it('should return false for a file name starting with a slash', () => {
        const result = validator.validate('/example.jpg');
        expect(result).toBe(false);
      });

      it('should return false for a file name with an unsupported extension', () => {
        const result = validator.validate(
          'example.unsupported' as FileNameWithExt,
        );
        expect(result).toBe(false);
      });
    });

    describe('defaultMessage', () => {
      it('should return the default error message', () => {
        const message = validator.defaultMessage();
        expect(message).toBe(
          'The file name is not in a valid format. Remove the leading slash or check the extension and should not be empty.',
        );
      });
    });
  });

  describe('IsValidFileName', () => {
    it('should register the decorator with the correct properties', () => {
      const validationOptions = { message: 'Test Message' };
      const targetObject = new (class {
        someProperty: string;
      })();
      const propertyName = 'someProperty';

      IsValidFileName(validationOptions)(targetObject, propertyName);

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

      IsValidFileName()(targetObject, propertyName);

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
