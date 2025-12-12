import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PartnershipRequest, EventApproval } from '@omnifit/shared';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async sendPartnershipRequestNotification(partnershipRequest: PartnershipRequest) {
    // TODO: Create notification in database
    await this.prisma.partnerNotification.create({
      data: {
        partnerId: partnershipRequest.partnerId!,
        type: 'partnership_request',
        title: 'New Partnership Request',
        message: `${partnershipRequest.user?.username || 'Someone'} wants to be your accountability partner`,
        data: {
          partnershipRequestId: partnershipRequest.id,
          requesterId: partnershipRequest.userId,
          message: partnershipRequest.message
        }
      }
    });

    // TODO: Send email notification
    await this.sendEmailNotification(partnershipRequest.partnerId!, {
      subject: 'New Partnership Request on OmniFit',
      template: 'partnership-request',
      data: {
        requesterName: partnershipRequest.user?.username,
        message: partnershipRequest.message,
        acceptUrl: `${process.env.FRONTEND_URL}/partnerships/requests/${partnershipRequest.id}`,
      }
    });

    // TODO: Send webhook notification if configured
    await this.sendWebhookNotification(partnershipRequest.partnerId!, {
      event: 'partnership.request',
      data: partnershipRequest
    });
  }

  async sendPartnershipResponseNotification(partnershipRequest: PartnershipRequest) {
    const accepted = partnershipRequest.status === 'ACCEPTED';
    
    await this.prisma.notification.create({
      data: {
        userId: partnershipRequest.userId,
        type: 'PARTNER',
        title: accepted ? 'Partnership Accepted!' : 'Partnership Request Declined',
        message: accepted 
          ? `${partnershipRequest.partner?.username} accepted your partnership request!`
          : `${partnershipRequest.partner?.username} declined your partnership request`,
        data: {
          partnershipId: partnershipRequest.id,
          accepted,
          response: partnershipRequest.partnerResponse
        }
      }
    });

    // TODO: Send email notification
    await this.sendEmailNotification(partnershipRequest.userId, {
      subject: accepted ? 'Partnership Accepted!' : 'Partnership Request Update',
      template: accepted ? 'partnership-accepted' : 'partnership-declined',
      data: {
        partnerName: partnershipRequest.partner?.username,
        response: partnershipRequest.partnerResponse,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/partners`
      }
    });
  }

  async sendPartnershipStatusNotification(
    partnershipRequest: PartnershipRequest, 
    action: 'paused' | 'resumed' | 'ended'
  ) {
    // Notify the other user in the partnership
    const otherUserId = partnershipRequest.userId === partnershipRequest.partnerId 
      ? partnershipRequest.userId 
      : partnershipRequest.partnerId;

    if (otherUserId) {
      await this.prisma.notification.create({
        data: {
          userId: otherUserId,
          type: 'PARTNER',
          title: `Partnership ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          message: `Your partnership has been ${action}`,
          data: {
            partnershipId: partnershipRequest.id,
            action
          }
        }
      });

      // TODO: Send email notification
      await this.sendEmailNotification(otherUserId, {
        subject: `Partnership ${action}`,
        template: 'partnership-status-change',
        data: {
          action,
          partnerName: partnershipRequest.partner?.username || partnershipRequest.user?.username
        }
      });
    }
  }

  async sendEventApprovalNotification(eventApproval: EventApproval) {
    await this.prisma.partnerNotification.create({
      data: {
        partnerId: eventApproval.partnerId!,
        type: 'approval_needed',
        title: 'Activity Needs Approval',
        message: `${eventApproval.user?.username} logged "${eventApproval.event?.title}" and needs your approval`,
        data: {
          eventApprovalId: eventApproval.id,
          eventId: eventApproval.eventId,
          userId: eventApproval.userId,
          aiSummary: eventApproval.aiSummary
        }
      }
    });

    // TODO: Send email notification
    await this.sendEmailNotification(eventApproval.partnerId!, {
      subject: 'Activity Approval Needed',
      template: 'event-approval-request',
      data: {
        userName: eventApproval.user?.username,
        activityTitle: eventApproval.event?.title,
        activityType: eventApproval.event?.type,
        summary: eventApproval.aiSummary,
        approvalUrl: `${process.env.FRONTEND_URL}/partnerships/approvals/${eventApproval.id}`
      }
    });
  }

  async sendApprovalResultNotification(eventApproval: EventApproval) {
    const approved = eventApproval.status === 'APPROVED';

    await this.prisma.notification.create({
      data: {
        userId: eventApproval.userId,
        type: 'PARTNER',
        title: approved ? 'Activity Approved!' : 'Activity Needs Attention',
        message: approved 
          ? `${eventApproval.partner?.username} approved your "${eventApproval.event?.title}" activity!`
          : `${eventApproval.partner?.username} has feedback on your "${eventApproval.event?.title}" activity`,
        data: {
          eventApprovalId: eventApproval.id,
          eventId: eventApproval.eventId,
          approved,
          feedback: eventApproval.partnerFeedback,
          rating: eventApproval.partnerRating
        }
      }
    });

    // TODO: Send email notification
    await this.sendEmailNotification(eventApproval.userId, {
      subject: approved ? 'Activity Approved!' : 'Partner Feedback on Activity',
      template: approved ? 'event-approved' : 'event-feedback',
      data: {
        partnerName: eventApproval.partner?.username,
        activityTitle: eventApproval.event?.title,
        feedback: eventApproval.partnerFeedback,
        rating: eventApproval.partnerRating,
        approved
      }
    });
  }

  async sendClarificationRequestNotification(eventApproval: EventApproval) {
    await this.prisma.notification.create({
      data: {
        userId: eventApproval.userId,
        type: 'PARTNER',
        title: 'Clarification Needed',
        message: `${eventApproval.partner?.username} needs clarification on your "${eventApproval.event?.title}" activity`,
        data: {
          eventApprovalId: eventApproval.id,
          eventId: eventApproval.eventId,
          clarificationNeeded: eventApproval.clarificationNeeded
        }
      }
    });

    // TODO: Send email notification
    await this.sendEmailNotification(eventApproval.userId, {
      subject: 'Activity Clarification Needed',
      template: 'clarification-request',
      data: {
        partnerName: eventApproval.partner?.username,
        activityTitle: eventApproval.event?.title,
        clarificationMessage: eventApproval.clarificationNeeded,
        responseUrl: `${process.env.FRONTEND_URL}/activities/${eventApproval.eventId}/clarify`
      }
    });
  }

  async sendClarificationProvidedNotification(eventApproval: EventApproval) {
    await this.prisma.partnerNotification.create({
      data: {
        partnerId: eventApproval.partnerId!,
        type: 'clarification_provided',
        title: 'Clarification Provided',
        message: `${eventApproval.user?.username} provided clarification for "${eventApproval.event?.title}"`,
        data: {
          eventApprovalId: eventApproval.id,
          eventId: eventApproval.eventId,
          userId: eventApproval.userId
        }
      }
    });

    // TODO: Send email notification
    await this.sendEmailNotification(eventApproval.partnerId!, {
      subject: 'Activity Clarification Provided',
      template: 'clarification-provided',
      data: {
        userName: eventApproval.user?.username,
        activityTitle: eventApproval.event?.title,
        reviewUrl: `${process.env.FRONTEND_URL}/partnerships/approvals/${eventApproval.id}`
      }
    });
  }

  async sendDailySummaryNotification(dailySummary: any) {
    // TODO: Implement daily summary notification
    // This would be called after AI generates a daily summary
    
    const partnership = await this.prisma.partnershipRequest.findFirst({
      where: {
        OR: [
          { userId: dailySummary.userId, status: 'ACCEPTED' },
          { partnerId: dailySummary.userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: true,
        partner: true
      }
    });

    if (!partnership) return;

    const partnerId = partnership.userId === dailySummary.userId 
      ? partnership.partnerId 
      : partnership.userId;

    if (partnerId) {
      await this.prisma.partnerNotification.create({
        data: {
          partnerId,
          type: 'daily_summary',
          title: 'Daily Progress Summary',
          message: `${partnership.user?.username || partnership.partner?.username}'s daily summary is ready`,
          data: {
            dailySummaryId: dailySummary.id,
            userId: dailySummary.userId,
            date: dailySummary.date
          }
        }
      });

      // TODO: Send email with summary
      await this.sendEmailNotification(partnerId, {
        subject: 'Daily Progress Summary',
        template: 'daily-summary',
        data: {
          userName: partnership.user?.username || partnership.partner?.username,
          date: dailySummary.date,
          adherence: dailySummary.adherenceBullet,
          highlights: dailySummary.highlightsBullet,
          recommendation: dailySummary.recommendationBullet,
          summaryUrl: `${process.env.FRONTEND_URL}/partnerships/summaries/${dailySummary.id}`
        }
      });
    }
  }

  private async sendEmailNotification(userId: string, emailData: any) {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just log what would be sent
    console.log(`Would send email to user ${userId}:`, emailData);
    
    // Mark notification as email sent
    // This would be done after successful email send
  }

  private async sendWebhookNotification(userId: string, webhookData: any) {
    // TODO: Integrate with webhook service
    // Check user preferences for webhook URL
    // Send HTTP POST with notification data
    console.log(`Would send webhook to user ${userId}:`, webhookData);
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    await this.prisma.partnerNotification.updateMany({
      where: {
        id: notificationId,
        partnerId: userId
      },
      data: {
        readAt: new Date()
      }
    });
  }

  async sendPlanCreatedNotification(plan: any, userId: string) {
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'PARTNER',
        title: 'New Plan Created',
        message: `${plan.creator?.username} created a new ${plan.type.toLowerCase()} plan: "${plan.title}"`,
        data: {
          planId: plan.id,
          creatorId: plan.createdBy,
          planType: plan.type
        }
      }
    });
  }

  async sendPlanUpdatedNotification(plan: any) {
    // TODO: Send to target user when plan is updated
    console.log(`Would notify about plan update: ${plan.title}`);
  }

  async sendPlanStatusChangeNotification(plan: any) {
    // TODO: Send to relevant users when plan status changes
    console.log(`Would notify about plan status change: ${plan.status}`);
  }

  async sendMilestoneCompletedNotification(plan: any, milestone: any) {
    // TODO: Send to plan creator when milestone is completed
    console.log(`Would notify about milestone completion: ${milestone.description}`);
  }

  async getPartnerNotifications(partnerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.partnerNotification.findMany({
        where: { partnerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.partnerNotification.count({
        where: { partnerId }
      })
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}