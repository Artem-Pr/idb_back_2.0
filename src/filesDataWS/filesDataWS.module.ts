import { Module } from '@nestjs/common';
import { FilesModule } from 'src/files/files.module';
import { FilesDataWSGateway } from './filesDataWS.gateway';
import { SyncPreviewsWSService } from './syncPreviewsWS.service';

@Module({
  imports: [FilesModule],
  providers: [SyncPreviewsWSService, FilesDataWSGateway],
  exports: [SyncPreviewsWSService],
})
export class FilesDataWSModule {}
