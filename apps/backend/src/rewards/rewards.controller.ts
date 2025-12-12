import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  Request,
  Query,
  BadRequestException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MintRequestService } from './mint-request.service';
import { RewardAuditService } from './reward-audit.service';

interface ClaimRewardsDto {
  rewardIds: string[];
  recipientWallet: string;
}

@Controller('rewards')
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mintRequestService: MintRequestService,
    private readonly auditService: RewardAuditService
  ) {}

  @Get()
  async getUserRewards(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    const userId = req.user.id;
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    
    const where: any = { userId };
    if (status) where.status = status;

    const skip = (pageNum - 1) * limitNum;

    const [rewards, total, totalTokens] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { earnedAt: 'desc' },
        include: {
          event: {
            select: { title: true, type: true, completedAt: true }
          }
        }
      }),
      this.prisma.reward.count({ where }),
      this.prisma.reward.aggregate({
        where: { userId, status: { in: ['APPROVED', 'CLAIMED'] } },
        _sum: { amount: true }
      })
    ]);

    const claimableRewards = rewards.filter(r => r.status === 'APPROVED');
    const claimableAmount = claimableRewards.reduce((sum, r) => sum + r.amount, 0);

    return {
      data: rewards,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      summary: {
        totalTokensEarned: totalTokens._sum.amount || 0,
        claimableTokens: claimableAmount,
        claimableRewardsCount: claimableRewards.length
      }
    };
  }

  @Get('claimable')
  async getClaimableRewards(@Request() req: any) {
    const userId = req.user.id;

    const rewards = await this.prisma.reward.findMany({
      where: {
        userId,
        status: 'APPROVED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { earnedAt: 'desc' },
      include: {
        event: {
          select: { title: true, type: true, completedAt: true }
        }
      }
    });

    const totalAmount = rewards.reduce((sum, reward) => sum + reward.amount, 0);

    // Group by type for better UX
    const groupedRewards = rewards.reduce((acc: any, reward) => {
      const type = reward.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(reward);
      return acc;
    }, {});

    return {
      rewards,
      groupedRewards,
      totalClaimable: totalAmount,
      count: rewards.length
    };
  }

  @Post('claim')
  async claimRewards(
    @Request() req: any,
    @Body() claimData: ClaimRewardsDto
  ) {
    const userId = req.user.id;
    const { rewardIds, recipientWallet } = claimData;

    if (!rewardIds || rewardIds.length === 0) {
      throw new BadRequestException('No rewards selected for claiming');
    }

    if (!recipientWallet) {
      throw new BadRequestException('Recipient wallet address is required');
    }

    // Get client IP and user agent for audit
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.mintRequestService.createMintRequest(
      userId,
      rewardIds,
      recipientWallet,
      ipAddress,
      userAgent
    );

    return {
      success: true,
      data: result,
      message: result.requiresReview
        ? 'Claim request submitted for admin review due to risk factors'
        : 'Claim request submitted successfully'
    };
  }

  @Get('mint-requests')
  async getUserMintRequests(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const userId = req.user.id;
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '10');

    const result = await this.mintRequestService.getUserMintRequests(
      userId,
      pageNum,
      limitNum
    );

    return result;
  }

  @Get('stats')
  async getUserRewardStats(@Request() req: any) {
    const userId = req.user.id;

    const [
      totalStats,
      recentActivity,
      streakRewards,
      monthlySummary
    ] = await Promise.all([
      // Total reward stats
      this.prisma.reward.aggregate({
        where: { userId },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Recent activity (last 30 days)
      this.prisma.reward.aggregate({
        where: {
          userId,
          earnedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Streak rewards
      this.prisma.reward.aggregate({
        where: { userId, type: 'STREAK' },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // Monthly breakdown
      this.prisma.reward.groupBy({
        by: ['type'],
        where: {
          userId,
          earnedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _sum: { amount: true },
        _count: { _all: true }
      })
    ]);

    return {
      total: {
        tokens: totalStats._sum.amount || 0,
        rewards: totalStats._count._all || 0
      },
      recent: {
        tokens: recentActivity._sum.amount || 0,
        rewards: recentActivity._count._all || 0
      },
      streaks: {
        tokens: streakRewards._sum.amount || 0,
        count: streakRewards._count._all || 0
      },
      breakdown: monthlySummary.map(item => ({
        type: item.type,
        tokens: item._sum.amount || 0,
        count: item._count._all || 0
      }))
    };
  }

  @Get('history')
  async getRewardHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const userId = req.user.id;
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');

    const where: any = { userId };
    
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.earnedAt = {};
      if (dateFrom) where.earnedAt.gte = new Date(dateFrom);
      if (dateTo) where.earnedAt.lte = new Date(dateTo);
    }

    const skip = (pageNum - 1) * limitNum;

    const [rewards, total] = await Promise.all([
      this.prisma.reward.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { earnedAt: 'desc' },
        include: {
          event: {
            select: { 
              title: true, 
              type: true, 
              category: true,
              completedAt: true,
              duration: true
            }
          }
        }
      }),
      this.prisma.reward.count({ where })
    ]);

    return {
      data: rewards,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Request() req: any,
    @Query('timeframe') timeframe?: string, // 'week', 'month', 'all'
    @Query('limit') limit?: string
  ) {
    const limitNum = parseInt(limit || '10');
    const currentUserId = req.user.id;

    let dateFilter = {};
    if (timeframe === 'week') {
      dateFilter = {
        earnedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      };
    } else if (timeframe === 'month') {
      dateFilter = {
        earnedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      };
    }

    const leaderboard = await this.prisma.reward.groupBy({
      by: ['userId'],
      where: dateFilter,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limitNum
    });

    // Get user details for leaderboard
    const userIds = leaderboard.map(entry => entry.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, firstName: true, lastName: true }
    });

    const userMap = users.reduce((acc: any, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const leaderboardWithUsers = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      user: userMap[entry.userId],
      totalTokens: entry._sum.amount || 0,
      totalRewards: entry._count._all || 0,
      isCurrentUser: entry.userId === currentUserId
    }));

    // Find current user's position if not in top list
    let currentUserRank = null;
    const currentUserEntry = leaderboardWithUsers.find(entry => entry.isCurrentUser);
    if (!currentUserEntry) {
      // Find user's actual rank
      const userRankResult = await this.prisma.$queryRaw<[{ rank: number }]>`
        WITH user_totals AS (
          SELECT 
            "userId",
            SUM(amount) as total_tokens
          FROM rewards
          WHERE ${Object.keys(dateFilter).length > 0 ? 
            this.prisma.$queryRaw`"earnedAt" >= ${dateFilter.earnedAt?.gte}` : 
            this.prisma.$queryRaw`true`}
          GROUP BY "userId"
          ORDER BY total_tokens DESC
        ),
        ranked_users AS (
          SELECT 
            "userId",
            total_tokens,
            ROW_NUMBER() OVER (ORDER BY total_tokens DESC) as rank
          FROM user_totals
        )
        SELECT rank::integer
        FROM ranked_users
        WHERE "userId" = ${currentUserId}
      `;

      if (userRankResult.length > 0) {
        currentUserRank = userRankResult[0].rank;
      }
    }

    return {
      leaderboard: leaderboardWithUsers,
      timeframe: timeframe || 'all',
      currentUser: currentUserEntry || {
        rank: currentUserRank,
        userId: currentUserId,
        user: userMap[currentUserId],
        isCurrentUser: true
      }
    };
  }
}