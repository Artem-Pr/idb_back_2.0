import {
  MainDir,
  MainDirPath,
  PreviewPostfix,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_IMAGE_MIMETYPES,
  SUPPORTED_MIMETYPES,
  SUPPORTED_VIDEO_EXTENSIONS,
  SUPPORTED_VIDEO_MIMETYPES,
  SupportedImageMimetypes,
  SupportedVideoMimeTypes,
} from './constants';
import type { DBFilePath, FileNameWithExt } from './types';
import {
  addDestPrefix,
  addPreviewPostfix,
  getFullPathWithoutNameAndFirstSlash,
  getPreviewPath,
  getPreviewPathDependsOnMainDir,
  getUniqPathsRecursively,
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
  removeMainDirPath,
} from './fileNameHelpers';
import { toDateUTC } from './datesHelper';

const MainDirPathMock = {
  dev: '/Volumes/Lexar_SL500/MEGA_sync/IDBase-test',
} as unknown as typeof MainDirPath;

describe('Utils', () => {
  describe('getFullPathWithoutNameAndFirstSlash', () => {
    it('should return the full path without the filename', () => {
      const filePathWithName: DBFilePath = '/folder/subfolder/file.jpg';
      const expectedPath = 'folder/subfolder';
      expect(getFullPathWithoutNameAndFirstSlash(filePathWithName)).toBe(
        expectedPath,
      );
    });

    it('should handle paths with multiple subdirectories', () => {
      const filePathWithName: DBFilePath = '/a/b/c/d/file.jpg';
      const expectedPath = 'a/b/c/d';
      expect(getFullPathWithoutNameAndFirstSlash(filePathWithName)).toBe(
        expectedPath,
      );
    });

    it('should return an empty string if the path contains only the filename', () => {
      const filePathWithName: DBFilePath = '/file.jpg';
      const expectedPath = '';
      expect(getFullPathWithoutNameAndFirstSlash(filePathWithName)).toBe(
        expectedPath,
      );
    });

    it('should handle paths without a leading slash', () => {
      const filePathWithName: FileNameWithExt = 'folder/subfolder/file.jpg';
      const expectedPath = 'folder/subfolder';
      expect(getFullPathWithoutNameAndFirstSlash(filePathWithName)).toBe(
        expectedPath,
      );
    });

    it('should handle paths with no subdirectories', () => {
      const filePathWithName: FileNameWithExt = 'file.jpg';
      const expectedPath = '';
      expect(getFullPathWithoutNameAndFirstSlash(filePathWithName)).toBe(
        expectedPath,
      );
    });
  });

  describe('getPreviewPath', () => {
    it('should correctly generate the preview path for an image file', () => {
      const result = getPreviewPath({
        originalName: 'image.jpg',
        mimeType: SupportedImageMimetypes.jpg,
        postFix: PreviewPostfix.preview,
        date: toDateUTC('2023-10-01'),
      });
      const expectedPattern =
        /^\/image-jpg\/preview\/2023\.10\.01 - originalDate\/image-[0-9a-f]{24}-preview\.jpg$/;

      expect(result).toEqual(expect.stringMatching(expectedPattern));
    });

    it('should correctly generate the preview path for a video file', () => {
      const result = getPreviewPath({
        originalName: 'video.mp4',
        mimeType: SupportedVideoMimeTypes.mp4,
        postFix: PreviewPostfix.fullSize,
        date: toDateUTC('2023-10-01'),
      });

      const expectedPattern =
        /^\/video-mp4\/fullSize\/2023\.10\.01 - originalDate\/video-[0-9a-f]{24}-fullSize\.jpg$/;

      expect(result).toEqual(expect.stringMatching(expectedPattern));
    });

    it('should handle filenames with multiple dots correctly', () => {
      const result = getPreviewPath({
        originalName: 'complex.name.image.jpg',
        mimeType: SupportedImageMimetypes.jpg,
        postFix: PreviewPostfix.preview,
        date: toDateUTC('2023-10-01'),
      });

      const expectedPattern =
        /^\/image-jpg\/preview\/2023\.10\.01 - originalDate\/complex.name.image-[0-9a-f]{24}-preview\.jpg$/;

      expect(result).toEqual(expect.stringMatching(expectedPattern));
    });

    it('should handle different mimeTypes correctly', () => {
      const result = getPreviewPath({
        originalName: 'video.wmv',
        mimeType: SupportedVideoMimeTypes.wmv,
        postFix: PreviewPostfix.preview,
        date: toDateUTC('2023-10-01'),
      });

      const expectedPattern =
        /^\/video-x-ms-wmv\/preview\/2023\.10\.01 - originalDate\/video-[0-9a-f]{24}-preview\.jpg$/;

      expect(result).toEqual(expect.stringMatching(expectedPattern));
    });
  });

  describe('getPreviewPathDependsOnMainDir', () => {
    it('should create a preview path for volume main dir', () => {
      const result = getPreviewPathDependsOnMainDir({
        date: new Date('2023-10-01'),
        dirName: MainDir.volumes,
        mimeType: SupportedImageMimetypes.jpg,
        originalName: 'test-image.jpg',
        postFix: PreviewPostfix.preview,
      });

      const expectedPattern =
        /^\/image-jpg\/preview\/2023\.10\.01 - originalDate\/test-image-[0-9a-f]{24}-preview\.jpg$/;

      expect(result).toEqual(expect.stringMatching(expectedPattern));
    });

    it('should create a preview path for temp main dir', () => {
      const result = getPreviewPathDependsOnMainDir({
        date: new Date('2023-10-01'),
        dirName: MainDir.temp,
        mimeType: SupportedImageMimetypes.jpg,
        originalName: 'test-image.jpg',
        postFix: PreviewPostfix.preview,
      });

      expect(result).toEqual('/test-image-preview.jpg');
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

  describe('addPreviewPostfix', () => {
    it('should add preview postfix to a jpg file', () => {
      const fileName = 'test.jpg';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
      expect(result).toBe('test-preview.jpg');
    });

    it('should add preview postfix to a png file', () => {
      const fileName = 'test-png.png';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
      expect(result).toBe('test-png-preview.jpg');
    });

    it('should add fullSize postfix to a jpeg file', () => {
      const fileName = 'test.jpeg';
      const result = addPreviewPostfix(fileName, PreviewPostfix.fullSize);
      expect(result).toBe('test-fullSize.jpg');
    });

    it('should replace the original extension with the specified postfix', () => {
      const fileName = 'document.avi';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
      expect(result).toBe('document-preview.jpg');
    });

    it('should handle filenames with multiple dots correctly', () => {
      const fileName = 'complex.name.image.jpg';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
      expect(result).toBe('complex.name.image-preview.jpg');
    });

    it('should handle filenames with uppercase extensions correctly', () => {
      const fileName = 'UPPERCASE.JPG';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
      expect(result).toBe('UPPERCASE-preview.jpg');
    });

    it('should handle filePath correctly', () => {
      const fileName = 'dirname/UPPERCASE.JPG';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview);
      expect(result).toBe('dirname/UPPERCASE-preview.jpg');
    });

    it('should add preview postfix with hash', () => {
      const fileName = 'test file name.jpg';
      const result = addPreviewPostfix(fileName, PreviewPostfix.preview, true);

      const expectedPattern = /^test file name-[0-9a-f]{24}-preview\.jpg$/;

      expect(result).toEqual(expect.stringMatching(expectedPattern));
    });
  });

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

  describe('removeMainDirPath', () => {
    const mockMainDirPath: `${MainDirPath}/${MainDir.volumes}` = `${MainDirPathMock.dev}/${MainDir.volumes}`;

    it('should remove the main directory path from a given path', () => {
      const path: `${typeof mockMainDirPath}/subfolder/file.jpg` = `${mockMainDirPath}/subfolder/file.jpg`;
      const expectedPath = 'subfolder/file.jpg';
      const result = removeMainDirPath(path, mockMainDirPath);
      expect(result).toBe(expectedPath);
    });

    it('should remove the main directory path from a given path without fileName', () => {
      const path: `${typeof mockMainDirPath}/subfolder/bom-bom` = `${mockMainDirPath}/subfolder/bom-bom`;
      const expectedPath = 'subfolder/bom-bom';
      const result = removeMainDirPath(path, mockMainDirPath);
      expect(result).toBe(expectedPath);
    });

    it('should handle paths without subdirectories', () => {
      const path: `${typeof mockMainDirPath}/file.jpg` = `${mockMainDirPath}/file.jpg`;
      const expectedPath = 'file.jpg';
      const result = removeMainDirPath(path, mockMainDirPath);
      expect(result).toBe(expectedPath);
    });

    it('should handle paths with multiple subdirectories', () => {
      const path: `${typeof mockMainDirPath}/a/b/c/file.jpg` = `${mockMainDirPath}/a/b/c/file.jpg`;
      const expectedPath = 'a/b/c/file.jpg';
      const result = removeMainDirPath(path, mockMainDirPath);
      expect(result).toBe(expectedPath);
    });

    it('should throw an error if mainDirPath does not match', () => {
      const path: `${typeof mockMainDirPath}/subfolder/file.jpg` =
        'otherDirPath/mainDir/subfolder/file.jpg' as `${typeof mockMainDirPath}/subfolder/file.jpg`;
      expect(() => removeMainDirPath(path, mockMainDirPath)).toThrow(
        'removeMainDirPath - path does not start with mainDirPath: otherDirPath/mainDir/subfolder/file.jpg',
      );
    });

    it('should throw an error if path has no mainDirPath', () => {
      const path: `${typeof mockMainDirPath}/subfolder/file.jpg` =
        'subfolder/file.jpg' as `${typeof mockMainDirPath}/subfolder/file.jpg`;
      expect(() => removeMainDirPath(path, mockMainDirPath)).toThrow(
        'removeMainDirPath - path does not start with mainDirPath: subfolder/file.jpg',
      );
    });

    it('should throw an error if path is empty', () => {
      const path: `${typeof mockMainDirPath}/subfolder/file.jpg` =
        '' as `${typeof mockMainDirPath}/subfolder/file.jpg`;
      expect(() => removeMainDirPath(path, mockMainDirPath)).toThrow(
        'removeMainDirPath - path does not start with mainDirPath: empty path',
      );
    });
  });

  describe('getUniqPathsRecursively', () => {
    it('should return unique paths including subfolders', () => {
      const paths = ['folder1', 'folder2/subfolder1', 'folder2/subfolder2'];
      const expected = [
        'folder1',
        'folder2',
        'folder2/subfolder1',
        'folder2/subfolder2',
      ].sort();
      expect(getUniqPathsRecursively(paths)).toEqual(expected);
    });

    it('should handle paths with multiple subdirectories', () => {
      const paths = ['a/b/c/d', 'a/b/c'];
      const expected = ['a', 'a/b', 'a/b/c', 'a/b/c/d'].sort();
      expect(getUniqPathsRecursively(paths)).toEqual(expected);
    });

    it('should handle paths without subdirectories', () => {
      const paths = ['folder3', 'folder2', 'folder1'];
      const expected = paths.sort();
      expect(getUniqPathsRecursively(paths)).toEqual(expected);
    });

    it('should handle duplicate paths gracefully', () => {
      const paths = ['folder/subfolder', 'folder/subfolder'];
      const expected = ['folder', 'folder/subfolder'].sort();
      expect(getUniqPathsRecursively(paths)).toEqual(expected);
    });

    it('should handle an empty array of paths', () => {
      const paths: string[] = [];
      const expected: string[] = [];
      expect(getUniqPathsRecursively(paths)).toEqual(expected);
    });
  });
});
