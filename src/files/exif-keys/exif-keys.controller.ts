import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ExifKeys } from './entities/exif-keys.entity';
import { ControllerMethodsPrefix } from 'src/common/constants';
import { LogController } from 'src/logger/logger.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SyncExifKeysOutputDto } from './dto/sync-exif-keys-output.dto';
// Modern imports: Use handlers and services directly
import { SyncExifKeysHandler } from './handlers/sync-exif-keys.handler';
import { ExifKeysQueryService } from './services/exif-keys-query.service';

/**
 * ExifKeys Controller - Modernized to use handlers directly
 *
 * This controller has been updated to use the new Command/Handler pattern
 * instead of the legacy monolithic service. This provides:
 * - Better separation of concerns
 * - Enhanced monitoring and events
 * - Improved testability
 * - Type-safe operations
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class ExifKeysController {
  constructor(
    private readonly syncHandler: SyncExifKeysHandler,
    private readonly queryService: ExifKeysQueryService,
  ) {}

  /**
   * Get all EXIF keys from the database
   * Uses the dedicated query service for read operations
   */
  @Get(ControllerMethodsPrefix.exifKeys)
  @LogController(ControllerMethodsPrefix.exifKeys)
  async getAllExifKeys(): Promise<ExifKeys[]> {
    return await this.queryService.getAllExifKeys();
  }

  /**
   * Synchronize EXIF keys from all media in the database
   * Uses the enhanced sync handler with events and metrics
   */
  @Post(ControllerMethodsPrefix.syncExifKeys)
  @LogController(ControllerMethodsPrefix.syncExifKeys)
  async syncExifKeys(): Promise<SyncExifKeysOutputDto> {
    // Use the modern handler with enhanced monitoring
    const result = await this.syncHandler.handle({
      batchSize: 500, // Default batch size
    });

    return {
      totalMediaProcessed: result.totalMediaProcessed,
      totalExifKeysDiscovered: result.totalExifKeysDiscovered,
      newExifKeysSaved: result.newExifKeysSaved,
      mediaWithoutExif: result.mediaWithoutExif,
      processingTimeMs: result.processingTimeMs,
      batchesProcessed: result.batchesProcessed,
      collectionCleared: result.collectionCleared,
    };
  }
}
