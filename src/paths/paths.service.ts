import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paths } from './entities/paths.entity';
import { DBConfigConstants } from 'src/common/constants';

@Injectable()
export class PathsService {
  constructor(
    @InjectRepository(Paths)
    private pathsRepository: Repository<Paths>,
  ) {}

  async getPaths(): Promise<string[]> {
    const config = await this.pathsRepository.findOne({
      where: {
        name: DBConfigConstants.paths,
      },
    });
    return config ? config.pathsArr : [];
  }
}
