import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardEngineService } from './reward-engine.service';
import { RewardQueueService } from './reward-queue.service';
import { RewardAuditService } from './reward-audit.service';
import { RewardsController } from './rewards.controller';
import { RewardsAdminController } from './rewards-admin.controller';
import { MintRequestService } from './mint-request.service';

@Module({
  imports: [PrismaModule],
  controllers: [RewardsController, RewardsAdminController],
  providers: [
    RewardEngineService,
    RewardQueueService,
    RewardAuditService,
    MintRequestService
  ],
  exports: [
    RewardEngineService,
    RewardQueueService,
    RewardAuditService,
    MintRequestService
  ]
})
export class RewardsModule {}