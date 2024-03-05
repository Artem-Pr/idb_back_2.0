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

@Controller()
export class PathsController {
  constructor(private readonly pathsService: PathsService) {}

  @Get(ControllerPrefix.paths)
  async getPaths() {
    return await this.pathsService.getPaths();
  }

  @Get(ControllerPrefix.checkDirectory)
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkDirectory(@Query() query: CheckDirectoryInputDto) {
    return await this.pathsService.checkDirectory(query.directory);
  }
}
