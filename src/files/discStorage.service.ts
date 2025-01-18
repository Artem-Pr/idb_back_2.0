import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Media } from './entities/media.entity';
import { ConfigService } from 'src/config/config.service';
import { dirname, normalize, resolve } from 'path';
import type { MoveOptions } from 'fs-extra';
import { emptyDir, ensureDir, move, readdir, remove, stat } from 'fs-extra';
import {
  Envs,
  MainDir,
  MainDirPath,
  PreviewPostfix,
} from 'src/common/constants';
import { CustomLogger } from 'src/logger/logger.service';
import type { UpdateMedia } from './mediaDB.service';
import { resolveAllSettled } from 'src/common/utils';
import {
  getFullPathWithoutNameAndFirstSlash,
  getPreviewPathDependsOnMainDir,
  getUniqPathsRecursively,
  removeExtraSlashes,
  removeMainDirPath,
} from 'src/common/fileNameHelpers';
import type {
  DBFilePath,
  DBFullSizePath,
  DBPreviewPath,
  FileNameWithExt,
  FullSizeName,
  NormalizedPath,
  PathWithMainDir,
  PreviewName,
  RemoveDoubleSlashes,
  SupportedMimetypes,
} from 'src/common/types';
import { PathsService } from 'src/paths/paths.service';
import { LogMethod } from 'src/logger/logger.decorator';
import { uniq } from 'ramda';

interface ChangeFileDirectoryProps {
  oldFilePath: Media['filePath'];
  oldFileMainDir: MainDir;
  newFilePath: Media['filePath'];
  newFileMainDir: MainDir;
  moveOptions?: MoveOptions;
}

interface GetFilePathWithPathsProps {
  dirName: MainDir;
  filePath: FileNameWithExt;
  mimeType: SupportedMimetypes['allFiles'];
  date?: Date;
}

type FolderInRootDirectory = `${MainDirPath}/${MainDir}/${string}`;
interface FilesInRootDirectory {
  filesList: string[];
  directoriesList: FolderInRootDirectory[];
}

@Injectable()
export class DiscStorageService {
  private readonly logger = new CustomLogger(DiscStorageService.name);

  constructor(
    private configService: ConfigService,
    private pathsService: PathsService,
  ) {}

  getPreviewMainDir(mediaFileMainDir: MainDir): MainDir {
    return mediaFileMainDir === MainDir.volumes
      ? MainDir.previews
      : mediaFileMainDir;
  }

  getFilePathWithRootDir<
    S extends FileNameWithExt | PreviewName | FullSizeName,
    T extends MainDir,
  >(dirName: T, filePath: S): RemoveDoubleSlashes<NormalizedPath<Envs, T, S>> {
    const filePathWithRootDir: NormalizedPath<Envs, T, S> =
      `${this.configService.rootPaths[dirName]}/${filePath}`;
    return normalize(filePathWithRootDir) as RemoveDoubleSlashes<
      typeof filePathWithRootDir
    >;
  }

  getFilePathStartsWithMainDir<
    S extends FileNameWithExt | PreviewName | FullSizeName,
    T extends MainDir,
  >(dirName: T, filePath: S): RemoveDoubleSlashes<PathWithMainDir<T, S>> {
    const filePathStartsWithMainDir: PathWithMainDir<T, S> =
      `${dirName}/${filePath}`;
    return normalize(filePathStartsWithMainDir) as RemoveDoubleSlashes<
      typeof filePathStartsWithMainDir
    >;
  }

