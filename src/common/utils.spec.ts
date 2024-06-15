import { HttpException, HttpStatus } from '@nestjs/common';
import {
  MainDir,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_IMAGE_MIMETYPES,
  SUPPORTED_MIMETYPES,
  SUPPORTED_VIDEO_EXTENSIONS,
  SUPPORTED_VIDEO_MIMETYPES,
} from './constants';
import type { FileNameWithExt } from './types';
import {
  addDestPrefix,
  isSupportedExtension,
  isSupportedImageExtension,
  isSupportedImageMimeType,
  isSupportedMimeType,
  isSupportedVideoExtension,
  isSupportedVideoMimeType,
  removeExtension,
  removeExtraFirstSlash,
  removeExtraLastSlash,
  removeExtraSlashes,
  removeMainDir,
  resolveAllSettled,
} from './utils'; // Adjust the import path as necessary

describe('Utils', () => {
  describe('removeExtraFirstSlash', () => {
    it('should remove leading slashes from a given string', () => {
      expect(removeExtraFirstSlash('/some/path')).toBe('some/path');
      expect(removeExtraFirstSlash('///some/path')).toBe('some/path');
      expect(removeExtraFirstSlash('some/path')).toBe('some/path');
    });
  });

  describe('removeExtraLastSlash', () => {
    it('should remove trailing slashes from a given string', () => {
      expect(removeExtraLastSlash('some/path/')).toBe('some/path');
      expect(removeExtraLastSlash('some/path///')).toBe('some/path');
      expect(removeExtraLastSlash('some/path')).toBe('some/path');
    });

    it('should handle strings with no trailing slash', () => {
      expect(removeExtraLastSlash('no/trailing/slash')).toBe(
        'no/trailing/slash',
      );
    });

    it('should handle empty strings', () => {
      expect(removeExtraLastSlash('')).toBe('');
    });

    it('should handle strings with only slashes', () => {
      expect(removeExtraLastSlash('///')).toBe('');
    });
  });

  describe('removeExtraSlashes', () => {
    it('should remove leading and trailing slashes from a given string', () => {
      expect(removeExtraSlashes('/some/path/')).toBe('some/path');
      expect(removeExtraSlashes('///some/path///')).toBe('some/path');
    });

    it('should handle strings with no leading or trailing slashes', () => {
      expect(removeExtraSlashes('no/slashes')).toBe('no/slashes');
    });

    it('should handle strings with only leading slashes', () => {
      expect(removeExtraSlashes('///only/leading')).toBe('only/leading');
    });

    it('should handle strings with only trailing slashes', () => {
      expect(removeExtraSlashes('only/trailing///')).toBe('only/trailing');
    });

    it('should handle empty strings', () => {
      expect(removeExtraSlashes('')).toBe('');
    });

    it('should handle strings with only slashes', () => {
      expect(removeExtraSlashes('///')).toBe('');
    });
  });

  describe('addDestPrefix', () => {
    it('should prepend "./" to a given folder path', () => {
      const folderPath = 'some/folder/path';
      const expectedPath = './some/folder/path';
      expect(addDestPrefix(folderPath)).toBe(expectedPath);
    });

    it('should not change a path that already has "./" prefix', () => {
      const folderPath = './another/path';
      expect(addDestPrefix(folderPath)).toBe(folderPath);
    });

    it('should handle an empty string', () => {
      const folderPath = '';
      const expectedPath = './';
      expect(addDestPrefix(folderPath)).toBe(expectedPath);
    });
  });

  describe('removeMainDir', () => {
    it('should remove the MainDir prefix from a given path', () => {
      const pathWithMainDir = `${MainDir.temp}/subfolder/file.jpg`;
      const expectedPath = '/subfolder/file.jpg';
      expect(removeMainDir(pathWithMainDir)).toBe(expectedPath);
    });

    it('should handle paths without a subdirectory', () => {
      const pathWithMainDir = `${MainDir.volumes}/file.jpg`;
      const expectedPath = '/file.jpg';
      expect(removeMainDir(pathWithMainDir)).toBe(expectedPath);
    });
  });

  describe('isSupportedImageExtension', () => {
    const listOfSupportedImageExtensions = [
      ...SUPPORTED_IMAGE_EXTENSIONS,
      ...SUPPORTED_IMAGE_EXTENSIONS.map((e) => e.toUpperCase()),
    ];

    it.each(listOfSupportedImageExtensions)(
      'should return true for supported image extension "%s"',
      (ext) => {
        const fileName = `image.${ext}`;
        expect(isSupportedImageExtension(fileName)).toBe(true);
      },
    );

    it('should return false for unsupported image extension', () => {
      const fileName = 'image.bmp';
      expect(isSupportedImageExtension(fileName)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const fileName = 'IMAGE.JPG';
      expect(isSupportedImageExtension(fileName)).toBe(true);
    });

    it('should return false for filename without an extension', () => {
      const fileName = 'image';
      expect(isSupportedImageExtension(fileName)).toBe(false);
    });

    it('should return true for filename with multiple dots', () => {
      const fileName = 'image.not.jpg';
      expect(isSupportedImageExtension(fileName)).toBe(true);
    });
  });

  describe('isSupportedVideoExtension', () => {
    const listOfSupportedVideoExtensions = [
      ...SUPPORTED_VIDEO_EXTENSIONS,
      ...SUPPORTED_VIDEO_EXTENSIONS.map((e) => e.toUpperCase()),
    ];

    it.each(listOfSupportedVideoExtensions)(
      'should return true for supported video extension "%s"',
      (ext) => {
        const fileName = `video.${ext}`;
        expect(isSupportedVideoExtension(fileName)).toBe(true);
      },
    );

    it('should return false for unsupported video extension', () => {
      const fileName = 'video.flv';
      expect(isSupportedVideoExtension(fileName)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const fileName = 'VIDEO.MP4';
      expect(isSupportedVideoExtension(fileName)).toBe(true);
    });

    it('should return false for filename without an extension', () => {
      const fileName = 'video';
      expect(isSupportedVideoExtension(fileName)).toBe(false);
    });

    it('should return true for filename with multiple dots', () => {
      const fileName = 'video.not.mp4';
      expect(isSupportedVideoExtension(fileName)).toBe(true);
    });
  });

  describe('isSupportedExtension', () => {
    const listOfSupportedExtensions = [
      ...SUPPORTED_IMAGE_EXTENSIONS,
      ...SUPPORTED_IMAGE_EXTENSIONS.map((e) => e.toUpperCase()),
      ...SUPPORTED_VIDEO_EXTENSIONS,
      ...SUPPORTED_VIDEO_EXTENSIONS.map((e) => e.toUpperCase()),
    ];

    it.each(listOfSupportedExtensions)(
      'should return true for supported video extension "%s"',
      (ext) => {
        const fileName = `video.${ext}`;
        expect(isSupportedExtension(fileName)).toBe(true);
      },
    );

    it('should return false for unsupported video extension', () => {
      const fileName = 'video.flv';
      expect(isSupportedExtension(fileName)).toBe(false);

      const fileName2 = 'image.bmp';
      expect(isSupportedExtension(fileName2)).toBe(false);
    });
  });

  describe('isSupportedImageMimeType', () => {
    it.each(SUPPORTED_IMAGE_MIMETYPES)(
      'should return true for supported image MIME type "%s"',
      (mimeType) => {
        expect(isSupportedImageMimeType(mimeType)).toBe(true);
      },
    );

    it('should return false for unsupported image MIME type', () => {
      const unsupportedMimeType = 'image/bmp';
      expect(isSupportedImageMimeType(unsupportedMimeType)).toBe(false);
    });

    it('should return false for non-image MIME type', () => {
      const nonImageMimeType = 'text/html';
      expect(isSupportedImageMimeType(nonImageMimeType)).toBe(false);
    });
  });

  describe('isSupportedVideoMimeType', () => {
    it.each(SUPPORTED_VIDEO_MIMETYPES)(
      'should return true for supported video MIME type "%s"',
      (mimeType) => {
        expect(isSupportedVideoMimeType(mimeType)).toBe(true);
      },
    );

    it('should return false for unsupported video MIME type', () => {
      const unsupportedMimeType = 'video/unsupported-type';
      expect(isSupportedVideoMimeType(unsupportedMimeType)).toBe(false);
    });

    it('should return false for non-video MIME type', () => {
      const nonVideoMimeType = 'audio/mpeg';
      expect(isSupportedVideoMimeType(nonVideoMimeType)).toBe(false);
    });
  });

  describe('isSupportedMimeType', () => {
    it.each(SUPPORTED_MIMETYPES)(
      'should return true for supported MIME type "%s"',
      (mimeType) => {
        expect(isSupportedMimeType(mimeType)).toBe(true);
      },
    );

    it('should return false for unsupported MIME type', () => {
      const unsupportedMimeType = 'application/octet-stream';
      expect(isSupportedMimeType(unsupportedMimeType)).toBe(false);
    });

    it('should return false for non-image and non-video MIME type', () => {
      const nonMediaMimeType = 'text/plain';
      expect(isSupportedMimeType(nonMediaMimeType)).toBe(false);
    });
  });

  describe('removeExtension', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(jest.resetAllMocks);

    it.each([...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_VIDEO_EXTENSIONS])(
      'should remove the extension from a supported filename with extension "%s"',
      (ext) => {
        const filename: FileNameWithExt = `filename.${ext}`;
        expect(removeExtension(filename)).toBe('filename');
      },
    );

    it('should not change a filename without an extension', () => {
      const filename = 'filename' as FileNameWithExt;
      expect(removeExtension(filename)).toBe('filename');
    });

    it('should not change a filename with an unsupported extension', () => {
      const filename = 'filename.bmp' as FileNameWithExt;

      expect(removeExtension(filename)).toBe(filename);
      expect(consoleSpy).toHaveBeenCalledWith(
        'removeExtension - not supported extension:',
        filename,
      );
      consoleSpy.mockRestore();
    });

    it('should handle filenames with multiple dots', () => {
      const filename = 'file.name.with.multiple.dots.jpg';
      expect(removeExtension(filename)).toBe('file.name.with.multiple.dots');
    });

    it('should handle filenames with supported extension in uppercase', () => {
      const filename = 'FILENAME.JPG';
      expect(removeExtension(filename)).toBe('FILENAME');
    });
  });
  describe('resolveAllSettled', () => {
    it('should resolve all promises with their respective values', async () => {
      const promises = [Promise.resolve('value1'), Promise.resolve('value2')];
      await expect(resolveAllSettled(promises)).resolves.toEqual([
        'value1',
        'value2',
      ]);
    });

    it('should throw HttpException when any of the promises is rejected', async () => {
      const mockErrorMessage = 'mock error';
      const errorReason = new Error(mockErrorMessage);
      const promises = [Promise.resolve('value1'), Promise.reject(errorReason)];

      await expect(resolveAllSettled(promises)).rejects.toThrow(HttpException);
      await expect(resolveAllSettled(promises)).rejects.toThrow(
        mockErrorMessage,
      );
    });

    it('should have the correct status code in the thrown HttpException', async () => {
      const errorReason = new Error('mock error');
      const promises = [Promise.resolve('value1'), Promise.reject(errorReason)];

      try {
        await resolveAllSettled(promises);
      } catch (error) {
        if (error instanceof HttpException) {
          expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
          // Re-throw if it's not an instance of HttpException
          throw error;
        }
      }
    });
  });
});
