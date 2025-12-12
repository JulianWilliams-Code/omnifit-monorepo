import axios from 'axios';

export class AnalyticsConnector {
  private backendUrl: string;

  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  }

  async trackEvent(eventName: string, properties: Record<string, any>): Promise<void> {
    try {
      await axios.post(`${this.backendUrl}/api/analytics/event`, {
        event: eventName,
        properties,
        timestamp: new Date().toISOString(),
        source: 'ai-service'
      });
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  async sendMetrics(metricName: string, data: Record<string, any>): Promise<void> {
    try {
      await axios.post(`${this.backendUrl}/api/analytics/metrics`, {
        metric: metricName,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }

  async getDailyUserStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.backendUrl}/api/analytics/daily-stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get daily user stats:', error);
      return {};
    }
  }

  async getWeeklyStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.backendUrl}/api/analytics/weekly-stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get weekly stats:', error);
      return {};
    }
  }
}