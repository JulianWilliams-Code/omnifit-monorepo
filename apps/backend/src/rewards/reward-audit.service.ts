import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RewardAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logRewardProcessing(
    userId: string,
    action: string,
    metadata: any,
    triggeredBy?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return await this.prisma.rewardAudit.create({
      data: {
        userId,
        action,
        resource: 'reward',
        resourceId: metadata.rewardId || metadata.jobId || '',
        newValues: metadata,
        triggeredBy: triggeredBy || 'system',
        metadata,
        ipAddress,
        userAgent
      }
    });
  }

  async logMintRequest(
    userId: string,
    action: string,
    mintRequestId: string,
    metadata: any,
    triggeredBy?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return await this.prisma.rewardAudit.create({
      data: {
        userId,
        action,
        resource: 'mint_request',
        resourceId: mintRequestId,
        newValues: metadata,
        triggeredBy: triggeredBy || userId,
        metadata,
        ipAddress,
        userAgent
      }
    });
  }

  async logRuleChange(
    adminId: string,
    action: string,
    ruleId: string,
    oldValues: any,
    newValues: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    return await this.prisma.rewardAudit.create({
      data: {
        userId: adminId,
        action,
        resource: 'reward_rule',
        resourceId: ruleId,
        oldValues,
        newValues,
        triggeredBy: adminId,
        ipAddress,
        userAgent
      }
    });
  }

  async getAuditTrail(
    filters: {
      userId?: string;
      resource?: string;
      action?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    page = 1,
    limit = 50
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [auditEntries, total] = await Promise.all([
      this.prisma.rewardAudit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.rewardAudit.count({ where })
    ]);

    return {
      data: auditEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}