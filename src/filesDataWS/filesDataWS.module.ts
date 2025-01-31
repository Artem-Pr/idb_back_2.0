import { Module } from '@nestjs/common';
import { FilesModule } from 'src/files/files.module';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import { SyncPreviewsWSService } from './syncPreviewsWS.service';
import { CreatePreviewsWSService } from './createPreviewsWS.service';
import { BullModule } from '@nestjs/bull';
import { Processors } from 'src/common/constants';
import { UpdateExifWSService } from './updateExifWS.service';

@Module({
  imports: [
    FilesModule,
    BullModule.registerQueue(
      { name: Processors.fileProcessor },
      { name: Processors.exifProcessor },
    ),
  ],
  providers: [
    SyncPreviewsWSService,
    CreatePreviewsWSService,
    UpdateExifWSService,
    FilesDataWSGateway,
  ],
  exports: [
    SyncPreviewsWSService,
    CreatePreviewsWSService,
    UpdateExifWSService,
  ],
})
export class FilesDataWSModule {}
