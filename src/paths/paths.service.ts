import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Paths } from './entities/paths.entity';
import { DBConfigConstants } from 'src/common/constants';
import { Media } from 'src/media/entities/media.entity';
import { CheckDirectoryOutputDto } from './dto/check-directory-output.dto';
import { removeExtraFirstSlash, removeExtraSlashes } from 'src/common/utils';

@Injectable()
export class PathsService {
  constructor(
    @InjectRepository(Paths)
    private pathsRepository: MongoRepository<Paths>,
    @InjectRepository(Media)
    private mediaRepository: MongoRepository<Media>,
  ) {}

  async getPaths(): Promise<string[]> {
    const config = await this.pathsRepository.findOne({
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
      success: true, //TODO: remove this
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
