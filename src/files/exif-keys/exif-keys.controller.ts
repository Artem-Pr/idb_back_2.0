import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ExifKeysService } from './exif-keys.service';
import { ExifKeys } from './entities/exif-keys.entity';
import { ControllerMethodsPrefix } from 'src/common/constants';
import { LogController } from 'src/logger/logger.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SyncExifKeysOutputDto } from './dto/sync-exif-keys-output.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExifKeysController {
  constructor(private readonly exifKeysService: ExifKeysService) {}

  @Get(ControllerMethodsPrefix.exifKeys)
  @LogController(ControllerMethodsPrefix.exifKeys)
  async getAllExifKeys(): Promise<ExifKeys[]> {
    return await this.exifKeysService.getAllExifKeys();
  }

  @Post(ControllerMethodsPrefix.syncExifKeys)
  @LogController(ControllerMethodsPrefix.syncExifKeys)
  async syncExifKeys(): Promise<SyncExifKeysOutputDto> {
    return await this.exifKeysService.syncExifKeysFromAllMedia();
  }
}
