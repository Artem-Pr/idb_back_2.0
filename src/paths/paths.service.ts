import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Paths } from './entities/paths.entity';
import { PathsOLD } from './entities/pathsOLD.entity';
import { DBConfigConstants } from 'src/common/constants';
import { CheckDirectoryOutputDto } from './dto/check-directory-output.dto';
import {
  removeExtraFirstSlash,
  removeExtraSlashes,
} from 'src/common/fileNameHelpers';
import { MediaDBService } from 'src/files/mediaDB.service';
import { DiscStorageService } from 'src/files/discStorage.service';
import { CustomLogger } from 'src/logger/logger.service';
import type { Media } from 'src/files/entities/media.entity';
import type { DeleteDirectoryOutputDto } from './dto/delete-directory-output.dto';
import type { DBFullSizePath, DBPreviewPath } from 'src/common/types';

@Injectable()
export class PathsService {
  private readonly logger = new CustomLogger(PathsService.name);

  constructor(
    @InjectRepository(Paths)
    private pathsRepository: MongoRepository<Paths>,
    @InjectRepository(PathsOLD)
    private pathsRepositoryOld: MongoRepository<PathsOLD>,
    private mediaDB: MediaDBService,
    private diskStorageService: DiscStorageService,
  ) {}

  async getAllPathsFromDB(): Promise<string[]> {
    const pathsEntities = await this.pathsRepository.find();
    return pathsEntities.map((pathEntity) => pathEntity.path);
  }

  async getAllPathsFromDBoLD(): Promise<string[]> {
    const config = await this.pathsRepositoryOld.findOne({
      where: {
        name: DBConfigConstants.paths,
      },
    });

    return config ? config.pathsArr : [];
  }

  private getSubdirectories(
    directory: string,
    pathsArr: string[],
  ): { numberOfSubdirectories: number; subDirectories: string[] } {
    const trimmedDirectory = removeExtraFirstSlash(directory);
    const subDirectories = pathsArr
      .map((path) => removeExtraFirstSlash(path))
      .filter(
        (path) =>
          path.startsWith(`${trimmedDirectory}/`) && path !== trimmedDirectory,
      );

    return {
      numberOfSubdirectories: subDirectories.length,
      subDirectories,
    };
  }

  async checkDirectory(directory: string): Promise<CheckDirectoryOutputDto> {
    const sanitizedDirectory = removeExtraSlashes(directory);
    const pathsConfig = await this.getAllPathsFromDB();

    if (!pathsConfig.includes(sanitizedDirectory)) {
      throw new NotFoundException('There are no matching directories');
    }

    const subdirectoriesInfo = this.getSubdirectories(
      sanitizedDirectory,
      pathsConfig,
    );
    const numberOfFiles =
      await this.mediaDB.countFilesInDirectory(sanitizedDirectory);

    return {
      numberOfFiles,
      numberOfSubdirectories: subdirectoriesInfo.numberOfSubdirectories,
    };
  }

  async checkDirectoryOld(directory: string): Promise<CheckDirectoryOutputDto> {
    const sanitizedDirectory = removeExtraSlashes(directory);
    const pathsConfig = await this.getAllPathsFromDBoLD();

    if (!pathsConfig.includes(sanitizedDirectory)) {
      throw new NotFoundException('There are no matching directories');
    }

    const subdirectoriesInfo = this.getSubdirectories(
      sanitizedDirectory,
      pathsConfig,
    );
    const numberOfFiles =
      await this.mediaDB.countFilesInDirectory(sanitizedDirectory);

    return {
      numberOfFiles,
      numberOfSubdirectories: subdirectoriesInfo.numberOfSubdirectories,
    };
  }

  private getDirAndSubfolders(directory: string): string[] {
    return removeExtraSlashes(directory)
      .split('/')
      .filter(Boolean)
      .reduce<string[]>((accum, currentDir) => {
        if (!accum.length) return [currentDir];
        return [...accum, `${accum.at(-1)}/${currentDir}`];
      }, []);
  }

