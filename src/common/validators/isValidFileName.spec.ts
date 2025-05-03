import { HttpException, HttpStatus } from '@nestjs/common';
import { IsValidFileName } from './isValidFileName';
import { IsValidFileNameConstraint } from './isValidFileName.validator';
import {
  SUPPORTED_EXTENSIONS_REGEX,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from '../constants';

describe('IsValidFileName', () => {
  let validator: IsValidFileName;

  beforeEach(() => {
    validator = new IsValidFileName();
  });

  describe('validate', () => {
    const validFilenames = [
      ...SUPPORTED_IMAGE_EXTENSIONS.map((ext) => `test.${ext}`),
      ...SUPPORTED_VIDEO_EXTENSIONS.map((ext) => `test.${ext}`),
      // Test various filename formats with a supported extension
      'test-file.jpg',
      'test_file.jpg',
      'test.file.jpg',
      'test file.jpg',
      'TEST.JPG',
    ];

    const invalidFilenames = [
      'test.txt',
      'test.pdf',
      'test.doc',
      'test',
      '/test.jpg',
    ];

    it.each(validFilenames)(
      'should return true for valid filename: %s',
      (filename) => {
        expect(validator.validate(filename)).toBe(true);
        expect(filename).toMatch(SUPPORTED_EXTENSIONS_REGEX);
      },
    );

    it.each(invalidFilenames)(
      'should throw HttpException for invalid filename: %s',
      (filename) => {
        expect(() => validator.validate(filename)).toThrow(HttpException);
        if (filename !== '/test.jpg') {
          expect(filename).not.toMatch(SUPPORTED_EXTENSIONS_REGEX);
        }
      },
    );

    it('should throw HttpException with default message when no custom message is provided', () => {
      try {
        validator.validate('test.txt');
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getResponse().message).toBe(
          'The file name is not in a valid format. Remove the leading slash or check the extension and should not be empty.',
        );
        expect(error.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
    });

    it('should throw HttpException with custom message when provided', () => {
      const customMessage = 'Custom error message';
      try {
        validator.validate('test.txt', customMessage);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getResponse().message).toBe(customMessage);
        expect(error.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
    });
  });

  describe('throwValidationError', () => {
    it('should throw HttpException with default message when no message is provided', () => {
      try {
        validator.throwValidationError();
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getResponse().message).toBe(
          'The file name is not in a valid format. Remove the leading slash or check the extension and should not be empty.',
        );
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

  describe('parent class behavior', () => {
    it('should use IsValidFileNameConstraint validation logic', () => {
      const parentValidateSpy = jest.spyOn(
        IsValidFileNameConstraint.prototype,
        'validate',
      );

      validator.validate('test.jpg');

      expect(parentValidateSpy).toHaveBeenCalledWith('test.jpg');
      parentValidateSpy.mockRestore();
    });
  });
});
