import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DiscStorageService } from './discStorage.service';
import { ConfigService } from 'src/config/config.service';
import { copySync, emptyDirSync, existsSync } from 'fs-extra';
import { Envs, Folders, MainDir, MainDirPath } from 'src/common/constants';
import { UpdateMedia } from './mediaDB.service';
import { Media } from './entities/media.entity';

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
});
