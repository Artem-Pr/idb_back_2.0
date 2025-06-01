import {
  Controller,
  Delete,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { PathsService } from './paths.service';
import { ControllerMethodsPrefix } from 'src/common/constants';
import { LogController } from 'src/logger/logger.decorator';
import type { CheckDirectoryOutputDto } from './dto/check-directory-output.dto';
import type { CheckDirectoryInputDto } from './dto/check-directory-input.dto';
import type { DeleteDirectoryOutputDto } from './dto/delete-directory-output.dto';
import type { DeleteDirectoryInputDto } from './dto/delete-directory-input.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class PathsController {
  constructor(private readonly pathsService: PathsService) {}

  @Get(ControllerMethodsPrefix.pathsOld)
  @LogController(ControllerMethodsPrefix.pathsOld)
  async getPathsOld() {
    return await this.pathsService.getAllPathsFromDBoLD();
  }

  @Get(ControllerMethodsPrefix.paths)
  @LogController(ControllerMethodsPrefix.paths)
  async getPaths() {
    return await this.pathsService.getAllPathsFromDB();
  }

  @Get(ControllerMethodsPrefix.movePathsToNewCollection)
  @LogController(ControllerMethodsPrefix.movePathsToNewCollection)
  async movePathsToNewCollection() {
    return await this.pathsService.movePathsToNewCollection();
  }

  @Get(ControllerMethodsPrefix.checkDirectoryOld)
  @UsePipes(new ValidationPipe({ transform: true }))
  @LogController(ControllerMethodsPrefix.checkDirectoryOld)
  async checkDirectoryOld(@Query() query: CheckDirectoryInputDto) {
    return await this.pathsService.checkDirectoryOld(query.directory);
  }

  @Get(ControllerMethodsPrefix.checkDirectory)
  @UsePipes(new ValidationPipe({ transform: true }))
  @LogController(ControllerMethodsPrefix.checkDirectory)
  async checkDirectory(
    @Query() query: CheckDirectoryInputDto,
  ): Promise<CheckDirectoryOutputDto> {
    return await this.pathsService.checkDirectory(query.directory);
  }

  @Delete(ControllerMethodsPrefix.directory)
  @LogController(ControllerMethodsPrefix.directory)
  async deleteDirectory(
    @Query() query: DeleteDirectoryInputDto,
  ): Promise<DeleteDirectoryOutputDto> {
    return await this.pathsService.deleteDirectory(query.directory);
  }
}
