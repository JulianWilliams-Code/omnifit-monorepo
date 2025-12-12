import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { ApproveEventDto } from './dto';
import type { EventApproval, ApprovalStatus } from '@omnifit/shared';

@Injectable()
export class EventApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createEventApprovalRequest(eventId: string, userId: string): Promise<EventApproval | null> {
    // TODO: This is called when an event is created by a user who has a partner
    // Check if user has active partnership with event review enabled
    
    const activePartnership = await this.prisma.partnershipRequest.findFirst({
      where: {
        OR: [
          { userId, status: 'ACCEPTED', allowsEventReview: true },
          { partnerId: userId, status: 'ACCEPTED', allowsEventReview: true }
        ]
      }
    });

    if (!activePartnership) {
      return null; // No partner approval needed
    }

    // Determine who the partner is
    const partnerId = activePartnership.userId === userId 
      ? activePartnership.partnerId 
      : activePartnership.userId;

    if (!partnerId) {
      return null;
    }

    // TODO: Generate AI summary of the event for partner review
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        exercises: true
      }
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const aiSummary = await this.generateEventSummary(event);

    // Create approval request
    const eventApproval = await this.prisma.eventApproval.create({
      data: {
        eventId,
        userId,
        partnerId,
        status: 'PENDING',
        aiSummary,
        approvalMultiplier: 1.5, // TODO: Make this configurable
      },
      include: {
        event: true,
        user: {
          select: { id: true, username: true, firstName: true, lastName: true }
        },
        partner: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      }
    });

    // Send notification to partner
    await this.notificationService.sendEventApprovalNotification(eventApproval);

    return eventApproval as EventApproval;
  }

  async getPendingApprovals(partnerId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [approvals, total] = await Promise.all([
      this.prisma.eventApproval.findMany({
        where: {
          partnerId,
          status: 'PENDING'
        },
        include: {
          event: {
            include: {
              exercises: true
            }
          },
          user: {
            select: { 
              id: true, username: true, firstName: true, lastName: true, 
              avatar: true 
            }
          }
        },
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' }
      }),
      this.prisma.eventApproval.count({
        where: {
          partnerId,
          status: 'PENDING'
        }
      })
    ]);

    return {
      data: approvals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async approveEvent(
    eventId: string,
    partnerId: string,
    dto: ApproveEventDto
  ): Promise<EventApproval> {
    // Find the approval request
    const approval = await this.prisma.eventApproval.findFirst({
      where: {
        eventId,
        partnerId,
        status: 'PENDING'
      },
      include: {
        event: true,
        user: true
      }
    });

    if (!approval) {
      throw new NotFoundException('No pending approval found for this event');
    }

    // Update approval with partner's feedback
    const updatedApproval = await this.prisma.eventApproval.update({
      where: { id: approval.id },
      data: {
        status: dto.approve ? 'APPROVED' : 'REJECTED',
        partnerFeedback: dto.feedback,
        partnerRating: dto.rating,
        clarificationNeeded: dto.clarificationNeeded,
        reviewedAt: new Date()
      },
      include: {
        event: true,
        user: true,
        partner: true
      }
    });

    // TODO: If approved, apply reward multiplier to the event's reward
    if (dto.approve && approval.approvalMultiplier) {
      await this.applyApprovalBonus(eventId, approval.approvalMultiplier);
    }

    // Send notification to event creator
    await this.notificationService.sendApprovalResultNotification(updatedApproval);

    return updatedApproval as EventApproval;
  }

  async getApprovalStatus(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventApproval: {
          include: {
            partner: {
              select: { id: true, username: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user has access (event creator or partner)
    const hasAccess = event.userId === userId || 
      event.eventApproval?.partnerId === userId;

    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view this event approval');
    }

    return {
      event: {
        id: event.id,
        title: event.title,
        type: event.type,
        category: event.category,
        completedAt: event.completedAt
      },
      approval: event.eventApproval ? {
        status: event.eventApproval.status,
        partnerFeedback: event.eventApproval.partnerFeedback,
        partnerRating: event.eventApproval.partnerRating,
        clarificationNeeded: event.eventApproval.clarificationNeeded,
        submittedAt: event.eventApproval.submittedAt,
        reviewedAt: event.eventApproval.reviewedAt,
        partner: event.eventApproval.partner
      } : null
    };
  }

  async getUserEventApprovals(
    userId: string,
    page: number,
    limit: number,
    status?: string
  ) {
    const skip = (page - 1) * limit;
    const whereCondition: any = { userId };

    if (status) {
      whereCondition.status = status;
    }

    const [approvals, total] = await Promise.all([
      this.prisma.eventApproval.findMany({
        where: whereCondition,
        include: {
          event: {
            select: {
              id: true, title: true, type: true, category: true,
              duration: true, completedAt: true
            }
          },
          partner: {
            select: { 
              id: true, username: true, firstName: true, lastName: true 
            }
          }
        },
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' }
      }),
      this.prisma.eventApproval.count({
        where: whereCondition
      })
    ]);

    return {
      data: approvals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async requestClarification(
    eventId: string,
    partnerId: string,
    message: string
  ): Promise<EventApproval> {
    const approval = await this.prisma.eventApproval.findFirst({
      where: {
        eventId,
        partnerId,
        status: 'PENDING'
      },
      include: {
        user: true,
        event: true
      }
    });

    if (!approval) {
      throw new NotFoundException('No pending approval found for this event');
    }

    const updatedApproval = await this.prisma.eventApproval.update({
      where: { id: approval.id },
      data: {
        status: 'REQUIRES_CLARIFICATION',
        clarificationNeeded: message,
        reviewedAt: new Date()
      },
      include: {
        event: true,
        user: true,
        partner: true
      }
    });

    // Send notification to event creator
    await this.notificationService.sendClarificationRequestNotification(updatedApproval);

    return updatedApproval as EventApproval;
  }

  async provideClarification(
    eventId: string,
    userId: string,
    clarification: string
  ): Promise<EventApproval> {
    // Find the approval that requires clarification
    const approval = await this.prisma.eventApproval.findFirst({
      where: {
        eventId,
        userId,
        status: 'REQUIRES_CLARIFICATION'
      },
      include: {
        event: true,
        partner: true
      }
    });

    if (!approval) {
      throw new NotFoundException('No clarification request found for this event');
    }

    // Update the event with clarification (add to notes)
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        notes: approval.event.notes 
          ? `${approval.event.notes}\n\nClarification: ${clarification}`
          : `Clarification: ${clarification}`
      }
    });

    // Reset approval status to pending
    const updatedApproval = await this.prisma.eventApproval.update({
      where: { id: approval.id },
      data: {
        status: 'PENDING',
        clarificationNeeded: null
      },
      include: {
        event: true,
        user: true,
        partner: true
      }
    });

    // Send notification to partner that clarification was provided
    await this.notificationService.sendClarificationProvidedNotification(updatedApproval);

    return updatedApproval as EventApproval;
  }

  async getApprovalStats(partnerId: string) {
    // TODO: Calculate approval statistics
    const stats = await this.prisma.eventApproval.groupBy({
      by: ['status'],
      where: { partnerId },
      _count: {
        id: true
      }
    });

    const totalApprovals = stats.reduce((sum, stat) => sum + stat._count.id, 0);
    const approvedCount = stats.find(s => s.status === 'APPROVED')?._count.id || 0;
    const rejectedCount = stats.find(s => s.status === 'REJECTED')?._count.id || 0;

    // Calculate average rating given
    const avgRating = await this.prisma.eventApproval.aggregate({
      where: {
        partnerId,
        partnerRating: { not: null }
      },
      _avg: {
        partnerRating: true
      }
    });

    return {
      totalApprovals,
      approvedCount,
      rejectedCount,
      pendingCount: stats.find(s => s.status === 'PENDING')?._count.id || 0,
      approvalRate: totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0,
      averageRating: avgRating._avg.partnerRating || 0,
      // TODO: Add more stats like average response time
    };
  }

  private async generateEventSummary(event: any): Promise<string> {
    // TODO: Use AI service to generate a summary
    // For now, create a basic summary
    let summary = `${event.type} activity: ${event.title}`;
    
    if (event.duration) {
      summary += ` (${event.duration} minutes)`;
    }
    
    if (event.exercises && event.exercises.length > 0) {
      summary += `. Exercises: ${event.exercises.map((e: any) => e.name).join(', ')}`;
    }
    
    if (event.description) {
      summary += `. ${event.description}`;
    }

    return summary;
  }

  private async applyApprovalBonus(eventId: string, multiplier: number): Promise<void> {
    // TODO: Find existing reward for this event and apply bonus multiplier
    const existingReward = await this.prisma.reward.findFirst({
      where: {
        eventId,
        type: 'ACTIVITY'
      }
    });

    if (existingReward) {
      const bonusAmount = Math.floor(existingReward.amount * (multiplier - 1));
      
      // Create additional bonus reward
      await this.prisma.reward.create({
        data: {
          userId: existingReward.userId,
          eventId,
          type: 'ACTIVITY',
          amount: bonusAmount,
          reason: 'Partner approval bonus',
          status: 'APPROVED',
          sourceType: 'event',
          multiplier,
          bonusReason: 'Partner approved activity'
        }
      });

      // TODO: Update user's total tokens
      await this.prisma.userProfile.update({
        where: { userId: existingReward.userId },
        data: {
          totalTokens: {
            increment: bonusAmount
          }
        }
      });
    }
  }
}