import { PrismaClient } from '@prisma/client';
import type { AIMessageType, AIPromptTemplate } from '@omnifit/shared';

export class PromptService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getPrompt(type: AIMessageType): Promise<AIPromptTemplate> {
    const template = await this.prisma.aIPromptTemplate.findFirst({
      where: {
        category: type,
        isActive: true,
      },
    });

    if (!template) {
      // Return default template if none found
      return this.getDefaultTemplate(type);
    }

    return template as AIPromptTemplate;
  }

  async personalizePrompt(
    template: AIPromptTemplate,
    variables: Record<string, any>
  ): Promise<string> {
    let personalizedPrompt = template.template;

    // Replace variables in template
    for (const variable of template.variables) {
      const value = variables[variable];
      if (value !== undefined) {
        personalizedPrompt = personalizedPrompt.replace(
          new RegExp(`{{${variable}}}`, 'g'),
          String(value)
        );
      }
    }

    return personalizedPrompt;
  }

  async createTemplate(templateData: Omit<AIPromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIPromptTemplate> {
    return this.prisma.aIPromptTemplate.create({
      data: templateData,
    }) as Promise<AIPromptTemplate>;
  }

  async updateTemplate(id: string, templateData: Partial<AIPromptTemplate>): Promise<AIPromptTemplate> {
    return this.prisma.aIPromptTemplate.update({
      where: { id },
      data: templateData,
    }) as Promise<AIPromptTemplate>;
  }

  private getDefaultTemplate(type: AIMessageType): AIPromptTemplate {
    const templates = {
      DAILY_MOTIVATION: {
        id: 'default-daily',
        name: 'Default Daily Motivation',
        category: 'DAILY_MOTIVATION',
        template: `Good morning! 🌅 Today is a new day to strengthen both your body and spirit. 
        
        {{#if currentStreak}}You've maintained your {{streakType}} streak for {{currentStreak}} days - that's incredible dedication! 💪{{/if}}
        
        {{#if lastActivity}}Your last {{lastActivity}} session showed great commitment.{{/if}}
        
        Remember: "She is clothed with strength and dignity; she can laugh at the days to come." - Proverbs 31:25
        
        What will you accomplish today? 🙏`,
        variables: ['currentStreak', 'streakType', 'lastActivity'],
        isActive: true,
      },

      STREAK_ENCOURAGEMENT: {
        id: 'default-streak',
        name: 'Default Streak Encouragement',
        category: 'STREAK_ENCOURAGEMENT',
        template: `Amazing! 🔥 You're on a {{currentStreak}}-day {{streakType}} streak! 
        
        {{#if nextMilestone}}You're only {{daysToMilestone}} days away from earning {{milestoneReward}} OMF tokens!{{/if}}
        
        Consistency is the key to transformation. Every day you choose to show up, you're building not just physical strength, but spiritual discipline.
        
        "Let us run with perseverance the race marked out for us." - Hebrews 12:1
        
        Keep going! 💪✨`,
        variables: ['currentStreak', 'streakType', 'daysToMilestone', 'milestoneReward'],
        isActive: true,
      },

      MILESTONE_CELEBRATION: {
        id: 'default-milestone',
        name: 'Default Milestone Celebration',
        category: 'MILESTONE_CELEBRATION',
        template: `Congratulations! 🎉 You've reached an incredible milestone!
        
        {{milestoneDescription}}
        
        {{#if tokensEarned}}You've earned {{tokensEarned}} OMF tokens as a reward for your dedication! 🪙{{/if}}
        
        This achievement reflects your commitment to growing in both faith and fitness. You're not just building a stronger body, but also strengthening your spiritual discipline.
        
        "I can do all things through Christ who strengthens me." - Philippians 4:13
        
        Celebrate this victory and keep moving forward! 🚀`,
        variables: ['milestoneDescription', 'tokensEarned'],
        isActive: true,
      },

      PARTNER_RECOMMENDATION: {
        id: 'default-partner',
        name: 'Default Partner Recommendation',
        category: 'PARTNER_RECOMMENDATION',
        template: `Great news! 🎯 Based on your {{activityPreference}} activities, we have some exciting partner offers for you:
        
        {{#each recommendations}}
        • {{name}}: {{description}} ({{tokenRequirement}} OMF tokens)
        {{/each}}
        
        These partners share our values of faith-centered wellness and offer quality services to support your journey.
        
        Your consistent efforts have earned you {{currentTokens}} OMF tokens. Consider treating yourself to one of these amazing offers!
        
        Continue growing stronger in faith and fitness! 💪🙏`,
        variables: ['activityPreference', 'recommendations', 'currentTokens'],
        isActive: true,
      },
    };

    return {
      ...templates[type],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AIPromptTemplate;
  }
}