import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DiscStorageService } from './discStorage.service';
import { ConfigService } from 'src/config/config.service';
import fs from 'fs-extra';
import {
  Envs,
  Folders,
  MainDir,
  MainDirPath,
  SupportedImageMimetypes,
} from 'src/common/constants';
import { UpdateMedia } from './mediaDB.service';
import { Media } from './entities/media.entity';
import { InternalServerErrorException } from '@nestjs/common';
import { dirname, normalize } from 'path';
import {
  replaceHashWithPlaceholder,
  resolveAllSettled,
} from 'src/common/utils';
import type {
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithExt,
  FullSizeName,
  PreviewName,
} from 'src/common/types';
import { PathsService } from 'src/paths/paths.service';
import { ObjectId } from 'mongodb';

const {
  copySync,
  emptyDirSync,
  ensureDirSync,
  existsSync,
  removeSync,
  writeFileSync,
  readdirSync,
} = fs;

const SUBDIRECTORY = 'main/subdirectory';
const SUBDIRECTORY_2 = 'main2/subdirectory';
const DEFAULT_IMAGE_FILENAME = 'IMG_6107.JPG';
const DEFAULT_IMAGE_FILENAME_2 = 'IMG_6105.JPG';
const DEFAULT_IMAGE_PREVIEW =
  '0a7b6907-76a6-44e2-be16-2e6460d10557-preview.jpg';
const DEFAULT_IMAGE_PREVIEW_2 =
  '0a7b6907-76a6-44e2-be16-2e6460d10558-preview.jpg';
const DEFAULT_IMAGE_FULL_SIZE = 'IMG_20210501_185853-fullSize.jpg';
const DEFAULT_IMAGE_FULL_SIZE_2 = 'IMG_20210501_185854-fullSize.jpg';
const DEFAULT_IMAGE_FILENAME_WITH_DIR = `/${SUBDIRECTORY}/${DEFAULT_IMAGE_FILENAME}`;
const DEFAULT_IMAGE_FILENAME_WITH_DIR_2 = `/${SUBDIRECTORY_2}/${DEFAULT_IMAGE_FILENAME}`;
const NEW_IMAGE_FILENAME = 'IMG_6107-renamed.JPG';
const NEW_IMAGE_FILENAME_WITH_DIR = `/${SUBDIRECTORY}/${NEW_IMAGE_FILENAME}`;
const MOCK_DIRECTORY = `${MainDirPath.test}/mock`;
const TEST_DIRECTORY_VOLUMES = `${MainDirPath.test}/${MainDir.volumes}`;
const TEST_DIRECTORY_PREVIEWS = `${MainDirPath.test}/${MainDir.previews}`;
const TEST_DIRECTORY_TEMP = `${MainDirPath.test}/${MainDir.temp}`;

jest.mock('fs-extra', () => jest.requireActual('fs-extra'));

// TODO: mock this function
const mockGetPreviewsAndFullPathsFormMediaList = (mediaList: Media[]) => {
  return mediaList.reduce<(DBPreviewPath | DBFullSizePath)[]>(
    (accum, media) => {
      if (media.fullSizeJpg)
        return [...accum, media.preview, media.fullSizeJpg];
      return [...accum, media.preview];
    },
    [],
  );
};

