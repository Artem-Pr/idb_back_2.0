import { HttpStatus } from '@nestjs/common';
import { validateMimeType, validateFileName } from './tusValidators';
import { SUPPORTED_MIMETYPES } from '../constants';
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from '../constants';

const mockLogError = jest.fn();
jest.mock('src/logger/logger.service', () => {
  return {
    CustomLogger: jest.fn().mockImplementation(() => {
      return {
        logError: (error: any) => mockLogError(error),
      };
    }),
  };
});

describe('tusValidators', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateMimeType', () => {
    describe('valid MIME types', () => {
      it.each(SUPPORTED_MIMETYPES)(
        'should validate %s MIME type',
        (mimeType) => {
          expect(() => validateMimeType(mimeType)).not.toThrow();
          expect(mockLogError).not.toHaveBeenCalled();
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
        'should throw error for %s MIME type',
        (mimeType) => {
          try {
            validateMimeType(mimeType);
            fail('Expected error to be thrown');
          } catch (error: any) {
            expect(error.status_code).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
            expect(error.body).toBe('mimeType is not supported');
            expect(mockLogError).toHaveBeenCalledWith({
              message: 'mimeType is not supported',
              errorData: expect.any(Error),
            });
          }
        },
      );

      it('should throw error with custom message', () => {
        const customMessage = 'Custom error message';
        try {
          validateMimeType('text/plain', customMessage);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.status_code).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
          expect(error.body).toBe(customMessage);
          expect(mockLogError).toHaveBeenCalledWith({
            message: customMessage,
            errorData: expect.any(Error),
          });
        }
      });
    });
  });

  describe('validateFileName', () => {
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
      'should not throw error for valid filename: %s',
      (filename) => {
        expect(() => validateFileName(filename)).not.toThrow();
      },
    );

    it.each(invalidFilenames)(
      'should throw error for invalid filename: %s',
      (filename) => {
        expect(() => validateFileName(filename)).toThrow();
      },
    );

    it('should throw error with default message when no custom message is provided', () => {
      try {
        validateFileName('test.txt');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.status_code).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        expect(error.body).toBe(
          'The file name is not in a valid format. Remove the leading slash or check the extension and should not be empty.',
        );
      }
    });

    it('should throw error with custom message when provided', () => {
      const customMessage = 'Custom error message';
      try {
        validateFileName('test.txt', customMessage);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.status_code).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        expect(error.body).toBe(customMessage);
      }
    });
  });
});
