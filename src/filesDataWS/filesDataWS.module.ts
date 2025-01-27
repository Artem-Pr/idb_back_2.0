import { Module } from '@nestjs/common';
import { FilesModule } from 'src/files/files.module';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import { SyncPreviewsWSService } from './syncPreviewsWS.service';
import { CreatePreviewsWSService } from './createPreviewsWS.service';
import { BullModule } from '@nestjs/bull';
import { Processors } from 'src/common/constants';

@Module({
  imports: [
    FilesModule,
    BullModule.registerQueue({ name: Processors.fileProcessor }),
  ],
  providers: [
    SyncPreviewsWSService,
    CreatePreviewsWSService,
    FilesDataWSGateway,
  ],
  exports: [SyncPreviewsWSService, CreatePreviewsWSService],
})
export class FilesDataWSModule {}
