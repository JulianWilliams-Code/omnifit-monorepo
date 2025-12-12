import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnershipsController } from './partnerships.controller';
import { PartnershipsService } from './partnerships.service';
import { EventApprovalsController } from './event-approvals.controller';
import { EventApprovalsService } from './event-approvals.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [PrismaModule],
  controllers: [PartnershipsController, EventApprovalsController, PlansController],
  providers: [PartnershipsService, EventApprovalsService, PlansService, NotificationService],
  exports: [PartnershipsService, EventApprovalsService, PlansService, NotificationService],
})
export class PartnershipsModule {}