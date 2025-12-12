import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import type { Plan } from '@omnifit/shared';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createPlan(creatorId: string, dto: CreatePlanDto): Promise<Plan> {
    // TODO: Verify partnership exists and allows plan creation
    const partnership = await this.prisma.partnershipRequest.findFirst({
      where: {
        OR: [
          { 
            userId: dto.userId, 
            partnerId: creatorId, 
            status: 'ACCEPTED',
            allowsPlanCreation: true 
          },
          { 
            userId: creatorId, 
            partnerId: dto.userId, 
            status: 'ACCEPTED',
            allowsPlanCreation: true 
          }
        ]
      }
    });

    if (!partnership) {
      throw new ForbiddenException('No partnership found or plan creation not allowed');
    }

    // Validate dates
    if (dto.endDate && new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Create the plan
    const plan = await this.prisma.plan.create({
      data: {
        createdBy: creatorId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        status: 'DRAFT', // Always start as draft
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        weeklyGoal: dto.weeklyGoal,
        activities: dto.activities,
        goals: dto.goals,
        milestones: dto.milestones,
        totalActivities: dto.activities.length,
      },
      include: {
        creator: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      }
    });

    // TODO: Send notification to target user
    await this.notificationService.sendPlanCreatedNotification(plan, dto.userId);

    return plan as Plan;
  }

  async getPlansCreatedBy(
    creatorId: string,
    page: number,
    limit: number,
    status?: string
  ) {
    const skip = (page - 1) * limit;
    const whereCondition: any = { createdBy: creatorId };

    if (status) {
      whereCondition.status = status;
    }

    const [plans, total] = await Promise.all([
      this.prisma.plan.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, username: true, firstName: true, lastName: true }
          }
        }
      }),
      this.prisma.plan.count({ where: whereCondition })
    ]);

    return {
      data: plans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getPlansForUser(
    userId: string,
    page: number,
    limit: number,
    status?: string
  ) {
    // TODO: Get plans where this user is the target user
    // For now, we'll assume the partnership structure to find relevant plans
    
    const partnerships = await this.prisma.partnershipRequest.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { partnerId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    if (partnerships.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }

    // Get partner IDs
    const partnerIds = partnerships.map(p => 
      p.userId === userId ? p.partnerId : p.userId
    ).filter(Boolean);

    const skip = (page - 1) * limit;
    const whereCondition: any = { 
      createdBy: { in: partnerIds }
    };

    if (status) {
      whereCondition.status = status;
    }

    const [plans, total] = await Promise.all([
      this.prisma.plan.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, username: true, firstName: true, lastName: true }
          }
        }
      }),
      this.prisma.plan.count({ where: whereCondition })
    ]);

    return {
      data: plans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getPlanById(planId: string, userId: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        creator: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      }
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // TODO: Verify user has access (either creator or target user)
    const hasAccess = await this.verifyPlanAccess(planId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view this plan');
    }

    return plan as Plan;
  }

  async updatePlan(
    planId: string,
    userId: string,
    dto: UpdatePlanDto
  ): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (plan.createdBy !== userId) {
      throw new ForbiddenException('Only plan creator can update the plan');
    }

    // Validate dates if provided
    if (dto.endDate && dto.startDate) {
      if (new Date(dto.endDate) <= new Date(dto.startDate)) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        totalActivities: dto.activities ? dto.activities.length : undefined,
        updatedAt: new Date()
      },
      include: {
        creator: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      }
    });

    // TODO: Send notification to target user about plan update
    await this.notificationService.sendPlanUpdatedNotification(updatedPlan);

    return updatedPlan as Plan;
  }

  async updatePlanStatus(
    planId: string,
    userId: string,
    status: string
  ): Promise<Plan> {
    const hasAccess = await this.verifyPlanAccess(planId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to modify this plan');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Validate status transition
    if (!this.isValidStatusTransition(plan.status, status)) {
      throw new BadRequestException(`Cannot change status from ${plan.status} to ${status}`);
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        creator: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      }
    });

    // TODO: Send notification about status change
    await this.notificationService.sendPlanStatusChangeNotification(updatedPlan);

    return updatedPlan as Plan;
  }

  async completeActivity(
    planId: string,
    activityId: string,
    userId: string,
    eventId: string
  ) {
    // TODO: Verify plan access
    const hasAccess = await this.verifyPlanAccess(planId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to modify this plan');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // TODO: Update activities array to mark as completed
    const activities = plan.activities as any[];
    const activityIndex = activities.findIndex(a => a.id === activityId);

    if (activityIndex === -1) {
      throw new NotFoundException('Activity not found in plan');
    }

    activities[activityIndex] = {
      ...activities[activityIndex],
      completed: true,
      completedAt: new Date(),
      eventId
    };

    const completedCount = activities.filter(a => a.completed).length;

    const updatedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        activities,
        completedActivities: completedCount,
        updatedAt: new Date()
      }
    });

    // TODO: Check if any milestones are reached
    await this.checkMilestoneCompletion(planId);

    return {
      plan: updatedPlan,
      completedActivity: activities[activityIndex],
      progressPercentage: (completedCount / plan.totalActivities) * 100
    };
  }

  async getPlanProgress(planId: string, userId: string) {
    const hasAccess = await this.verifyPlanAccess(planId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view this plan');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const activities = plan.activities as any[];
    const goals = plan.goals as any[];
    const milestones = plan.milestones as any[];

    // Calculate progress metrics
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.completed).length;
    const progressPercentage = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    // Calculate goal progress (simplified)
    const goalProgress = goals.map(goal => ({
      ...goal,
      completed: false, // TODO: Implement goal tracking logic
      progress: 0
    }));

    // Calculate milestone progress
    const milestoneProgress = milestones.map(milestone => ({
      ...milestone,
      completed: milestone.completed || false,
      completedAt: milestone.completedAt
    }));

    // Get weekly progress for the last 4 weeks
    const weeklyProgress = await this.getWeeklyProgress(planId);

    return {
      plan: {
        id: plan.id,
        title: plan.title,
        type: plan.type,
        status: plan.status,
        startDate: plan.startDate,
        endDate: plan.endDate
      },
      progress: {
        totalActivities,
        completedActivities,
        progressPercentage,
        weeklyGoal: plan.weeklyGoal,
        currentWeekCompleted: 0 // TODO: Calculate current week completion
      },
      goals: goalProgress,
      milestones: milestoneProgress,
      weeklyProgress
    };
  }

  async getUpcomingActivities(planId: string, userId: string, days: number) {
    const hasAccess = await this.verifyPlanAccess(planId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view this plan');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const activities = plan.activities as any[];
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    // TODO: Calculate which activities are scheduled for the next X days
    // This would require more sophisticated scheduling logic
    const upcomingActivities = activities
      .filter(activity => !activity.completed)
      .slice(0, days) // Simplified - just return first X incomplete activities
      .map(activity => ({
        ...activity,
        scheduledDate: today, // TODO: Calculate actual scheduled date based on plan
        daysUntil: 0
      }));

    return {
      activities: upcomingActivities,
      totalUpcoming: upcomingActivities.length,
      dateRange: {
        start: today,
        end: endDate
      }
    };
  }

  async completeMilestone(planId: string, milestoneId: string, userId: string) {
    const hasAccess = await this.verifyPlanAccess(planId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to modify this plan');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const milestones = plan.milestones as any[];
    const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);

    if (milestoneIndex === -1) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestones[milestoneIndex].completed) {
      throw new BadRequestException('Milestone already completed');
    }

    // Mark milestone as completed
    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      completed: true,
      completedAt: new Date()
    };

    await this.prisma.plan.update({
      where: { id: planId },
      data: {
        milestones,
        updatedAt: new Date()
      }
    });

    // TODO: Award milestone rewards
    const milestone = milestones[milestoneIndex];
    if (milestone.rewardTokens > 0) {
      await this.awardMilestoneReward(userId, milestone);
    }

    // TODO: Send notification to partner
    await this.notificationService.sendMilestoneCompletedNotification(plan, milestone);

    return {
      milestone: milestones[milestoneIndex],
      rewardAwarded: milestone.rewardTokens
    };
  }

  async archivePlan(planId: string, userId: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (plan.createdBy !== userId) {
      throw new ForbiddenException('Only plan creator can archive the plan');
    }

    const archivedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        status: 'ARCHIVED',
        updatedAt: new Date()
      },
      include: {
        creator: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      }
    });

    return archivedPlan as Plan;
  }

  async generateShareableLink(planId: string, userId: string) {
    const hasAccess = await this.verifyPlanAccess(planId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to share this plan');
    }

    // TODO: Generate a secure token for sharing
    const shareToken = this.generateSecureToken();

    // TODO: Store the share token in database with expiration
    // For now, just return a mock shareable URL
    const shareUrl = `${process.env.FRONTEND_URL}/shared/plans/${planId}?token=${shareToken}`;

    return {
      shareUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      token: shareToken
    };
  }

  private async verifyPlanAccess(planId: string, userId: string): Promise<boolean> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return false;
    }

    // Plan creator always has access
    if (plan.createdBy === userId) {
      return true;
    }

    // TODO: Check if user is the target of the plan
    // This would require tracking plan assignments
    const partnership = await this.prisma.partnershipRequest.findFirst({
      where: {
        OR: [
          { userId, partnerId: plan.createdBy, status: 'ACCEPTED' },
          { userId: plan.createdBy, partnerId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    return !!partnership;
  }

  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const transitions: Record<string, string[]> = {
      'DRAFT': ['ACTIVE', 'ARCHIVED'],
      'ACTIVE': ['PAUSED', 'COMPLETED', 'ARCHIVED'],
      'PAUSED': ['ACTIVE', 'ARCHIVED'],
      'COMPLETED': ['ARCHIVED'],
      'ARCHIVED': [] // Cannot transition from archived
    };

    return transitions[currentStatus]?.includes(newStatus) || false;
  }

  private async checkMilestoneCompletion(planId: string) {
    // TODO: Check if activity completion triggers any milestone completion
    // This would be based on completion criteria defined in milestones
  }

  private async getWeeklyProgress(planId: string) {
    // TODO: Calculate weekly progress for the last 4 weeks
    // Return mock data for now
    return [
      { week: 'Week 1', completed: 5, planned: 7 },
      { week: 'Week 2', completed: 6, planned: 7 },
      { week: 'Week 3', completed: 4, planned: 7 },
      { week: 'Week 4', completed: 3, planned: 7 }
    ];
  }

  private async awardMilestoneReward(userId: string, milestone: any) {
    // TODO: Create reward record for milestone completion
    await this.prisma.reward.create({
      data: {
        userId,
        type: 'MILESTONE',
        amount: milestone.rewardTokens,
        reason: `Milestone completed: ${milestone.description}`,
        status: 'APPROVED',
        sourceType: 'milestone'
      }
    });

    // Update user's total tokens
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        totalTokens: {
          increment: milestone.rewardTokens
        }
      }
    });
  }

  private generateSecureToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}