  getDirAndSubfoldersFromArray(directories: string[]): string[] {
    return directories.reduce<string[]>((accum, currentDir) => {
      return [...accum, ...this.getDirAndSubfolders(currentDir)];
    }, []);
  }

  private async isPathAlreadyExistsInDB(path: string): Promise<boolean> {
    const existingPaths = await this.pathsRepository.find({
      where: {
        path,
      },
    });

    return existingPaths.length > 0;
  }

  async addPathToDB(path: string): Promise<void> {
    const pathIsExists = await this.isPathAlreadyExistsInDB(path);
    if (!pathIsExists) {
      await this.pathsRepository.insert({ path });
    }
  }

  async addPathsToDB(paths: string[]): Promise<void> {
    const existingPaths = await this.pathsRepository.find({
      where: {
        path: { $in: paths },
      },
    });

    const newPaths = paths.filter(
      (k) => !existingPaths.map((ek) => ek.path).includes(k),
    );

    const pathsToInsert = newPaths.map((path) => ({
      path,
    }));

    if (pathsToInsert.length > 0) {
      await this.pathsRepository.insertMany(pathsToInsert);
    }
  }

  async deletePathsFromDB(paths: string[]): Promise<void> {
    await this.pathsRepository.deleteMany({ path: { $in: paths } });
  }

  async movePathsToNewCollection(): Promise<void> {
    const pathsConfig = await this.getAllPathsFromDBoLD();

    await this.addPathsToDB(pathsConfig);
  }

  private async deleteDirAndSubDirsFromDB(
    sanitizedDirectory: string,
  ): Promise<string[]> {
    const pathsConfigOriginal = await this.getAllPathsFromDB();

    if (!pathsConfigOriginal.includes(sanitizedDirectory)) {
      throw new NotFoundException('There are no matching directories');
    }

    const { subDirectories } = this.getSubdirectories(
      sanitizedDirectory,
      pathsConfigOriginal,
    );

    const directoriesToRemove = [...subDirectories, sanitizedDirectory];
    await this.deletePathsFromDB(directoriesToRemove);

    return directoriesToRemove;
  }

  private async deleteMediaByDirectoryFromDB(
    sanitizedDirectory: string,
  ): Promise<Media[]> {
    const mediaList =
      await this.mediaDB.findMediaByDirectoryInDB(sanitizedDirectory);
    await this.mediaDB.deleteMediaFromDB(mediaList.map((media) => media._id));

    return mediaList;
  }

  private getPreviewsAndFullPathsFormMediaList(mediaList: Media[]) {
    return mediaList.reduce<(DBPreviewPath | DBFullSizePath)[]>(
      (accum, media) => {
        if (media.fullSizeJpg)
          return [...accum, media.preview, media.fullSizeJpg];
        return [...accum, media.preview];
      },
      [],
    );
  }

  private async restoreDataIfDeletionError(
    directoriesToRemove: string[],
    mediaList: Media[],
  ): Promise<void> {
    await this.addPathsToDB(directoriesToRemove);
    await this.mediaDB.addMediaToDB(mediaList);
  }

  async deleteDirectory(directory: string): Promise<DeleteDirectoryOutputDto> {
    const sanitizedDirectory = removeExtraSlashes(directory);
    let directoriesToRemove: string[] = [];
    let mediaList: Media[] = [];

    try {
      directoriesToRemove =
        await this.deleteDirAndSubDirsFromDB(sanitizedDirectory);
      mediaList = await this.deleteMediaByDirectoryFromDB(sanitizedDirectory);
      await this.diskStorageService.removeDirectory(sanitizedDirectory);
      await this.diskStorageService.removePreviews(
        this.getPreviewsAndFullPathsFormMediaList(mediaList),
      );

      return { directoriesToRemove, mediaList };
    } catch (error) {
      this.logger.logError({
        message: error.message || error,
        method: 'deleteDirectory',
        errorData: {
          directoriesToRemove,
          mediaList: mediaList.map((media) => media._id),
        },
      });
      await this.restoreDataIfDeletionError(directoriesToRemove, mediaList);
      throw new InternalServerErrorException(error.message || error);
    }
  }
}
