import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async trackEvent(eventData: any): Promise<void> {
    try {
      // Store analytics event
      await this.prisma.auditLog.create({
        data: {
          userId: eventData.userId || 'system',
          action: 'ANALYTICS_EVENT',
          resource: 'Analytics',
          resourceId: eventData.event,
          metadata: {
            event_name: eventData.event,
            properties: eventData.properties,
            source: eventData.source,
            timestamp: eventData.timestamp,
          },
        },
      });

      this.logger.log(`Analytics event tracked: ${eventData.event}`);
    } catch (error) {
      this.logger.error('Failed to track analytics event:', error);
      throw error;
    }
  }

  async sendMetrics(metricsData: any): Promise<void> {
    try {
      // Store metrics data
      // TODO: Add SystemMetrics model to schema if needed
      await this.prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'METRICS_RECEIVED',
          resource: 'Metrics',
          resourceId: metricsData.metric,
          metadata: {
            metric_name: metricsData.metric,
            data: metricsData.data,
            timestamp: metricsData.timestamp,
          },
        },
      });

      this.logger.log(`Metrics received: ${metricsData.metric}`);
    } catch (error) {
      this.logger.error('Failed to send metrics:', error);
      throw error;
    }
  }

  async getSummary(timeframe: string): Promise<any> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get basic stats
      const [totalUsers, activeUsers, totalEvents, totalRewards] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            updatedAt: {
              gte: startDate,
            },
          },
        }),
        this.prisma.event.count({
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }),
        this.prisma.reward.count({
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }),
      ]);

      return {
        timeframe,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString(),
        },
        metrics: {
          total_users: totalUsers,
          active_users: activeUsers,
          new_events: totalEvents,
          rewards_given: totalRewards,
        },
        generated_at: now.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get analytics summary:', error);
      throw error;
    }
  }

  async getDailyStats(): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [dailyActiveUsers, dailyEvents, dailyRewards] = await Promise.all([
        this.prisma.user.count({
          where: {
            updatedAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.event.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.reward.aggregate({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
          _sum: {
            amount: true,
          },
          _count: true,
        }),
      ]);

      return {
        date: today.toISOString().split('T')[0],
        daily_active_users: dailyActiveUsers,
        events_created: dailyEvents,
        rewards: {
          count: dailyRewards._count,
          total_tokens: dailyRewards._sum.amount || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get daily stats:', error);
      throw error;
    }
  }

  async getWeeklyStats(): Promise<any> {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [weeklyActiveUsers, weeklyEvents, weeklyRewards, topCategories] = await Promise.all([
        this.prisma.user.count({
          where: {
            updatedAt: {
              gte: weekAgo,
            },
          },
        }),
        this.prisma.event.count({
          where: {
            createdAt: {
              gte: weekAgo,
            },
          },
        }),
        this.prisma.reward.aggregate({
          where: {
            createdAt: {
              gte: weekAgo,
            },
          },
          _sum: {
            amount: true,
          },
          _count: true,
        }),
        this.prisma.event.groupBy({
          by: ['category'],
          where: {
            createdAt: {
              gte: weekAgo,
            },
          },
          _count: {
            category: true,
          },
          orderBy: {
            _count: {
              category: 'desc',
            },
          },
          take: 5,
        }),
      ]);

      return {
        week_ending: now.toISOString().split('T')[0],
        weekly_active_users: weeklyActiveUsers,
        events_created: weeklyEvents,
        rewards: {
          count: weeklyRewards._count,
          total_tokens: weeklyRewards._sum.amount || 0,
        },
        top_categories: topCategories.map(cat => ({
          category: cat.category,
          count: cat._count.category,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get weekly stats:', error);
      throw error;
    }
  }
}