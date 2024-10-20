import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Media } from './entities/media.entity';
import { ConfigService } from 'src/config/config.service';
import { dirname, resolve } from 'path';
import type { MoveOptions } from 'fs-extra';
import { emptyDir, ensureDir, move, readdir, remove } from 'fs-extra';
import { MainDir } from 'src/common/constants';
import { CustomLogger } from 'src/logger/logger.service';
import type { UpdateMedia } from './mediaDB.service';
import { resolveAllSettled } from 'src/common/utils';
import {
  getFullPathWithoutNameAndFirstSlash,
  removeExtraSlashes,
} from 'src/common/fileNameHelpers';
import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
} from 'src/common/types';
import { PathsService } from 'src/paths/paths.service';

interface ChangeFileDirectoryProps {
  oldFilePath: Media['filePath'];
  oldFileMainDir: MainDir;
  newFilePath: Media['filePath'];
  newFileMainDir: MainDir;
  moveOptions?: MoveOptions;
}

@Injectable()
export class DiscStorageService {
  private readonly logger = new CustomLogger(DiscStorageService.name);

  constructor(
    private configService: ConfigService,
    private pathsService: PathsService,
  ) {}

  async saveFilesArrToDisk(
    updateMediaArr: UpdateMedia[],
    needPreviewMoving?: boolean,
  ): Promise<void> {
    const changeDirectoriesPromise = updateMediaArr.map(
      ({ oldMedia, newMedia }) => {
        const moveMediaPromise: Promise<void>[] = [];

        const moveMainFilePromise = this.changeFileDirectory({
          oldFilePath: oldMedia.filePath,
          oldFileMainDir: MainDir.temp,
          newFilePath: newMedia.filePath,
          newFileMainDir: MainDir.volumes,
        });
        moveMediaPromise.push(moveMainFilePromise);

        if (needPreviewMoving) {
          const movePreviewPromise = this.changeFileDirectory({
            oldFilePath: oldMedia.preview,
            oldFileMainDir: MainDir.temp,
            newFilePath: newMedia.preview,
            newFileMainDir: MainDir.previews,
            moveOptions: { overwrite: true },
          });
          moveMediaPromise.push(movePreviewPromise);

          if (oldMedia.fullSizeJpg && newMedia.fullSizeJpg) {
            const moveFullSizeJpgPromise = this.changeFileDirectory({
              oldFilePath: oldMedia.fullSizeJpg,
              oldFileMainDir: MainDir.temp,
              newFilePath: newMedia.fullSizeJpg,
              newFileMainDir: MainDir.previews,
              moveOptions: { overwrite: true },
            });
            moveMediaPromise.push(moveFullSizeJpgPromise);
          }
        }

        return resolveAllSettled(moveMediaPromise);
      },
    );

    await resolveAllSettled(changeDirectoriesPromise);
  }

  async changeFileDirectory({
    oldFilePath,
    oldFileMainDir,
    newFilePath,
    newFileMainDir,
    moveOptions,
  }: ChangeFileDirectoryProps): Promise<void> {
    const oldPath = resolve(
      `${this.configService.rootPaths[oldFileMainDir]}${oldFilePath}`,
    );
    const newPath = resolve(
      `${this.configService.rootPaths[newFileMainDir]}${newFilePath}`,
    );

    try {
      await ensureDir(dirname(newPath));
      await move(oldPath, newPath, moveOptions);
    } catch (error) {
      this.logger.logError({
        message: error.message,
        method: 'changeFileDirectory',
        errorData: { oldPath, newPath },
      });
      if (error.code === 'ENOENT') {
        throw new NotFoundException('File not found on disk.');
      } else {
        throw new InternalServerErrorException(
          'Error occurred when changing file directory.',
        );
      }
    }
  }

  async renameFile(
    oldFilePath: Media['filePath'],
    newFilePath: Media['filePath'],
  ) {
    const oldPath = resolve(
      `${this.configService.rootPaths[MainDir.volumes]}${oldFilePath}`,
    );
    const newPath = resolve(
      `${this.configService.rootPaths[MainDir.volumes]}${newFilePath}`,
    );

    await ensureDir(dirname(newPath));
    await move(oldPath, newPath);
  }

