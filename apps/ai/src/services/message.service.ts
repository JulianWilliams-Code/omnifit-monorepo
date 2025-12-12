import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { PromptService } from './prompt.service';
import { UserAnalyticsService } from './analytics.service';
import { logger } from '../utils/logger';
import type { AIMessageType, AIMessage } from '@omnifit/shared';

export class MessageService {
  private openai: OpenAI;
  private prisma: PrismaClient;
  private promptService: PromptService;
  private analyticsService: UserAnalyticsService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.prisma = new PrismaClient();
    this.promptService = new PromptService();
    this.analyticsService = new UserAnalyticsService();
  }

  async generateMessage(
    userId: string,
    type: AIMessageType,
    context?: Record<string, any>
  ): Promise<AIMessage> {
    try {
      // Get user analytics for context
      const userAnalytics = await this.analyticsService.getUserAnalytics(userId);
      
      // Get appropriate prompt template
      const promptTemplate = await this.promptService.getPrompt(type);
      
      // Generate personalized prompt
      const personalizedPrompt = await this.promptService.personalizePrompt(
        promptTemplate,
        {
          ...userAnalytics,
          ...context,
        }
      );

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(type),
          },
          {
            role: 'user',
            content: personalizedPrompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content || '';

      // Save message to database
      const message = await this.prisma.aIMessage.create({
        data: {
          userId,
          type,
          content: content.trim(),
          context: context || {},
        },
      });

      logger.info(`Generated ${type} message for user ${userId}`);
      
      return message as AIMessage;
    } catch (error) {
      logger.error('Error generating AI message:', error);
      throw error;
    }
  }

  async getUserMessages(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: AIMessage[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    
    const [messages, total] = await Promise.all([
      this.prisma.aIMessage.findMany({
        where: { userId },
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.aIMessage.count({
        where: { userId },
      }),
    ]);

    return {
      messages: messages as AIMessage[],
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.prisma.aIMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  async markAsSent(messageId: string): Promise<void> {
    await this.prisma.aIMessage.update({
      where: { id: messageId },
      data: { sentAt: new Date() },
    });
  }

  private getSystemPrompt(type: AIMessageType): string {
    const basePrompt = `You are an AI coach for OmniFit, a faith-based fitness platform that rewards users with blockchain tokens for spiritual and physical activities. 
    
    Your responses should be:
    - Encouraging and motivational
    - Faith-centered and respectful of all denominations
    - Focused on both spiritual and physical wellness
    - Personalized based on user data
    - Concise (under 200 words)
    - Include relevant emojis where appropriate`;

    switch (type) {
      case 'DAILY_MOTIVATION':
        return `${basePrompt}
        
        You're providing a daily motivational message to help the user start their day with purpose and energy.`;

      case 'STREAK_ENCOURAGEMENT':
        return `${basePrompt}
        
        You're encouraging the user to maintain their activity streak. Focus on the progress they've made and motivate them to continue.`;

      case 'MILESTONE_CELEBRATION':
        return `${basePrompt}
        
        You're celebrating a milestone the user has achieved. Make them feel accomplished and proud of their journey.`;

      case 'PARTNER_RECOMMENDATION':
        return `${basePrompt}
        
        You're recommending partner offers or services based on the user's activity and interests.`;

      default:
        return basePrompt;
    }
  }
}