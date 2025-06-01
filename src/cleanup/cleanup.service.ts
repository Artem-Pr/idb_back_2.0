import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { BlacklistedToken } from '../auth/entities/blacklisted-token.entity';
import { Processors } from 'src/common/constants';

const CLEANUP_REFRESH_TOKENS_JOB_NAME = 'cleanup-refresh-tokens';
const CLEANUP_BLACKLISTED_TOKENS_JOB_NAME = 'cleanup-blacklisted-tokens';

@Injectable()
@Processor(Processors.cleanupProcessor)
export class CleanupService implements OnModuleInit {
  constructor(
    @InjectQueue(Processors.cleanupProcessor) private cleanupQueue: Queue,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(BlacklistedToken)
    private blacklistedTokenRepository: Repository<BlacklistedToken>,
  ) {}

  async onModuleInit() {
    // Schedule cleanup jobs to run every Sunday at midnight
    await this.cleanupQueue.add(
      CLEANUP_REFRESH_TOKENS_JOB_NAME,
      {},
      {
        repeat: {
          cron: '0 0 * * 0', // Run at midnight every Sunday
        },
      },
    );

    await this.cleanupQueue.add(
      CLEANUP_BLACKLISTED_TOKENS_JOB_NAME,
      {},
      {
        repeat: {
          cron: '0 0 * * 0', // Run at midnight every Sunday
        },
      },
    );
  }

  @Process(CLEANUP_REFRESH_TOKENS_JOB_NAME)
  async handleCleanupRefreshTokens() {
    const now = new Date();
    await this.refreshTokenRepository.delete({
      $or: [{ expiresAt: { $lt: now } }, { isRevoked: true }],
    } as any);
  }

  @Process(CLEANUP_BLACKLISTED_TOKENS_JOB_NAME)
  async handleCleanupBlacklistedTokens() {
    await this.blacklistedTokenRepository.delete({});
  }
}
