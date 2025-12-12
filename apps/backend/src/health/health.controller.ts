import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async healthCheck() {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          api: 'up',
        },
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down',
          api: 'up',
        },
        error: error.message,
      };
    }
  }

  @Get('metrics')
  async getMetrics() {
    try {
      // Basic system metrics for monitoring
      const [userCount, eventCount, rewardCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.event.count(),
        this.prisma.reward.count(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        metrics: {
          total_users: userCount,
          total_events: eventCount,
          total_rewards: rewardCount,
        },
        system: {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          cpu_usage: process.cpuUsage(),
        },
      };
    } catch (error) {
      throw error;
    }
  }
}