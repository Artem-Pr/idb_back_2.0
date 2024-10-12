import {
  Controller,
  Delete,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PathsService } from './paths.service';
import { ControllerPrefix } from 'src/common/constants';
import { LogController } from 'src/logger/logger.decorator';
import type { CheckDirectoryOutputDto } from './dto/check-directory-output.dto';
import type { CheckDirectoryInputDto } from './dto/check-directory-input.dto';
import type { DeleteDirectoryOutputDto } from './dto/delete-directory-output.dto';
import type { DeleteDirectoryInputDto } from './dto/delete-directory-input.dto';

@Controller()
export class PathsController {
  constructor(private readonly pathsService: PathsService) {}

  @Get(ControllerPrefix.pathsOld)
  @LogController(ControllerPrefix.pathsOld)
  async getPathsOld() {
    return await this.pathsService.getAllPathsFromDBoLD();
  }

  @Get(ControllerPrefix.paths)
  @LogController(ControllerPrefix.paths)
  async getPaths() {
    return await this.pathsService.getAllPathsFromDB();
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
  async checkDirectory(
    @Query() query: CheckDirectoryInputDto,
  ): Promise<CheckDirectoryOutputDto> {
    return await this.pathsService.checkDirectory(query.directory);
  }

  @Delete(ControllerPrefix.directory)
  @LogController(ControllerPrefix.directory)
  async deleteDirectory(
    @Query() query: DeleteDirectoryInputDto,
  ): Promise<DeleteDirectoryOutputDto> {
    return await this.pathsService.deleteDirectory(query.directory);
  }
}
