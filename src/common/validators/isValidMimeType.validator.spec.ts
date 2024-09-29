import { registerDecorator } from 'class-validator';
import {
  IsValidMimeType,
  IsValidMimeTypeConstraint,
} from './isValidMimeType.validator';
import { SUPPORTED_MIMETYPES } from '../constants';

jest.mock('class-validator', () => {
  const originalModule = jest.requireActual('class-validator');
  return {
    ...originalModule,
    registerDecorator: jest.fn(),
  };
});

describe('IsValidMimeTypeValidator', () => {
  describe('IsValidMimeTypeConstraint', () => {
    let validator: IsValidMimeTypeConstraint;

    beforeEach(() => {
      validator = new IsValidMimeTypeConstraint();
    });

    describe('validate', () => {
      it.each(SUPPORTED_MIMETYPES)(
        'should return true for supported MIME type "%s"',
        (mimeType) => {
          const result = validator.validate(mimeType);
          expect(result).toBe(true);
        },
      );

      it('should return false for unsupported MIME type', () => {
        const result = validator.validate('application/octet-stream');
        expect(result).toBe(false);
      });

      it('should return false for non-media MIME type', () => {
        const result = validator.validate('text/plain');
        expect(result).toBe(false);
      });
    });

    describe('defaultMessage', () => {
      it('should return the default error message', () => {
        const message = validator.defaultMessage();
        expect(message).toBe('mimeType is not supported');
      });
    });
  });

  describe('IsValidMimeType', () => {
    it('should register the decorator with the correct properties', () => {
      const validationOptions = { message: 'Test Message' };
      const targetObject = new (class {
        someProperty: string;
      })();
      const propertyName = 'someProperty';

      IsValidMimeType(validationOptions)(targetObject, propertyName);

      expect(registerDecorator).toHaveBeenCalledWith({
        propertyName: propertyName,
        target: targetObject.constructor,
        options: validationOptions,
        constraints: [],
        validator: IsValidMimeTypeConstraint,
      });
    });

    it('should register the decorator without validation options when not provided', () => {
      const targetObject = new (class {
        someProperty: string;
      })();
      const propertyName = 'someProperty';

      IsValidMimeType()(targetObject, propertyName);

      expect(registerDecorator).toHaveBeenCalledWith({
        propertyName: propertyName,
        target: targetObject.constructor,
        options: undefined,
        constraints: [],
        validator: IsValidMimeTypeConstraint,
      });
    });
  });
});