describe('DiscStorageService', () => {
  let service: DiscStorageService;
  let pathsService: PathsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscStorageService,
        {
          provide: ConfigService,
          useValue: { rootPaths: Folders[Envs.TEST] },
        },
        {
          provide: PathsService,
          useValue: {
            getPreviewsAndFullPathsFormMediaList: jest
              .fn()
              .mockImplementation(mockGetPreviewsAndFullPathsFormMediaList),
          },
        },
      ],
    }).compile();

    service = module.get<DiscStorageService>(DiscStorageService);
    pathsService = module.get<PathsService>(PathsService);

    emptyDirSync(TEST_DIRECTORY_VOLUMES);
    emptyDirSync(TEST_DIRECTORY_PREVIEWS);
    emptyDirSync(TEST_DIRECTORY_TEMP);
  });

  afterEach(() => {
    emptyDirSync(TEST_DIRECTORY_VOLUMES);
    emptyDirSync(TEST_DIRECTORY_PREVIEWS);
    emptyDirSync(TEST_DIRECTORY_TEMP);
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPreviewMainDir', () => {
    it('should return MainDir.previews when mediaFileMainDir is MainDir.volumes', () => {
      const result = service.getPreviewMainDir(MainDir.volumes);
      expect(result).toBe(MainDir.previews);
    });

    it('should return the same main directory when mediaFileMainDir is not MainDir.volumes', () => {
      const resultTemp = service.getPreviewMainDir(MainDir.temp);
      expect(resultTemp).toBe(MainDir.temp);

      const resultPreviews = service.getPreviewMainDir(MainDir.previews);
      expect(resultPreviews).toBe(MainDir.previews);
    });
  });

  describe('getFilePathWithRootDir', () => {
    it('should return the correct file path with root directory for temp dir', () => {
      const dirName = MainDir.temp;
      const filePath: FileNameWithExt = 'file.jpg';
      const expectedPath = 'test-data/temp/file.jpg';

      const result = service.getFilePathWithRootDir(dirName, filePath);

      expect(result).toBe(expectedPath);
    });

    it('should return the correct file path with root directory for volumes dir', () => {
      const dirName = MainDir.volumes;
      const filePath: PreviewName = 'test-preview.jpg';
      const expectedPath = 'test-data/volumes/test-preview.jpg';

      const result = service.getFilePathWithRootDir(dirName, filePath);

      expect(result).toBe(expectedPath);
    });

    it('should return the correct file path with root directory for previews dir', () => {
      const dirName = MainDir.previews;
      const filePath: FullSizeName = 'test-fullSize.jpg';
      const expectedPath = 'test-data/previews/test-fullSize.jpg';

      const result = service.getFilePathWithRootDir(dirName, filePath);

      expect(result).toBe(expectedPath);
    });
  });

  describe('getFilePathStartsWithMainDir', () => {
    it('should return the correct file path starting with main dir for temp dir', () => {
      const dirName = MainDir.temp;
      const filePath: FileNameWithExt = 'file.jpg';
      const expectedPath = normalize(`${dirName}/${filePath}`);

      const result = service.getFilePathStartsWithMainDir(dirName, filePath);

      expect(result).toBe(expectedPath);
    });

    it('should return the correct file path starting with main dir for volumes dir', () => {
      const dirName = MainDir.volumes;
      const filePath: PreviewName = 'test-preview.jpg';
      const expectedPath = normalize(`${dirName}/${filePath}`);

      const result = service.getFilePathStartsWithMainDir(dirName, filePath);

      expect(result).toBe(expectedPath);
    });

    it('should return the correct file path starting with main dir for previews dir', () => {
      const dirName = MainDir.previews;
      const filePath: FullSizeName = 'test-fullSize.jpg';
      const expectedPath = normalize(`${dirName}/${filePath}`);

      const result = service.getFilePathStartsWithMainDir(dirName, filePath);

      expect(result).toBe(expectedPath);
    });
  });

  describe('getPreviewPaths', () => {
    it('should return correct preview paths', () => {
      const result = service.getPreviewPaths({
        date: new Date('2023-01-01T12:00:00.000Z'),
        dirName: MainDir.volumes,
        filePath: 'test-file.jpg',
        mimeType: SupportedImageMimetypes.jpg,
      });

      const resultWithoutHash = {
        filePathWithRoot: replaceHashWithPlaceholder(result.filePathWithRoot),
        fullSizePathWithMainDir: replaceHashWithPlaceholder(
          result.fullSizePathWithMainDir,
        ),
        fullSizePathWithRoot: replaceHashWithPlaceholder(
          result.fullSizePathWithRoot,
        ),
        fullSizePathWithoutRoot: replaceHashWithPlaceholder(
          result.fullSizePathWithoutRoot,
        ),
        previewPathWithMainDir: replaceHashWithPlaceholder(
          result.previewPathWithMainDir,
        ),
        previewPathWithRoot: replaceHashWithPlaceholder(
          result.previewPathWithRoot,
        ),
        previewPathWithoutRoot: replaceHashWithPlaceholder(
          result.previewPathWithoutRoot,
        ),
      };

      expect(resultWithoutHash).toEqual({
        filePathWithRoot: 'test-data/volumes/test-file.jpg',
        fullSizePathWithMainDir:
          'previews/image-jpg/fullSize/2023.01.01 - originalDate/test-file-{hash}-fullSize.jpg',
        fullSizePathWithRoot:
          'test-data/previews/image-jpg/fullSize/2023.01.01 - originalDate/test-file-{hash}-fullSize.jpg',
        fullSizePathWithoutRoot:
          '/image-jpg/fullSize/2023.01.01 - originalDate/test-file-{hash}-fullSize.jpg',
        previewPathWithMainDir:
          'previews/image-jpg/preview/2023.01.01 - originalDate/test-file-{hash}-preview.jpg',
        previewPathWithRoot:
          'test-data/previews/image-jpg/preview/2023.01.01 - originalDate/test-file-{hash}-preview.jpg',
        previewPathWithoutRoot:
          '/image-jpg/preview/2023.01.01 - originalDate/test-file-{hash}-preview.jpg',
      });
    });
  });

  describe('moveMediaToNewDir', () => {
    const oldMedia1 = new Media();
    oldMedia1.filePath = `/${DEFAULT_IMAGE_FILENAME}`;
    oldMedia1.preview = `/${DEFAULT_IMAGE_PREVIEW}`;
    oldMedia1.fullSizeJpg = `/${DEFAULT_IMAGE_FULL_SIZE}`;

    const oldMedia2 = new Media();
    oldMedia2.filePath = `/${DEFAULT_IMAGE_FILENAME_2}`;
    oldMedia2.preview = `/${DEFAULT_IMAGE_PREVIEW_2}`;
    oldMedia2.fullSizeJpg = `/${DEFAULT_IMAGE_FULL_SIZE_2}`;

    const newMedia1 = new Media();
    newMedia1.filePath = DEFAULT_IMAGE_FILENAME_WITH_DIR;
    newMedia1.preview = `/${SUBDIRECTORY}/${DEFAULT_IMAGE_PREVIEW}`;
    newMedia1.fullSizeJpg = `/${SUBDIRECTORY}/${DEFAULT_IMAGE_FULL_SIZE}`;

    const newMedia2 = new Media();
    newMedia2.filePath = DEFAULT_IMAGE_FILENAME_WITH_DIR_2;
    newMedia2.preview = `/${SUBDIRECTORY}/${DEFAULT_IMAGE_PREVIEW_2}`;
    newMedia2.fullSizeJpg = `/${SUBDIRECTORY}/${DEFAULT_IMAGE_FULL_SIZE_2}`;

    beforeEach(() => {
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`,
        `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FILENAME}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME_2}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_2}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME_2}`,
        `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FILENAME_2}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_PREVIEW}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_PREVIEW}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_PREVIEW}`,
        `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_PREVIEW}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_PREVIEW}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_PREVIEW_2}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_PREVIEW}`,
        `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_PREVIEW_2}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FULL_SIZE}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FULL_SIZE}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FULL_SIZE}`,
        `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FULL_SIZE}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FULL_SIZE}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FULL_SIZE_2}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FULL_SIZE}`,
        `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FULL_SIZE_2}`,
      );
    });

    it('should move media files to new directory without previews', async () => {
      const updateMediaArr: UpdateMedia[] = [
        { oldMedia: oldMedia1, newMedia: newMedia1 },
        { oldMedia: oldMedia2, newMedia: newMedia2 },
      ];

      await service.moveMediaToNewDir(updateMediaArr, MainDir.volumes);

      expect(
        existsSync(`${TEST_DIRECTORY_VOLUMES}/${newMedia1.filePath}`),
      ).toBeTruthy();
      expect(
        existsSync(`${TEST_DIRECTORY_PREVIEWS}/${newMedia1.preview}`),
      ).toBeFalsy();
      expect(
        existsSync(`${TEST_DIRECTORY_PREVIEWS}/${newMedia1.fullSizeJpg}`),
      ).toBeFalsy();
      expect(
        existsSync(`${TEST_DIRECTORY_VOLUMES}/${newMedia2.filePath}`),
      ).toBeTruthy();
      expect(
        existsSync(`${TEST_DIRECTORY_PREVIEWS}/${newMedia2.preview}`),
      ).toBeFalsy();
      expect(
        existsSync(`${TEST_DIRECTORY_PREVIEWS}/${newMedia2.fullSizeJpg}`),
      ).toBeFalsy();
    });

    it('should move media files to new directory with previews and full size', async () => {
      const updateMediaArr: UpdateMedia[] = [
        { oldMedia: oldMedia1, newMedia: newMedia1 },
        { oldMedia: oldMedia2, newMedia: newMedia2 },
      ];

      await service.moveMediaToNewDir(updateMediaArr, MainDir.temp);

      expect(
        existsSync(`${TEST_DIRECTORY_VOLUMES}/${newMedia1.filePath}`),
      ).toBeTruthy();
      expect(
        existsSync(`${TEST_DIRECTORY_PREVIEWS}/${newMedia1.preview}`),
      ).toBeTruthy();
      expect(
        existsSync(`${TEST_DIRECTORY_PREVIEWS}/${newMedia1.fullSizeJpg}`),
      ).toBeTruthy();
      expect(
        existsSync(`${TEST_DIRECTORY_VOLUMES}/${newMedia2.filePath}`),
      ).toBeTruthy();
      expect(
        existsSync(`${TEST_DIRECTORY_PREVIEWS}/${newMedia2.preview}`),
      ).toBeTruthy();
      expect(
        existsSync(`${TEST_DIRECTORY_PREVIEWS}/${newMedia2.fullSizeJpg}`),
      ).toBeTruthy();
    });
  });

  describe('changeFileDirectory', () => {
    beforeEach(() => {
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`,
        `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FILENAME_WITH_DIR}`,
      );
    });

    it('should change the file directory', async () => {
      expect(
        existsSync(
          `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_WITH_DIR_2}`,
        ),
      ).toBeFalsy();

      await service.changeFileDirectory({
        oldFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR,
        oldFileMainDir: MainDir.volumes,
        newFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR_2,
        newFileMainDir: MainDir.temp,
      });

      expect(
        existsSync(
          `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FILENAME_WITH_DIR}`,
        ),
      ).toBeFalsy();
      expect(
        existsSync(
          `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_WITH_DIR_2}`,
        ),
      ).toBeTruthy();
    });

    it('should do nothing if new directory is the same as old directory', async () => {
      jest.spyOn(fs, 'move').mockImplementation(() => {});

      await service.changeFileDirectory({
        oldFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR,
        oldFileMainDir: MainDir.volumes,
        newFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR,
        newFileMainDir: MainDir.volumes,
      });

      expect(fs.move).not.toHaveBeenCalled();
    });

    it('should throw an error if the file does not exist', async () => {
      expect(
        existsSync(
          `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_WITH_DIR_2}`,
        ),
      ).toBeFalsy();

      await expect(
        service.changeFileDirectory({
          oldFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR_2,
          oldFileMainDir: MainDir.temp,
          newFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR,
          newFileMainDir: MainDir.volumes,
        }),
      ).rejects.toThrow(new Error('File not found on disk.'));
    });

    it('should not rewrite file if the file is already in the new directory', async () => {
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_WITH_DIR_2}`,
      );

      expect(
        existsSync(
          `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_WITH_DIR_2}`,
        ),
      ).toBeTruthy();

      await expect(
        service.changeFileDirectory({
          oldFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR,
          oldFileMainDir: MainDir.volumes,
          newFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR_2,
          newFileMainDir: MainDir.temp,
        }),
      ).rejects.toThrow(
        new Error('Error occurred when changing file directory.'),
      );
    });

    it('should rewrite file if overwrite option is provided', async () => {
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_WITH_DIR_2}`,
      );

      expect(
        existsSync(
          `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_WITH_DIR_2}`,
        ),
      ).toBeTruthy();

      await service.changeFileDirectory({
        oldFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR,
        oldFileMainDir: MainDir.volumes,
        newFilePath: DEFAULT_IMAGE_FILENAME_WITH_DIR_2,
        newFileMainDir: MainDir.temp,
        moveOptions: { overwrite: true },
      });

      expect(
        existsSync(
          `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FILENAME_WITH_DIR}`,
        ),
      ).toBeFalsy();
      expect(
        existsSync(
          `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_WITH_DIR_2}`,
        ),
      ).toBeTruthy();
    });
  });

  describe('renameFile', () => {
    beforeEach(() => {
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`,
        `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FILENAME_WITH_DIR}`,
      );
    });

    it('should rename the file', async () => {
      expect(
        existsSync(`${TEST_DIRECTORY_VOLUMES}/${NEW_IMAGE_FILENAME_WITH_DIR}`),
      ).toBeFalsy();

      await service.renameFile(
        DEFAULT_IMAGE_FILENAME_WITH_DIR,
        NEW_IMAGE_FILENAME_WITH_DIR,
      );

      expect(
        existsSync(`${TEST_DIRECTORY_VOLUMES}/${NEW_IMAGE_FILENAME_WITH_DIR}`),
      ).toBeTruthy();
      expect(
        existsSync(
          `${TEST_DIRECTORY_VOLUMES}/${DEFAULT_IMAGE_FILENAME_WITH_DIR}`,
        ),
      ).toBeFalsy();
    });

    it('should throw an error if the file does not exist', async () => {
      await expect(
        service.renameFile(
          NEW_IMAGE_FILENAME_WITH_DIR,
          DEFAULT_IMAGE_FILENAME_WITH_DIR,
        ),
      ).rejects.toThrow();
    });
  });

  describe('removeFile', () => {
    const fileToRemove = `${TEST_DIRECTORY_VOLUMES}${DEFAULT_IMAGE_FILENAME_WITH_DIR}`;

    beforeEach(() => {
      copySync(`${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`, fileToRemove);
    });

    it('should remove the file', async () => {
      expect(existsSync(fileToRemove)).toBeTruthy();
      await service.removeFile(
        DEFAULT_IMAGE_FILENAME_WITH_DIR,
        MainDir.volumes,
      );
      expect(existsSync(fileToRemove)).toBeFalsy();
    });

    it('should not throw an error if the file does not exist', async () => {
      const nonExistentFilePath = `/${SUBDIRECTORY}/nonexistent-file.jpg`;
      await expect(
        service.removeFile(nonExistentFilePath),
      ).resolves.not.toThrow();
    });

    it('should throw InternalServerErrorException if an error occurs', async () => {
      jest.spyOn(fs, 'remove').mockImplementation(() => {
        throw new Error();
      });
      const invalidFilePath = '/invalid/path/to/file.jpg';

      await expect(service.removeFile(invalidFilePath)).rejects.toThrow(
        new InternalServerErrorException('Error occurred when removing file.'),
      );
    });
  });

  describe('removeDirectory', () => {
    const directoryPath = `${TEST_DIRECTORY_VOLUMES}/subDir`;

    beforeEach(() => {
      ensureDirSync(directoryPath);
    });

    afterEach(() => {
      removeSync(directoryPath);
    });

    it('should remove the directory', async () => {
      expect(existsSync(directoryPath)).toBeTruthy();
      await service.removeDirectory('subDir');
      expect(existsSync(directoryPath)).toBeFalsy();
    });

    it('should not throw an error if the directory does not exist', async () => {
      await expect(
        service.removeDirectory('nonexistent-dir'),
      ).resolves.not.toThrow();
    });

    it('should remove nested directories', async () => {
      const nestedDirectoryPath = `${directoryPath}/nested`;
      ensureDirSync(nestedDirectoryPath);
      expect(existsSync(nestedDirectoryPath)).toBeTruthy();

      await service.removeDirectory('subDir/nested');
      expect(existsSync(nestedDirectoryPath)).toBeFalsy();
      expect(existsSync(directoryPath)).toBeTruthy();
    });

    it('should remove subdirectories and files', async () => {
      const nestedDirectoryPath = `${directoryPath}/nested`;
      ensureDirSync(nestedDirectoryPath);
      expect(existsSync(nestedDirectoryPath)).toBeTruthy();

      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`,
        `${nestedDirectoryPath}/${DEFAULT_IMAGE_FILENAME}`,
      );

      await service.removeDirectory('subDir');
      expect(existsSync(nestedDirectoryPath)).toBeFalsy();
      expect(existsSync(directoryPath)).toBeFalsy();
    });

    it('should sanitize the directory path', async () => {
      const unsanitizedPath = `//subDir//nested`;
      const sanitizedPath = `${directoryPath}/nested`;
      ensureDirSync(sanitizedPath);
      expect(existsSync(sanitizedPath)).toBeTruthy();

      await service.removeDirectory(unsanitizedPath);
      expect(existsSync(sanitizedPath)).toBeFalsy();
    });

    it('should handle an empty directory path gracefully', async () => {
      await expect(service.removeDirectory('')).resolves.not.toThrow();
    });

    it('should throw InternalServerErrorException if an error occurs', async () => {
      jest.spyOn(fs, 'remove').mockImplementation(() => {
        throw new Error();
      });

      await expect(service.removeDirectory('directory')).rejects.toThrow(
        new InternalServerErrorException(
          'Error occurred when removing directory.',
        ),
      );
    });
  });

  describe('emptyDirectory', () => {
    const directoryPath = 'subDir';
    const fullTempPath = `${TEST_DIRECTORY_TEMP}/${directoryPath}`;
    const fullVolumesPath = `${TEST_DIRECTORY_VOLUMES}/${directoryPath}`;

    beforeEach(() => {
      ensureDirSync(fullTempPath);
      ensureDirSync(fullVolumesPath);
      writeFileSync(`${fullTempPath}/test-file.txt`, 'test content');
      writeFileSync(`${fullVolumesPath}/test-file.txt`, 'test content');
    });

    it('should empty the directory', async () => {
      expect(readdirSync(fullVolumesPath).length).toBeGreaterThan(0);
      await service.emptyDirectory(MainDir.volumes, directoryPath);
      expect(readdirSync(fullVolumesPath).length).toBe(0);
    });

    it('should empty the temp directory when mainDir and subDir are not provided', async () => {
      expect(readdirSync(TEST_DIRECTORY_TEMP).length).toBeGreaterThan(0);
      await service.emptyDirectory();
      expect(readdirSync(TEST_DIRECTORY_TEMP).length).toBe(0);
    });

    it('should throw InternalServerErrorException if an error occurs', async () => {
      jest.spyOn(fs, 'emptyDir').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(
        service.emptyDirectory(MainDir.volumes, directoryPath),
      ).rejects.toThrow(
        new InternalServerErrorException(
          'Error occurred when emptying directory.',
        ),
      );
    });
  });

  describe('isEmptyDirectory', () => {
    const directoryPath = `${TEST_DIRECTORY_VOLUMES}/subDir`;

    beforeEach(() => {
      ensureDirSync(directoryPath);
    });

    afterEach(() => {
      removeSync(directoryPath);
    });

    it('should return true for an empty directory', async () => {
      expect(await service['isEmptyDirectory']('subDir')).toBe(true);
    });

    it('should return false for a non-empty directory', async () => {
      const filePath = `${directoryPath}/test-file.txt`;
      fs.writeFileSync(filePath, 'test content');
      expect(await service['isEmptyDirectory']('subDir')).toBe(false);
    });

    it('should throw InternalServerErrorException if an error occurs', async () => {
      const invalidDirectoryPath = 'invalid/subDir';
      jest.spyOn(fs, 'readdir').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(
        service['isEmptyDirectory'](invalidDirectoryPath),
      ).rejects.toThrow(
        new InternalServerErrorException('Error reading directory: Test error'),
      );
    });
  });

  describe('removeDirIfEmpty', () => {
    const directoryPath = `${TEST_DIRECTORY_VOLUMES}/subDir`;

    beforeEach(() => {
      ensureDirSync(directoryPath);
    });

    afterEach(() => {
      removeSync(directoryPath);
    });

    it('should remove the directory if it is empty', async () => {
      expect(existsSync(directoryPath)).toBeTruthy();
      await service['removeDirIfEmpty']('subDir');
      expect(existsSync(directoryPath)).toBeFalsy();
    });

    it('should not remove the directory if it is not empty', async () => {
      const filePath = `${directoryPath}/test-file.txt`;
      fs.writeFileSync(filePath, 'test content');
      expect(existsSync(directoryPath)).toBeTruthy();
      await service['removeDirIfEmpty']('subDir');
      expect(existsSync(directoryPath)).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(fs, 'readdir').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(service['removeDirIfEmpty']('subDir')).rejects.toThrow(
        new InternalServerErrorException('Error reading directory: Test error'),
      );
    });
  });

  describe('removePreviews', () => {
    const previews: (DBPreviewPath | DBFullSizePath)[] = [
      '/dir/test-preview1-preview.jpg',
      '/dir/test-preview2-fullSize.jpg',
    ];

    beforeEach(() => {
      previews.forEach((preview) => {
        const previewPath = `${TEST_DIRECTORY_PREVIEWS}${preview}`;
        const previewDir = dirname(previewPath);
        ensureDirSync(previewDir);
        fs.writeFileSync(previewPath, 'test content');
      });
    });

    afterEach(() => {
      previews.forEach((preview) => {
        const previewPath = `${TEST_DIRECTORY_PREVIEWS}${preview}`;
        const previewDir = dirname(previewPath);
        removeSync(previewPath);
        removeSync(previewDir);
      });
    });

    it('should remove all preview files and their empty directories', async () => {
      await service.removePreviews(previews);

      previews.forEach((preview) => {
        const previewPath = `${TEST_DIRECTORY_PREVIEWS}${preview}`;
        const previewDir = dirname(previewPath);
        expect(existsSync(previewPath)).toBeFalsy();
        expect(existsSync(previewDir)).toBeFalsy();
      });
    });

    it('should not throw an error if preview files do not exist', async () => {
      await resolveAllSettled(
        previews.map((preview) =>
          service.removeFile(preview, MainDir.previews),
        ),
      );

      await expect(service.removePreviews(previews)).resolves.not.toThrow();
    });

    it('should handle errors gracefully when removing files', async () => {
      jest.spyOn(fs, 'remove').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(service.removePreviews(previews)).rejects.toThrow(
        new InternalServerErrorException('Error occurred when removing file.'),
      );
    });
  });

  describe('removeFilesAndPreviews', () => {
    const testImagePathMock = `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME}`;
    const previewDir = '/preview';
    const fullSizeDir = '/fullSize';

    const media1 = new Media();
    media1._id = new ObjectId('662eb6a4aece4209057aa5d0');
    media1.filePath = DEFAULT_IMAGE_FILENAME_WITH_DIR;
    media1.preview = `${previewDir}/${DEFAULT_IMAGE_PREVIEW}`;
    media1.fullSizeJpg = `${fullSizeDir}/${DEFAULT_IMAGE_FULL_SIZE}`;
    const media2 = new Media();
    media2._id = new ObjectId('662eb6a4aece4209057aa5d1');
    media2.filePath = DEFAULT_IMAGE_FILENAME_WITH_DIR_2;
    media2.preview = `${previewDir}/${DEFAULT_IMAGE_PREVIEW_2}`;
    media2.fullSizeJpg = `${fullSizeDir}/${DEFAULT_IMAGE_FULL_SIZE_2}`;
    const mediaWithoutFullSize = new Media();
    mediaWithoutFullSize._id = new ObjectId('662eb6a4aece4209057aa5d2');
    mediaWithoutFullSize.filePath = `/main2/${DEFAULT_IMAGE_FILENAME}`;
    mediaWithoutFullSize.preview = `${previewDir}/2${DEFAULT_IMAGE_PREVIEW_2}`;

    const withMainDir = (path: string) => `${TEST_DIRECTORY_VOLUMES}/${path}`;
    const withPreviewDir = (path: string) =>
      `${TEST_DIRECTORY_PREVIEWS}/${path}`;

    beforeEach(() => {
      copySync(testImagePathMock, withMainDir(media1.filePath));
      copySync(testImagePathMock, withPreviewDir(media1.preview));
      copySync(
        testImagePathMock,
        withPreviewDir(media1.fullSizeJpg as DBFullSizePath),
      );
      copySync(testImagePathMock, withMainDir(media2.filePath));
      copySync(testImagePathMock, withPreviewDir(media2.preview));
      copySync(
        testImagePathMock,
        withPreviewDir(media2.fullSizeJpg as DBFullSizePath),
      );
      copySync(testImagePathMock, withMainDir(mediaWithoutFullSize.filePath));
      copySync(testImagePathMock, withPreviewDir(mediaWithoutFullSize.preview));
    });

    it('should successfully remove all files and previews', async () => {
      const mediaList: Media[] = [media1, media2, mediaWithoutFullSize];

      jest.spyOn(service, 'removeFile');

      const result = await service.removeFilesAndPreviews(mediaList);

      expect(service.removeFile).toHaveBeenCalledTimes(8);
      expect(result).toEqual([]);
      expect(existsSync(media1.filePath)).toBeFalsy();
      expect(existsSync(media1.preview)).toBeFalsy();
      expect(existsSync(media1.fullSizeJpg as DBFullSizePath)).toBeFalsy();
      expect(existsSync(media2.filePath)).toBeFalsy();
      expect(existsSync(media2.preview)).toBeFalsy();
      expect(existsSync(media2.fullSizeJpg as DBFullSizePath)).toBeFalsy();
      expect(existsSync(mediaWithoutFullSize.filePath)).toBeFalsy();
      expect(existsSync(mediaWithoutFullSize.preview)).toBeFalsy();
      expect(existsSync(withPreviewDir(previewDir))).toBeFalsy();
      expect(existsSync(withPreviewDir(fullSizeDir))).toBeFalsy();
      expect(existsSync(withMainDir(SUBDIRECTORY))).not.toBeFalsy();
      expect(existsSync(withMainDir(SUBDIRECTORY_2))).not.toBeFalsy();
    });

    it('should handle error during file removal and return not deleted media', async () => {
      const mediaList: Media[] = [media1, media2, mediaWithoutFullSize];

      jest.spyOn(service, 'removeFile');
      jest.spyOn(fs, 'remove').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = await service.removeFilesAndPreviews(mediaList);

      expect(service.removeFile).toHaveBeenCalledTimes(6);
      expect(result).toEqual([media1]);
    });

    it('should throw an InternalServerErrorException if an error occurs during the process', async () => {
      const mediaList: Media[] = [media1, media2, mediaWithoutFullSize];

      jest.spyOn(service, 'removeFile');
      jest
        .spyOn(pathsService, 'getPreviewsAndFullPathsFormMediaList')
        .mockImplementation(() => {
          throw new Error('Test error');
        });

      await expect(service.removeFilesAndPreviews(mediaList)).rejects.toThrow(
        new InternalServerErrorException('Test error'),
      );
    });
  });
});