  getPreviewPaths({
    date,
    dirName,
    filePath,
    mimeType,
  }: GetFilePathWithPathsProps) {
    const filePathWithRoot = this.getFilePathWithRootDir(dirName, filePath);
    const fullSizePathWithoutRoot = getPreviewPathDependsOnMainDir({
      date,
      dirName: this.getPreviewMainDir(dirName),
      mimeType,
      originalName: filePath,
      postFix: PreviewPostfix.fullSize,
    });
    const fullSizePathWithRoot = this.getFilePathWithRootDir(
      this.getPreviewMainDir(dirName),
      fullSizePathWithoutRoot,
    );
    const fullSizePathWithMainDir = this.getFilePathStartsWithMainDir(
      this.getPreviewMainDir(dirName),
      fullSizePathWithoutRoot,
    );
    const previewPathWithoutRoot = getPreviewPathDependsOnMainDir({
      date,
      dirName: this.getPreviewMainDir(dirName),
      mimeType,
      originalName: filePath,
      postFix: PreviewPostfix.preview,
    });
    const previewPathWithRoot = this.getFilePathWithRootDir(
      this.getPreviewMainDir(dirName),
      previewPathWithoutRoot,
    );
    const previewPathWithMainDir = this.getFilePathStartsWithMainDir(
      this.getPreviewMainDir(dirName),
      previewPathWithoutRoot,
    );

    return {
      filePathWithRoot,
      fullSizePathWithMainDir,
      fullSizePathWithRoot,
      fullSizePathWithoutRoot,
      previewPathWithMainDir,
      previewPathWithRoot,
      previewPathWithoutRoot,
    };
  }

  @LogMethod('getAllFilesOnDisk')
  async getAllFilesOnDisk(mainDir: MainDir): Promise<{
    filesList: string[];
    directoriesList: string[];
  }> {
    const getAllFilesRecursively = async function (
      dirPath: string,
      filesInRootDirectory: FilesInRootDirectory = {
        filesList: [],
        directoriesList: [],
      },
    ): Promise<FilesInRootDirectory> {
      const files = await readdir(dirPath);

      filesInRootDirectory = filesInRootDirectory || {
        filesList: [],
        directoriesList: [],
      };

      const filesResponse = files.map(async function (file) {
        const fileStat = await stat(dirPath + '/' + file);
        if (fileStat.isDirectory()) {
          filesInRootDirectory.directoriesList.push(
            (dirPath + '/' + file) as FolderInRootDirectory,
          );
          filesInRootDirectory = await getAllFilesRecursively(
            dirPath + '/' + file,
            filesInRootDirectory,
          );
        } else {
          // TODO: Check if it needed to be filtered
          // !file.includes('thumbnail') &&
          //   !file.startsWith('._') &&
          filesInRootDirectory.filesList.push(dirPath + '/' + file);
        }
      });

      await Promise.all(filesResponse);

      return filesInRootDirectory;
    };

    try {
      const response = await getAllFilesRecursively(
        this.configService.rootPaths[mainDir],
      );

      const normalizedResponse = {
        filesList: this.normalizedPathsArr(
          response.filesList.map((path) =>
            removeMainDirPath(
              path as `${MainDirPath}/${MainDir}/${string}`,
              `${this.configService.mainDirPath}/${mainDir}`,
            ),
          ),
        ),
        directoriesList: this.normalizedPathsArr(
          getUniqPathsRecursively(
            uniq(response.directoriesList || []).map((path) =>
              removeMainDirPath(
                path,
                `${this.configService.mainDirPath}/${mainDir}`,
              ),
            ),
          ),
        ),
      };

      return {
        filesList: normalizedResponse.filesList,
        directoriesList: normalizedResponse.directoriesList,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error occurred getting folders from disk: ${error.message || error}`,
      );
    }
  }

  @LogMethod('moveMediaToNewDir')
  async moveMediaToNewDir(
    updateMediaArr: UpdateMedia[],
    mainDirOriginal: MainDir = MainDir.volumes,
  ): Promise<void> {
    const changeDirectoriesPromise = updateMediaArr.map(
      ({ oldMedia, newMedia }) => {
        const moveMediaPromise: Promise<void>[] = [];

        const moveMainFilePromise = this.changeFileDirectory({
          oldFilePath: oldMedia.filePath,
          oldFileMainDir: mainDirOriginal,
          newFilePath: newMedia.filePath,
          newFileMainDir: MainDir.volumes,
        });
        moveMediaPromise.push(moveMainFilePromise);

        if (mainDirOriginal === MainDir.temp) {
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

  @LogMethod('changeFileDirectory')
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

    if (oldPath === newPath) {
      return;
    }

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

  normalizedPathsArr<T extends string>(paths: T[]): T[] {
    return paths.map((path) => path.normalize() as T);
  }
}
