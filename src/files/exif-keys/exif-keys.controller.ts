import { Controller, Get, UseGuards } from '@nestjs/common';
import { ExifKeysService } from './exif-keys.service';
import { ExifKeys } from './entities/exif-keys.entity';
import { ControllerMethodsPrefix } from 'src/common/constants';
import { LogController } from 'src/logger/logger.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExifKeysController {
  constructor(private readonly exifKeysService: ExifKeysService) {}

  @Get(ControllerMethodsPrefix.exifKeys)
  @LogController(ControllerMethodsPrefix.exifKeys)
  async getAllExifKeys(): Promise<ExifKeys[]> {
    return await this.exifKeysService.getAllExifKeys();
  }
}
