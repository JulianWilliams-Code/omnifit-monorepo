import { PrismaClient } from '@omnifit/db';
import OpenAI from 'openai';

export class AccountabilityService {
  private readonly prisma: PrismaClient;
  private readonly openai: OpenAI;

  constructor() {
    this.prisma = new PrismaClient();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateDailySummary(
    userId: string,
    date: Date,
    forceRegenerate: boolean = false
  ) {
    // Check if summary already exists for this date
    const existingSummary = await this.prisma.dailySummary.findFirst({
      where: {
        userId,
        date: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
    });

    if (existingSummary && !forceRegenerate) {
      return existingSummary;
    }

    // Get user's events for the day
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    const events = await this.prisma.event.findMany({
      where: {
        userId,
        createdAt: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      include: {
        eventApproval: true,
      },
    });

    // Get user's active plans
    const activePlans = await this.prisma.plan.findMany({
      where: {
        OR: [
          { createdBy: userId },
          // TODO: Add target user relation when implemented
        ],
        status: 'ACTIVE',
        startDate: { lte: date },
        OR: [
          { endDate: null },
          { endDate: { gte: date } },
        ],
      },
    });

    // Generate AI summary
    const summary = await this.generateAISummary(events, activePlans, date);

    // Save or update the summary
    if (existingSummary) {
      return await this.prisma.dailySummary.update({
        where: { id: existingSummary.id },
        data: {
          adherenceBullet: summary.adherence,
          highlightsBullet: summary.highlights,
          recommendationBullet: summary.recommendation,
          metadata: {
            totalEvents: events.length,
            approvedEvents: events.filter(e => e.eventApproval?.status === 'APPROVED').length,
            activePlans: activePlans.length,
            regenerated: true,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      return await this.prisma.dailySummary.create({
        data: {
          userId,
          date: dayStart,
          adherenceBullet: summary.adherence,
          highlightsBullet: summary.highlights,
          recommendationBullet: summary.recommendation,
          metadata: {
            totalEvents: events.length,
            approvedEvents: events.filter(e => e.eventApproval?.status === 'APPROVED').length,
            activePlans: activePlans.length,
          },
        },
      });
    }
  }

  async draftPartnerReply(summaryId: string, context: string, partnerId: string) {
    const summary = await this.prisma.dailySummary.findUnique({
      where: { id: summaryId },
      include: {
        user: {
          select: { username: true, firstName: true },
        },
      },
    });

    if (!summary) {
      throw new Error('Daily summary not found');
    }

    // Verify partnership exists
    const partnership = await this.prisma.partnershipRequest.findFirst({
      where: {
        OR: [
          { userId: summary.userId, partnerId, status: 'ACCEPTED' },
          { userId: partnerId, partnerId: summary.userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!partnership) {
      throw new Error('Partnership not found');
    }

    const draftReply = await this.generatePartnerReply(summary, context);

    return {
      reply: draftReply,
      tone: 'supportive',
      generatedAt: new Date(),
      metadata: {
        summaryId,
        partnerId,
        context: context || 'general',
      },
    };
  }

  async getDailySummaries(
    userId: string,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [summaries, total] = await Promise.all([
      this.prisma.dailySummary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          user: {
            select: { username: true, firstName: true },
          },
        },
      }),
      this.prisma.dailySummary.count({ where }),
    ]);

    return {
      data: summaries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async generateActivityInsights(eventId: string, partnerId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: {
          select: { username: true, firstName: true },
        },
        eventApproval: true,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Verify partnership
    const partnership = await this.prisma.partnershipRequest.findFirst({
      where: {
        OR: [
          { userId: event.userId, partnerId, status: 'ACCEPTED' },
          { userId: partnerId, partnerId: event.userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!partnership) {
      throw new Error('Partnership not found');
    }

    const insights = await this.generateAIInsights(event);

    return {
      eventId,
      insights,
      recommendations: insights.recommendations,
      encouragementLevel: insights.encouragementLevel,
      generatedAt: new Date(),
    };
  }

  async generateWeeklyReport(userId: string, startDate: Date, endDate: Date) {
    const events = await this.prisma.event.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        eventApproval: true,
      },
    });

    const summaries = await this.prisma.dailySummary.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const report = await this.generateWeeklyAIReport(events, summaries, startDate, endDate);

    return {
      userId,
      period: { startDate, endDate },
      report,
      generatedAt: new Date(),
    };
  }

  async generateEncouragement(userId: string, tone: string = 'supportive') {
    // Get recent activity for context
    const recentEvents = await this.prisma.event.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        eventApproval: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const encouragement = await this.generateAIEncouragement(recentEvents, tone);

    return {
      message: encouragement,
      tone,
      generatedAt: new Date(),
      metadata: {
        recentActivities: recentEvents.length,
        approvedActivities: recentEvents.filter(e => e.eventApproval?.status === 'APPROVED').length,
      },
    };
  }

  private async generateAISummary(events: any[], plans: any[], date: Date) {
    const prompt = `
Generate a daily accountability summary for ${date.toDateString()} with exactly 3 bullet points:

Events completed today: ${events.length}
${events.map(e => `- ${e.title} (${e.type}): ${e.description || 'No description'}`).join('\n')}

Active plans: ${plans.length}
${plans.map(p => `- ${p.title} (${p.type}): ${p.description}`).join('\n')}

Format your response as JSON with these exact keys:
{
  "adherence": "One bullet about plan adherence and goal achievement",
  "highlights": "One bullet about standout activities or achievements",
  "recommendation": "One bullet with actionable recommendation for tomorrow"
}

Keep each bullet concise (max 20 words). Focus on accountability and progress.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a supportive accountability coach helping partners track progress.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          // Fallback if JSON parsing fails
          return this.generateFallbackSummary(events, plans);
        }
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
    }

    return this.generateFallbackSummary(events, plans);
  }

  private async generatePartnerReply(summary: any, context: string) {
    const prompt = `
As an accountability partner, draft a supportive reply to this daily summary:

Adherence: ${summary.adherenceBullet}
Highlights: ${summary.highlightsBullet}
Recommendation: ${summary.recommendationBullet}

Context: ${context}
User: ${summary.user.firstName || summary.user.username}

Write a warm, encouraging response (2-3 sentences) that:
1. Acknowledges their efforts
2. Celebrates specific achievements
3. Offers gentle motivation for tomorrow

Keep it personal and supportive, like a good friend would write.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a caring accountability partner writing to your friend.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 200,
      });

      return response.choices[0]?.message?.content || this.generateFallbackReply(summary);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateFallbackReply(summary);
    }
  }

  private async generateAIInsights(event: any) {
    const prompt = `
Analyze this activity and provide insights for an accountability partner:

Activity: ${event.title}
Type: ${event.type}
Description: ${event.description || 'No description'}
Duration: ${event.duration || 'Not specified'}
Notes: ${event.notes || 'No notes'}

Provide insights as JSON:
{
  "quality": "Brief assessment of activity quality (1-2 sentences)",
  "recommendations": ["3 specific suggestions for improvement"],
  "encouragementLevel": "high|medium|low",
  "partnerFeedbackSuggestions": ["2 questions the partner could ask"]
}
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI coach providing activity insights for accountability partners.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 400,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          return this.generateFallbackInsights();
        }
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
    }

    return this.generateFallbackInsights();
  }

  private async generateWeeklyAIReport(events: any[], summaries: any[], startDate: Date, endDate: Date) {
    const prompt = `
Generate a weekly accountability report for ${startDate.toDateString()} to ${endDate.toDateString()}:

Total events: ${events.length}
Days with summaries: ${summaries.length}

Event breakdown:
${events.reduce((acc: any, event: any) => {
  acc[event.type] = (acc[event.type] || 0) + 1;
  return acc;
}, {})}

Create a comprehensive weekly report with:
1. Overall progress assessment
2. Key achievements and patterns
3. Areas for improvement
4. Next week's focus areas
5. Motivational message

Keep it encouraging but honest about areas to improve.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an accountability coach creating weekly progress reports.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      });

      return response.choices[0]?.message?.content || this.generateFallbackReport(events.length);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateFallbackReport(events.length);
    }
  }

  private async generateAIEncouragement(recentEvents: any[], tone: string) {
    const prompt = `
Generate an encouraging message for someone with this recent activity:

${recentEvents.length} activities in the last 7 days
Activities: ${recentEvents.map(e => e.title).join(', ')}

Tone: ${tone}

Write a motivational message (2-3 sentences) that:
1. Acknowledges their recent efforts
2. Encourages continued progress
3. Feels genuine and personal

Tone should be ${tone === 'supportive' ? 'warm and encouraging' : tone}.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `You are a ${tone} accountability coach providing encouragement.` },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      return response.choices[0]?.message?.content || this.generateFallbackEncouragement();
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateFallbackEncouragement();
    }
  }

  private generateFallbackSummary(events: any[], plans: any[]) {
    return {
      adherence: `Completed ${events.length} activities today with ${plans.length} active plans`,
      highlights: 'Made progress on personal fitness and wellness goals',
      recommendation: 'Focus on consistency and plan adherence for tomorrow'
    };
  }

  private generateFallbackReply(summary: any) {
    return `Great work today! I can see you're making good progress. Keep up the momentum tomorrow!`;
  }

  private generateFallbackInsights() {
    return {
      quality: 'Good activity completion with room for detailed tracking',
      recommendations: [
        'Add more specific notes about the activity',
        'Track duration or intensity when possible',
        'Consider setting specific goals for next time'
      ],
      encouragementLevel: 'medium',
      partnerFeedbackSuggestions: [
        'How did you feel during this activity?',
        'What made this session successful for you?'
      ]
    };
  }

  private generateFallbackReport(eventCount: number) {
    return `This week you completed ${eventCount} activities. You're showing consistency in your accountability journey. Focus on maintaining this momentum and adding variety to your routine next week.`;
  }

  private generateFallbackEncouragement() {
    return "You're doing great with your accountability journey! Keep pushing forward and remember that every small step counts toward your larger goals.";
  }
}