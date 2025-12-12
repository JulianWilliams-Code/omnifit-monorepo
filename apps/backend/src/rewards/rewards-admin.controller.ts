import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RewardEngineService } from './reward-engine.service';
import { RewardQueueService } from './reward-queue.service';
import { MintRequestService } from './mint-request.service';
import { RewardAuditService } from './reward-audit.service';

interface CreateRewardRuleDto {
  name: string;
  description: string;
  conditions: any;
  baseAmount: number;
  multiplierRules?: any[];
  maxDailyAmount?: number;
  maxUserAmount?: number;
  validFrom?: string;
  validTo?: string;
}

@Controller('admin/rewards')
@UseGuards(JwtAuthGuard)
export class RewardsAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardEngine: RewardEngineService,
    private readonly queueService: RewardQueueService,
    private readonly mintRequestService: MintRequestService,
    private readonly auditService: RewardAuditService
  ) {}

  private async checkAdminAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('mint-requests/pending')
  async getPendingMintRequests(@Request() req: any) {
    await this.checkAdminAccess(req.user.id);

    const requests = await this.mintRequestService.getPendingMintRequests(req.user.id);
    
    return {
      data: requests,
      count: requests.length,
      summary: {
        adminReview: requests.filter(r => r.status === 'ADMIN_REVIEW').length,
        queued: requests.filter(r => r.status === 'QUEUED').length,
        approved: requests.filter(r => r.status === 'APPROVED').length,
        totalValue: requests.reduce((sum, r) => sum + r.tokenAmount, 0)
      }
    };
  }

  @Put('mint-requests/:id/approve')
  async approveMintRequest(
    @Request() req: any,
    @Param('id') mintRequestId: string,
    @Body() approvalData: { notes?: string }
  ) {
    await this.checkAdminAccess(req.user.id);

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.mintRequestService.approveMintRequest(
      mintRequestId,
      req.user.id,
      approvalData.notes,
      ipAddress,
      userAgent
    );

    return {
      success: true,
      data: result,
      message: 'Mint request approved successfully'
    };
  }

  @Put('mint-requests/:id/reject')
  async rejectMintRequest(
    @Request() req: any,
    @Param('id') mintRequestId: string,
    @Body() rejectionData: { reason: string }
  ) {
    await this.checkAdminAccess(req.user.id);

    if (!rejectionData.reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.mintRequestService.rejectMintRequest(
      mintRequestId,
      req.user.id,
      rejectionData.reason,
      ipAddress,
      userAgent
    );

    return {
      success: true,
      data: result,
      message: 'Mint request rejected successfully'
    };
  }

  @Get('rules')
  async getRewardRules(
    @Request() req: any,
    @Query('active') active?: string
  ) {
    await this.checkAdminAccess(req.user.id);

    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    const rules = await this.rewardEngine.getRewardRules(isActive);

    return { data: rules };
  }

  @Post('rules')
  async createRewardRule(
    @Request() req: any,
    @Body() ruleData: CreateRewardRuleDto
  ) {
    await this.checkAdminAccess(req.user.id);

    const rule = await this.rewardEngine.createRewardRule({
      ...ruleData,
      validFrom: ruleData.validFrom ? new Date(ruleData.validFrom) : undefined,
      validTo: ruleData.validTo ? new Date(ruleData.validTo) : undefined,
      createdBy: req.user.id
    });

    // Audit the rule creation
    await this.auditService.logRuleChange(
      req.user.id,
      'rule_created',
      rule.id,
      null,
      ruleData,
      req.ip,
      req.get('user-agent')
    );

    return {
      success: true,
      data: rule,
      message: 'Reward rule created successfully'
    };
  }

  @Put('rules/:id')
  async updateRewardRule(
    @Request() req: any,
    @Param('id') ruleId: string,
    @Body() updates: Partial<CreateRewardRuleDto>
  ) {
    await this.checkAdminAccess(req.user.id);

    // Get existing rule for audit
    const existingRule = await this.prisma.rewardRule.findUnique({
      where: { id: ruleId }
    });

    if (!existingRule) {
      throw new BadRequestException('Reward rule not found');
    }

    const updatedRule = await this.rewardEngine.updateRewardRule(ruleId, updates);

    // Audit the rule change
    await this.auditService.logRuleChange(
      req.user.id,
      'rule_updated',
      ruleId,
      existingRule,
      updates,
      req.ip,
      req.get('user-agent')
    );

    return {
      success: true,
      data: updatedRule,
      message: 'Reward rule updated successfully'
    };
  }

  @Get('queue/stats')
  async getQueueStats(@Request() req: any) {
    await this.checkAdminAccess(req.user.id);

    const stats = await this.queueService.getQueueStats();
    
    return { data: stats };
  }

  @Get('queue/failed')
  async getFailedJobs(
    @Request() req: any,
    @Query('limit') limit?: string
  ) {
    await this.checkAdminAccess(req.user.id);

    const limitNum = parseInt(limit || '10');
    const failedJobs = await this.queueService.getFailedJobs(limitNum);

    return { data: failedJobs };
  }

  @Post('queue/retry/:jobId')
  async retryFailedJob(
    @Request() req: any,
    @Param('jobId') jobId: string
  ) {
    await this.checkAdminAccess(req.user.id);

    await this.queueService.retryFailedJob(jobId);

    return {
      success: true,
      message: 'Job retry initiated'
    };
  }

  @Post('queue/clean')
  async cleanCompletedJobs(@Request() req: any) {
    await this.checkAdminAccess(req.user.id);

    await this.queueService.clearCompletedJobs();

    return {
      success: true,
      message: 'Completed jobs cleaned'
    };
  }

  @Get('analytics/overview')
  async getRewardAnalytics(
    @Request() req: any,
    @Query('days') days?: string
  ) {
    await this.checkAdminAccess(req.user.id);

    const daysNum = parseInt(days || '30');
    const dateFrom = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const [
      totalRewards,
      recentActivity,
      topUsers,
      rewardsByType,
      dailyStats
    ] = await Promise.all([
      // Total rewards
      this.prisma.reward.aggregate({
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Recent activity
      this.prisma.reward.aggregate({
        where: { earnedAt: { gte: dateFrom } },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Top users by tokens
      this.prisma.reward.groupBy({
        by: ['userId'],
        where: { earnedAt: { gte: dateFrom } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      }),

      // Rewards by type
      this.prisma.reward.groupBy({
        by: ['type'],
        where: { earnedAt: { gte: dateFrom } },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Daily distribution
      this.prisma.$queryRaw`
        SELECT 
          DATE("earnedAt") as date,
          COUNT(*)::integer as count,
          SUM(amount)::integer as total_amount
        FROM rewards
        WHERE "earnedAt" >= ${dateFrom}
        GROUP BY DATE("earnedAt")
        ORDER BY date DESC
        LIMIT 30
      `
    ]);

    return {
      overview: {
        totalTokensIssued: totalRewards._sum.amount || 0,
        totalRewards: totalRewards._count._all || 0,
        recentTokens: recentActivity._sum.amount || 0,
        recentRewards: recentActivity._count._all || 0
      },
      topUsers,
      rewardsByType,
      dailyStats,
      timeframe: `${daysNum} days`
    };
  }

  @Get('audit')
  async getAuditTrail(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    await this.checkAdminAccess(req.user.id);

    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '50');

    const filters: any = {};
    if (resource) filters.resource = resource;
    if (action) filters.action = action;
    if (userId) filters.userId = userId;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    const result = await this.auditService.getAuditTrail(filters, pageNum, limitNum);

    return result;
  }

  @Post('test-rule/:ruleId')
  async testRule(
    @Request() req: any,
    @Param('ruleId') ruleId: string,
    @Body() testData: { eventId: string; userId: string }
  ) {
    await this.checkAdminAccess(req.user.id);

    const event = await this.prisma.event.findUnique({
      where: { id: testData.eventId }
    });

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const result = await this.rewardEngine.testRuleAgainstEvent(
      ruleId,
      event,
      testData.userId
    );

    return {
      success: true,
      data: result
    };
  }

  @Get('metrics')
  async getSystemMetrics(@Request() req: any) {
    await this.checkAdminAccess(req.user.id);

    const [
      queueStats,
      pendingMints,
      recentErrors
    ] = await Promise.all([
      this.queueService.getQueueStats(),
      this.prisma.mintRequest.count({
        where: { status: { in: ['QUEUED', 'ADMIN_REVIEW'] } }
      }),
      this.prisma.rewardJob.count({
        where: { 
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    return {
      queue: queueStats,
      pendingMints,
      recentErrors,
      health: {
        status: recentErrors === 0 ? 'healthy' : recentErrors < 10 ? 'warning' : 'error',
        message: recentErrors === 0 
          ? 'All systems operational'
          : `${recentErrors} failed jobs in last 24h`
      }
    };
  }
}