  async removeFile(
    filePath: DBFilePath | DBPreviewPath | DBFullSizePath,
    mainDir: MainDir = MainDir.volumes,
  ): Promise<void> {
    const path = resolve(`${this.configService.rootPaths[mainDir]}${filePath}`);
    try {
      await remove(path);
    } catch (error) {
      this.logger.logError({
        message: error.message,
        method: 'removeFile',
        errorData: { path },
      });
      throw new InternalServerErrorException(
        'Error occurred when removing file.',
      );
    }
  }

  async removeDirectory(
    directoryPath: string,
    mainDir: MainDir = MainDir.volumes,
  ): Promise<void> {
    const sanitizedDirectory = removeExtraSlashes(directoryPath);
    const path = resolve(
      `${this.configService.rootPaths[mainDir]}/${sanitizedDirectory}`,
    );
    try {
      await remove(path);
    } catch (error) {
      this.logger.logError({
        message: error.message,
        method: 'removeDirectory',
        errorData: { path },
      });
      throw new InternalServerErrorException(
        'Error occurred when removing directory.',
      );
    }
  }

  async emptyDirectory(
    mainDir: MainDir = MainDir.temp,
    directoryPath?: string,
  ): Promise<void> {
    const sanitizedDirectory = directoryPath
      ? `/${removeExtraSlashes(directoryPath)}`
      : '';
    const path = resolve(
      `${this.configService.rootPaths[mainDir]}${sanitizedDirectory}`,
    );
    try {
      await emptyDir(path);
    } catch (error) {
      this.logger.logError({
        message: error.message,
        method: 'emptyDirectory',
        errorData: { path },
      });
      throw new InternalServerErrorException(
        'Error occurred when emptying directory.',
      );
    }
  }

  private async isEmptyDirectory(
    directoryPath: string,
    mainDir: MainDir = MainDir.volumes,
  ): Promise<boolean> {
    const sanitizedDirectory = removeExtraSlashes(directoryPath);
    const pathToCheck = resolve(
      `${this.configService.rootPaths[mainDir]}/${sanitizedDirectory}`,
    );
    try {
      const files = await readdir(pathToCheck);
      return files.length === 0;
    } catch (error) {
      this.logger.logError({
        message: error.message,
        method: 'isEmptyDirectory',
        errorData: { pathToCheck },
      });
      throw new InternalServerErrorException(
        `Error reading directory: ${error.message || error}`,
      );
    }
  }

  private async removeDirIfEmpty(
    directoryPath: string,
    mainDir: MainDir = MainDir.volumes,
  ): Promise<void> {
    const isEmpty = await this.isEmptyDirectory(directoryPath, mainDir);

    if (isEmpty) {
      await this.removeDirectory(directoryPath, mainDir);
    }
  }

  async removePreviews(previews: (DBPreviewPath | DBFullSizePath)[]) {
    const deletePreviewPromises = previews.map((preview) => {
      return this.removeFile(preview, MainDir.previews);
    });

    await resolveAllSettled(deletePreviewPromises);

    const removeEmptyDirPromises = previews.map((preview) => {
      const previewDirectory = getFullPathWithoutNameAndFirstSlash(preview);
      return this.removeDirIfEmpty(previewDirectory, MainDir.previews);
    });
    await resolveAllSettled(removeEmptyDirPromises);
  }

  async removeFilesAndPreviews(mediaList: Media[]): Promise<Media[]> {
    const notDeletedMediaList: Media[] = [];

    const handleRemoveFile = async (media: Media): Promise<Media | null> => {
      try {
        await this.removeFile(media.filePath, MainDir.volumes);
        return media;
      } catch (error) {
        this.logger.logError({
          message: error.message || error,
          method: 'deleteFilesByIds - diskStorageService.removeFile',
          errorData: { filePath: media.filePath },
        });

        notDeletedMediaList.push(media);
        return null;
      }
    };

    try {
      const deletedMediaList = await resolveAllSettled(
        mediaList.map(handleRemoveFile),
      );

      const validDeletedMediaList = deletedMediaList.filter(Boolean);

      const previewsToDelete =
        this.pathsService.getPreviewsAndFullPathsFormMediaList(
          validDeletedMediaList,
        );

      await this.removePreviews(previewsToDelete);

      return notDeletedMediaList;
    } catch (error) {
      this.logger.logError({
        message: error.message || error,
        method: 'deleteFilesByIds',
        errorData: { ids: mediaList.map((media) => media._id.toString()) },
      });

      throw new InternalServerErrorException(error.message || error);
    }
  }
}
