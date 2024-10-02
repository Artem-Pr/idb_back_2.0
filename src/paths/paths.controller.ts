import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PathsService } from './paths.service';
import { ControllerPrefix } from 'src/common/constants';
import { CheckDirectoryInputDto } from './dto/check-directory-input.dto';
import { LogController } from 'src/logger/logger.decorator';

@Controller()
export class PathsController {
  constructor(private readonly pathsService: PathsService) {}

  @Get(ControllerPrefix.pathsOld)
  @LogController(ControllerPrefix.pathsOld)
  async getPathsOld() {
    return await this.pathsService.getPathsOld();
  }

  @Get(ControllerPrefix.paths)
  @LogController(ControllerPrefix.paths)
  async getPaths() {
    return await this.pathsService.getPaths();
  }

  @Get(ControllerPrefix.movePathsToNewCollection)
  @LogController(ControllerPrefix.movePathsToNewCollection)
  async movePathsToNewCollection() {
    return await this.pathsService.movePathsToNewCollection();
  }

  @Get(ControllerPrefix.checkDirectoryOld)
  @UsePipes(new ValidationPipe({ transform: true }))
  @LogController(ControllerPrefix.checkDirectoryOld)
  async checkDirectoryOld(@Query() query: CheckDirectoryInputDto) {
    return await this.pathsService.checkDirectoryOld(query.directory);
  }

  @Get(ControllerPrefix.checkDirectory)
  @UsePipes(new ValidationPipe({ transform: true }))
  @LogController(ControllerPrefix.checkDirectory)
  async checkDirectory(@Query() query: CheckDirectoryInputDto) {
    return await this.pathsService.checkDirectory(query.directory);
  }
}
