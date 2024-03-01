import { Controller, Get } from '@nestjs/common';
import { PathsService } from './paths.service';
import { ControllerPrefix } from 'src/common/constants';

@Controller(ControllerPrefix.paths)
export class PathsController {
  constructor(private readonly pathsService: PathsService) {}

  @Get()
  async getPaths() {
    return await this.pathsService.getPaths();
  }
}
