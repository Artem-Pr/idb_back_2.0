import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Paths } from './entities/paths.entity';
import { PathsOLD } from './entities/pathsOLD.entity';
import { DBConfigConstants } from 'src/common/constants';
import { Media } from 'src/files/entities/media.entity';
import { CheckDirectoryOutputDto } from './dto/check-directory-output.dto';
import {
  removeExtraFirstSlash,
  removeExtraSlashes,
} from 'src/common/fileNameHelpers';

@Injectable()
export class PathsService {
  constructor(
    @InjectRepository(Paths)
    private pathsRepository: MongoRepository<Paths>,
    @InjectRepository(PathsOLD)
    private pathsRepositoryOld: MongoRepository<PathsOLD>,
    @InjectRepository(Media)
    private mediaRepository: MongoRepository<Media>,
  ) {}

  async getPaths(): Promise<string[]> {
    const pathsEntities = await this.pathsRepository.find();
    return pathsEntities.map((pathEntity) => pathEntity.path);
  }

  async getPathsOld(): Promise<string[]> {
    const config = await this.pathsRepositoryOld.findOne({
      where: {
        name: DBConfigConstants.paths,
      },
    });

    return config ? config.pathsArr : [];
  }

  async checkDirectory(directory: string): Promise<CheckDirectoryOutputDto> {
    const sanitizedDirectory = removeExtraSlashes(directory);
    const pathsConfig = await this.getPaths();

    if (!pathsConfig.includes(sanitizedDirectory)) {
      throw new NotFoundException('There are no matching directories');
    }

    const subdirectoriesInfo = this.getSubdirectories(
      sanitizedDirectory,
      pathsConfig,
    );
    const numberOfFiles = await this.countFilesInDirectory(sanitizedDirectory);

    return {
      numberOfFiles,
      numberOfSubdirectories: subdirectoriesInfo.numberOfSubdirectories,
    };
  }
  async checkDirectoryOld(directory: string): Promise<CheckDirectoryOutputDto> {
    const sanitizedDirectory = removeExtraSlashes(directory);
    const pathsConfig = await this.getPathsOld();

    if (!pathsConfig.includes(sanitizedDirectory)) {
      throw new NotFoundException('There are no matching directories');
    }

    const subdirectoriesInfo = this.getSubdirectories(
      sanitizedDirectory,
      pathsConfig,
    );
    const numberOfFiles = await this.countFilesInDirectory(sanitizedDirectory);

    return {
      numberOfFiles,
      numberOfSubdirectories: subdirectoriesInfo.numberOfSubdirectories,
    };
  }

  async countFilesInDirectory(directory: string): Promise<number> {
    const sanitizedDirectory = removeExtraSlashes(directory);

    const count = await this.mediaRepository.count({
      filePath: new RegExp(`^/${sanitizedDirectory}/`),
    });

    return count;
  }

  async addPaths(paths: string[]): Promise<void> {
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

  private async isPathAlreadyExists(path: string): Promise<boolean> {
    const existingPaths = await this.pathsRepository.find({
      where: {
        path,
      },
    });

    return existingPaths.length > 0;
  }

  async addPath(path: string): Promise<void> {
    const pathIsExists = await this.isPathAlreadyExists(path);
    if (!pathIsExists) {
      await this.pathsRepository.insert({ path });
    }
  }

  async movePathsToNewCollection(): Promise<void> {
    const pathsConfig = await this.getPathsOld();

    await this.addPaths(pathsConfig);
  }

  private getSubdirectories(
    directory: string,
    pathsArr: string[],
  ): { numberOfSubdirectories: number } {
    const trimmedDirectory = removeExtraFirstSlash(directory);
    const subDirectories = pathsArr
      .map((path) => removeExtraFirstSlash(path))
      .filter(
        (path) =>
          path.startsWith(`${trimmedDirectory}/`) && path !== trimmedDirectory,
      );

    return {
      numberOfSubdirectories: subDirectories.length,
    };
  }
}
