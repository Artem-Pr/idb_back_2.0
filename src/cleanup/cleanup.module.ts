import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { BlacklistedToken } from '../auth/entities/blacklisted-token.entity';
import { CleanupService } from './cleanup.service';
import { QueueModule } from '../queue/queue.module';
import { Processors } from 'src/common/constants';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({
      name: Processors.cleanupProcessor,
    }),
    TypeOrmModule.forFeature([RefreshToken, BlacklistedToken]),
  ],
  providers: [CleanupService],
})
export class CleanupModule {}
