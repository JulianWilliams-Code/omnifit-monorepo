import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('event')
  async trackEvent(@Body() eventData: any) {
    try {
      this.logger.log('Tracking analytics event:', eventData.event);
      await this.analyticsService.trackEvent(eventData);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to track event:', error);
      throw error;
    }
  }

  @Post('metrics')
  async sendMetrics(@Body() metricsData: any) {
    try {
      this.logger.log('Receiving metrics:', metricsData.metric);
      await this.analyticsService.sendMetrics(metricsData);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send metrics:', error);
      throw error;
    }
  }

  @Get('summary')
  async getSummary(@Query('timeframe') timeframe?: string) {
    try {
      const summary = await this.analyticsService.getSummary(timeframe || 'week');
      return summary;
    } catch (error) {
      this.logger.error('Failed to get analytics summary:', error);
      throw error;
    }
  }

  @Get('daily-stats')
  async getDailyStats() {
    try {
      const stats = await this.analyticsService.getDailyStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get daily stats:', error);
      throw error;
    }
  }

  @Get('weekly-stats')
  async getWeeklyStats() {
    try {
      const stats = await this.analyticsService.getWeeklyStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get weekly stats:', error);
      throw error;
    }
  }
}