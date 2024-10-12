import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DiscStorageService } from './discStorage.service';
import { ConfigService } from 'src/config/config.service';
import * as fs from 'fs-extra';
import { Envs, Folders, MainDir, MainDirPath } from 'src/common/constants';
import { UpdateMedia } from './mediaDB.service';
import { Media } from './entities/media.entity';
import { InternalServerErrorException } from '@nestjs/common';
import { dirname } from 'path';
import { resolveAllSettled } from 'src/common/utils';
import type { DBFullSizePath, DBPreviewPath } from 'src/common/types';

const { copySync, emptyDirSync, ensureDirSync, existsSync, removeSync } = fs;

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

describe('DiscStorageService', () => {
  let service: DiscStorageService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscStorageService,
        {
          provide: ConfigService,
          useValue: { rootPaths: Folders[Envs.TEST] },
        },
      ],
    }).compile();

    service = module.get<DiscStorageService>(DiscStorageService);

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
      const nonExistentFilePath = `${SUBDIRECTORY}/nonexistent-file.jpg`;
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

  describe('saveFilesArrToDisk', () => {
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
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FILENAME_2}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FILENAME_2}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_PREVIEW}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_PREVIEW}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_PREVIEW}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_PREVIEW_2}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FULL_SIZE}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FULL_SIZE}`,
      );
      copySync(
        `${MOCK_DIRECTORY}/${DEFAULT_IMAGE_FULL_SIZE}`,
        `${TEST_DIRECTORY_TEMP}/${DEFAULT_IMAGE_FULL_SIZE_2}`,
      );
    });

    it('should save files to disk without previews', async () => {
      const updateMediaArr: UpdateMedia[] = [
        { oldMedia: oldMedia1, newMedia: newMedia1 },
        { oldMedia: oldMedia2, newMedia: newMedia2 },
      ];

      await service.saveFilesArrToDisk(updateMediaArr);

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

    it('should save files to disk with previews and full size', async () => {
      const updateMediaArr: UpdateMedia[] = [
        { oldMedia: oldMedia1, newMedia: newMedia1 },
        { oldMedia: oldMedia2, newMedia: newMedia2 },
      ];

      await service.saveFilesArrToDisk(updateMediaArr, true);

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
});
