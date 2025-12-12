import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Event, RewardRule, RewardType } from '@omnifit/shared';

interface RewardConditions {
  eventType?: string[];
  category?: string[];
  minDuration?: number;
  maxDuration?: number;
  minIntensity?: number;
  maxIntensity?: number;
  streakCount?: number;
  partnerApproved?: boolean;
  timeOfDay?: string; // "morning", "afternoon", "evening"
  dayOfWeek?: number[]; // 0-6, Sunday=0
}

interface MultiplierRule {
  condition: string;
  multiplier: number;
  description: string;
}

interface ProcessedReward {
  baseAmount: number;
  finalAmount: number;
  rulesApplied: string[];
  multipliers: Array<{ rule: string; multiplier: number; description: string }>;
  cappingApplied?: {
    type: 'daily' | 'user';
    originalAmount: number;
    cappedAmount: number;
  };
}

@Injectable()
export class RewardEngineService {
  private readonly logger = new Logger(RewardEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processEventReward(
    userId: string,
    eventId: string,
    eventData: Event
  ): Promise<ProcessedReward | null> {
    try {
      this.logger.log(`Processing reward for event ${eventId} by user ${userId}`);

      // Get active reward rules, sorted by priority
      const rules = await this.prisma.rewardRule.findMany({
        where: {
          isActive: true,
          OR: [
            { validFrom: null },
            { validFrom: { lte: new Date() } }
          ],
          AND: {
            OR: [
              { validTo: null },
              { validTo: { gte: new Date() } }
            ]
          }
        },
        orderBy: { priority: 'desc' }
      });

      let totalAmount = 0;
      const rulesApplied: string[] = [];
      const multipliers: Array<{ rule: string; multiplier: number; description: string }> = [];

      // Process each applicable rule
      for (const rule of rules) {
        if (await this.isRuleApplicable(rule, eventData, userId)) {
          const ruleAmount = await this.calculateRuleAmount(rule, eventData, userId);
          
          if (ruleAmount > 0) {
            // Check daily and user caps
            const cappedAmount = await this.applyCapping(rule, ruleAmount, userId);
            
            totalAmount += cappedAmount;
            rulesApplied.push(rule.name);

            // Apply multipliers
            const ruleMultipliers = await this.calculateMultipliers(rule, eventData, userId);
            multipliers.push(...ruleMultipliers);

            this.logger.debug(`Rule ${rule.name} applied: ${cappedAmount} tokens`);
          }
        }
      }

      // Apply multipliers
      let finalAmount = totalAmount;
      for (const mult of multipliers) {
        finalAmount = Math.round(finalAmount * mult.multiplier);
      }

      // Check for partner approval bonus
      const partnerBonus = await this.calculatePartnerBonus(eventData);
      if (partnerBonus > 0) {
        finalAmount += partnerBonus;
        multipliers.push({
          rule: 'partner_approval',
          multiplier: partnerBonus / finalAmount,
          description: 'Partner approval bonus'
        });
      }

      if (finalAmount <= 0) {
        this.logger.debug(`No rewards applicable for event ${eventId}`);
        return null;
      }

      this.logger.log(`Processed reward: ${finalAmount} tokens for event ${eventId}`);
      
      return {
        baseAmount: totalAmount,
        finalAmount,
        rulesApplied,
        multipliers
      };

    } catch (error) {
      this.logger.error(`Error processing reward for event ${eventId}:`, error);
      throw error;
    }
  }

  async processStreakReward(
    userId: string,
    streakType: string,
    streakCount: number,
    category: string
  ): Promise<ProcessedReward | null> {
    try {
      this.logger.log(`Processing streak reward: ${streakType} streak of ${streakCount} for user ${userId}`);

      const rules = await this.prisma.rewardRule.findMany({
        where: {
          isActive: true,
          conditions: {
            path: ['streakCount'],
            lte: streakCount
          }
        },
        orderBy: { priority: 'desc' }
      });

      let bestRule: RewardRule | null = null;
      let bestAmount = 0;

      for (const rule of rules) {
        const conditions = rule.conditions as RewardConditions;
        
        if (conditions.streakCount && streakCount >= conditions.streakCount) {
          if (conditions.category && !conditions.category.includes(category)) {
            continue;
          }

          const amount = await this.calculateStreakAmount(rule, streakCount, category);
          if (amount > bestAmount) {
            bestRule = rule;
            bestAmount = amount;
          }
        }
      }

      if (!bestRule || bestAmount <= 0) {
        return null;
      }

      const finalAmount = await this.applyCapping(bestRule, bestAmount, userId);

      return {
        baseAmount: bestAmount,
        finalAmount,
        rulesApplied: [bestRule.name],
        multipliers: []
      };

    } catch (error) {
      this.logger.error(`Error processing streak reward:`, error);
      throw error;
    }
  }

  private async isRuleApplicable(
    rule: RewardRule,
    eventData: Event,
    userId: string
  ): Promise<boolean> {
    const conditions = rule.conditions as RewardConditions;

    // Check event type
    if (conditions.eventType && !conditions.eventType.includes(eventData.type)) {
      return false;
    }

    // Check category
    if (conditions.category && !conditions.category.includes(eventData.category)) {
      return false;
    }

    // Check duration
    if (eventData.duration) {
      if (conditions.minDuration && eventData.duration < conditions.minDuration) {
        return false;
      }
      if (conditions.maxDuration && eventData.duration > conditions.maxDuration) {
        return false;
      }
    }

    // Check intensity
    if (eventData.intensity) {
      if (conditions.minIntensity && eventData.intensity < conditions.minIntensity) {
        return false;
      }
      if (conditions.maxIntensity && eventData.intensity > conditions.maxIntensity) {
        return false;
      }
    }

    // Check time of day
    if (conditions.timeOfDay) {
      const hour = new Date(eventData.completedAt).getHours();
      const timeOfDay = this.getTimeOfDay(hour);
      if (timeOfDay !== conditions.timeOfDay) {
        return false;
      }
    }

    // Check day of week
    if (conditions.dayOfWeek) {
      const dayOfWeek = new Date(eventData.completedAt).getDay();
      if (!conditions.dayOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  }

  private async calculateRuleAmount(
    rule: RewardRule,
    eventData: Event,
    userId: string
  ): Promise<number> {
    let amount = rule.baseAmount;

    // Duration-based scaling
    if (eventData.duration) {
      const durationMultiplier = Math.min(eventData.duration / 30, 3.0); // Cap at 3x for 90+ min
      amount = Math.round(amount * durationMultiplier);
    }

    // Intensity-based scaling
    if (eventData.intensity) {
      const intensityMultiplier = eventData.intensity / 5; // Scale 1-10 to 0.2-2.0
      amount = Math.round(amount * intensityMultiplier);
    }

    return amount;
  }

  private async calculateMultipliers(
    rule: RewardRule,
    eventData: Event,
    userId: string
  ): Promise<Array<{ rule: string; multiplier: number; description: string }>> {
    const multipliers: Array<{ rule: string; multiplier: number; description: string }> = [];
    
    if (!rule.multiplierRules) {
      return multipliers;
    }

    const multiplierRules = rule.multiplierRules as MultiplierRule[];

    for (const multRule of multiplierRules) {
      if (await this.evaluateMultiplierCondition(multRule.condition, eventData, userId)) {
        multipliers.push({
          rule: multRule.condition,
          multiplier: multRule.multiplier,
          description: multRule.description
        });
      }
    }

    return multipliers;
  }

  private async evaluateMultiplierCondition(
    condition: string,
    eventData: Event,
    userId: string
  ): Promise<boolean> {
    switch (condition) {
      case 'first_activity_of_day':
        return await this.isFirstActivityOfDay(userId, eventData.completedAt);
      
      case 'weekend_activity':
        const dayOfWeek = new Date(eventData.completedAt).getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
      
      case 'early_morning': // Before 7 AM
        const hour = new Date(eventData.completedAt).getHours();
        return hour < 7;
      
      case 'high_intensity':
        return eventData.intensity ? eventData.intensity >= 8 : false;
      
      case 'long_duration':
        return eventData.duration ? eventData.duration >= 60 : false;
      
      default:
        return false;
    }
  }

  private async calculatePartnerBonus(eventData: Event): Promise<number> {
    // Check if event has partner approval
    const approval = await this.prisma.eventApproval.findUnique({
      where: { eventId: eventData.id }
    });

    if (approval?.status === 'APPROVED') {
      // Apply approval multiplier (default 50% bonus)
      return Math.round((approval.approvalMultiplier || 1.5 - 1) * 100); // Convert to bonus tokens
    }

    return 0;
  }

  private async calculateStreakAmount(
    rule: RewardRule,
    streakCount: number,
    category: string
  ): Promise<number> {
    // Progressive rewards for longer streaks
    const baseAmount = rule.baseAmount;
    const progressiveMultiplier = Math.min(1 + (streakCount - 1) * 0.1, 3.0); // Max 3x for 21+ day streaks
    
    return Math.round(baseAmount * progressiveMultiplier);
  }

  private async applyCapping(
    rule: RewardRule,
    amount: number,
    userId: string
  ): Promise<number> {
    let cappedAmount = amount;

    // Apply daily cap
    if (rule.maxDailyAmount) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayRewards = await this.prisma.reward.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          createdAt: { gte: todayStart },
          status: { in: ['APPROVED', 'CLAIMED'] }
        }
      });

      const todayTotal = todayRewards._sum.amount || 0;
      const remainingDaily = Math.max(0, rule.maxDailyAmount - todayTotal);
      cappedAmount = Math.min(cappedAmount, remainingDaily);
    }

