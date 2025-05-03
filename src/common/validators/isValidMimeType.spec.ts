import { HttpException, HttpStatus } from '@nestjs/common';
import { IsValidMimeType } from './isValidMimeType';
import { IsValidMimeTypeConstraint } from './isValidMimeType.validator';
import { SUPPORTED_MIMETYPES } from '../constants';

describe('IsValidMimeType', () => {
  let validator: IsValidMimeType;

  beforeEach(() => {
    validator = new IsValidMimeType();
  });

  describe('validate', () => {
    describe('valid MIME types', () => {
      it.each(SUPPORTED_MIMETYPES)(
        'should validate %s MIME type',
        (mimeType) => {
          expect(validator.validate(mimeType)).toBe(true);
        },
      );
    });

    describe('invalid MIME types', () => {
      const invalidMimeTypes = [
        'application/octet-stream',
        'text/plain',
        'application/pdf',
        'invalid-mime-type',
        '',
      ];

      it.each(invalidMimeTypes)(
        'should throw HttpException for %s MIME type',
        (mimeType) => {
          expect(() => validator.validate(mimeType)).toThrow(HttpException);
        },
      );
    });

    describe('error messages', () => {
      it('should throw HttpException with default message when no custom message is provided', () => {
        try {
          validator.validate('text/plain');
          fail('Expected HttpException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getResponse().message).toBe('mimeType is not supported');
          expect(error.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        }
      });

      it('should throw HttpException with custom message when provided', () => {
        const customMessage = 'Custom error message';
        try {
          validator.validate('text/plain', customMessage);
          fail('Expected HttpException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getResponse().message).toBe(customMessage);
          expect(error.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        }
      });
    });
  });

  describe('throwValidationError', () => {
    describe('error messages', () => {
      it('should throw HttpException with default message when no message is provided', () => {
        try {
          validator.throwValidationError();
          fail('Expected HttpException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getResponse().message).toBe('mimeType is not supported');
          expect(error.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        }
      });

      it('should throw HttpException with custom message when provided', () => {
        const customMessage = 'Custom error message';
        try {
          validator.throwValidationError(customMessage);
          fail('Expected HttpException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getResponse().message).toBe(customMessage);
          expect(error.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        }
      });
    });
  });

  describe('parent class behavior', () => {
    it('should use IsValidMimeTypeConstraint validation logic', () => {
      // Create spies on the parent class
      const parentValidateSpy = jest.spyOn(
        IsValidMimeTypeConstraint.prototype,
        'validate',
      );

      // Call the validate method
      validator.validate('image/jpeg');

      // Verify that the parent class's validate method was called
      expect(parentValidateSpy).toHaveBeenCalledWith('image/jpeg');

      // Restore the original implementation
      parentValidateSpy.mockRestore();
    });
  });
});