    // Apply user total cap
    if (rule.maxUserAmount) {
      const userTotal = await this.prisma.reward.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          status: { in: ['APPROVED', 'CLAIMED'] }
        }
      });

      const totalEarned = userTotal._sum.amount || 0;
      const remainingUser = Math.max(0, rule.maxUserAmount - totalEarned);
      cappedAmount = Math.min(cappedAmount, remainingUser);
    }

    return cappedAmount;
  }

  private async isFirstActivityOfDay(userId: string, completedAt: Date): Promise<boolean> {
    const dayStart = new Date(completedAt);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(completedAt);
    dayEnd.setHours(23, 59, 59, 999);

    const earlierActivity = await this.prisma.event.findFirst({
      where: {
        userId,
        completedAt: {
          gte: dayStart,
          lt: completedAt
        }
      }
    });

    return !earlierActivity;
  }

  private getTimeOfDay(hour: number): string {
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  // Admin methods for rule management
  async createRewardRule(ruleData: {
    name: string;
    description: string;
    conditions: RewardConditions;
    baseAmount: number;
    multiplierRules?: MultiplierRule[];
    maxDailyAmount?: number;
    maxUserAmount?: number;
    validFrom?: Date;
    validTo?: Date;
    createdBy: string;
  }): Promise<RewardRule> {
    return await this.prisma.rewardRule.create({
      data: {
        name: ruleData.name,
        description: ruleData.description,
        conditions: ruleData.conditions,
        baseAmount: ruleData.baseAmount,
        multiplierRules: ruleData.multiplierRules || null,
        maxDailyAmount: ruleData.maxDailyAmount,
        maxUserAmount: ruleData.maxUserAmount,
        validFrom: ruleData.validFrom,
        validTo: ruleData.validTo,
        createdBy: ruleData.createdBy
      }
    });
  }

  async updateRewardRule(
    ruleId: string,
    updates: Partial<{
      description: string;
      isActive: boolean;
      conditions: RewardConditions;
      baseAmount: number;
      multiplierRules: MultiplierRule[];
      maxDailyAmount: number;
      maxUserAmount: number;
    }>
  ): Promise<RewardRule> {
    return await this.prisma.rewardRule.update({
      where: { id: ruleId },
      data: updates
    });
  }

  async getRewardRules(isActive?: boolean) {
    return await this.prisma.rewardRule.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async testRuleAgainstEvent(
    ruleId: string,
    eventData: Event,
    userId: string
  ): Promise<{ applicable: boolean; amount?: number; details?: any }> {
    const rule = await this.prisma.rewardRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) {
      throw new Error('Rule not found');
    }

    const isApplicable = await this.isRuleApplicable(rule, eventData, userId);
    
    if (!isApplicable) {
      return { applicable: false };
    }

    const amount = await this.calculateRuleAmount(rule, eventData, userId);
    const multipliers = await this.calculateMultipliers(rule, eventData, userId);
    
    return {
      applicable: true,
      amount,
      details: {
        baseAmount: rule.baseAmount,
        calculatedAmount: amount,
        multipliers
      }
    };
  }
}