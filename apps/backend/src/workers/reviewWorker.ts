import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, EventCategory } from '@prisma/client';
import axios from 'axios';

interface AIReviewResult {
  confidence: number; // 0.0 to 1.0
  approved: boolean;
  reasoning: string;
  flagged_concerns: string[];
}

interface ReviewThresholds {
  auto_approve: number; // If confidence >= this, auto-approve
  auto_reject: number;  // If confidence <= this, auto-reject
  human_review: number; // Else, send to human review
}

@Injectable()
export class ReviewWorkerService {
  private readonly logger = new Logger(ReviewWorkerService.name);
  private readonly thresholds: ReviewThresholds;
  private readonly aiServiceUrl: string;

  constructor(private prisma: PrismaService) {
    // TODO: Load thresholds from admin settings or config
    this.thresholds = {
      auto_approve: parseFloat(process.env.AI_AUTO_APPROVE_THRESHOLD || '0.85'),
      auto_reject: parseFloat(process.env.AI_AUTO_REJECT_THRESHOLD || '0.3'),
      human_review: parseFloat(process.env.AI_HUMAN_REVIEW_THRESHOLD || '0.6'),
    };

    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3002';
  }

  async processEventReview(eventId: string): Promise<void> {
    try {
      this.logger.log(`Starting review process for event ${eventId}`);

      // Fetch event details
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              activityLevel: true,
            },
          },
        },
      });

      if (!event) {
        this.logger.error(`Event ${eventId} not found`);
        return;
      }

      // Update event status to AI_REVIEW
      await this.prisma.event.update({
        where: { id: eventId },
        data: { 
          // TODO: Add status enum to Event model in schema
          // status: EventStatus.AI_REVIEW 
        },
      });

      // Call AI review service
      const aiResult = await this.callAIReviewService(event);

      // Process based on AI confidence score
      if (aiResult.confidence >= this.thresholds.auto_approve) {
        await this.autoApproveEvent(eventId, aiResult);
      } else if (aiResult.confidence <= this.thresholds.auto_reject) {
        await this.autoRejectEvent(eventId, aiResult);
      } else {
        await this.sendToHumanReview(eventId, aiResult);
      }

    } catch (error) {
      this.logger.error(`Failed to process review for event ${eventId}:`, error);
      await this.handleReviewError(eventId, error);
    }
  }

  private async callAIReviewService(event: any): Promise<AIReviewResult> {
    try {
      const reviewPayload = {
        event: {
          type: event.type,
          category: event.category,
          duration: event.duration,
          intensity: event.intensity,
          description: event.description,
          notes: event.notes,
        },
        user: {
          activityLevel: event.user.activityLevel,
          // TODO: Add user history context
        },
        context: {
          timestamp: event.createdAt,
          // TODO: Add seasonal/temporal context
        },
      };

      const response = await axios.post(
        `${this.aiServiceUrl}/api/v1/social/review-event`,
        reviewPayload,
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
            // TODO: Add internal service authentication
          },
        }
      );

      return response.data as AIReviewResult;

    } catch (error) {
      this.logger.error('Failed to call AI review service:', error);
      
      // Fallback: Send to human review if AI service fails
      return {
        confidence: this.thresholds.human_review,
        approved: false,
        reasoning: 'AI service unavailable - requires human review',
        flagged_concerns: ['ai_service_error'],
      };
    }
  }

  private async autoApproveEvent(eventId: string, aiResult: AIReviewResult): Promise<void> {
    try {
      this.logger.log(`Auto-approving event ${eventId} (confidence: ${aiResult.confidence})`);

      await this.prisma.$transaction(async (tx) => {
        // Update event status
        await tx.event.update({
          where: { id: eventId },
          data: {
            // TODO: Add status enum - status: EventStatus.APPROVED_AI,
            // TODO: Add AI review fields
          },
        });

        // TODO: Create reward record
        // await this.createRewardRecord(eventId, 'ACTIVITY', tx);

        // Log audit trail
        await tx.auditLog.create({
          data: {
            userId: '', // TODO: Get from event
            action: 'EVENT_AUTO_APPROVED',
            resource: 'Event',
            resourceId: eventId,
            metadata: {
              ai_confidence: aiResult.confidence,
              reasoning: aiResult.reasoning,
            },
          },
        });
      });

      // TODO: Trigger reward processing queue

    } catch (error) {
      this.logger.error(`Failed to auto-approve event ${eventId}:`, error);
      throw error;
    }
  }

  private async autoRejectEvent(eventId: string, aiResult: AIReviewResult): Promise<void> {
    try {
      this.logger.log(`Auto-rejecting event ${eventId} (confidence: ${aiResult.confidence})`);

      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          // TODO: Add status enum - status: EventStatus.REJECTED_AI,
          // TODO: Add rejection reason fields
        },
      });

      // Log audit trail
      await this.prisma.auditLog.create({
        data: {
          userId: '', // TODO: Get from event
          action: 'EVENT_AUTO_REJECTED',
          resource: 'Event',
          resourceId: eventId,
          metadata: {
            ai_confidence: aiResult.confidence,
            reasoning: aiResult.reasoning,
            concerns: aiResult.flagged_concerns,
          },
        },
      });

      // TODO: Notify user of rejection with improvement suggestions

    } catch (error) {
      this.logger.error(`Failed to auto-reject event ${eventId}:`, error);
      throw error;
    }
  }

  private async sendToHumanReview(eventId: string, aiResult: AIReviewResult): Promise<void> {
    try {
      this.logger.log(`Sending event ${eventId} to human review (confidence: ${aiResult.confidence})`);

      await this.prisma.$transaction(async (tx) => {
        // Update event status
        await tx.event.update({
          where: { id: eventId },
          data: {
            // TODO: Add status enum - status: EventStatus.HUMAN_REVIEW,
          },
        });

        // Create human review request
        // TODO: Add EventApproval model integration
        /*
        await tx.eventApproval.create({
          data: {
            eventId: eventId,
            userId: event.userId,
            partnerId: null, // TODO: Assign to available partner
            status: 'PENDING',
            aiSummary: aiResult.reasoning,
          },
        });
        */

        // Log audit trail
        await tx.auditLog.create({
          data: {
            userId: '', // TODO: Get from event
            action: 'EVENT_SENT_TO_HUMAN_REVIEW',
            resource: 'Event',
            resourceId: eventId,
            metadata: {
              ai_confidence: aiResult.confidence,
              reasoning: aiResult.reasoning,
              concerns: aiResult.flagged_concerns,
            },
          },
        });
      });

      // TODO: Notify available human reviewers
      // await this.notifyHumanReviewers(eventId, aiResult);

    } catch (error) {
      this.logger.error(`Failed to send event ${eventId} to human review:`, error);
      throw error;
    }
  }

  private async handleReviewError(eventId: string, error: any): Promise<void> {
    try {
      // Default to human review on error
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          // TODO: Add status enum - status: EventStatus.REVIEW_ERROR,
        },
      });

      // Log error
      await this.prisma.auditLog.create({
        data: {
          userId: '', // TODO: Get from event
          action: 'EVENT_REVIEW_ERROR',
          resource: 'Event',
          resourceId: eventId,
          metadata: {
            error: error.message,
            stack: error.stack,
          },
        },
      });

      // TODO: Alert administrators
      
    } catch (logError) {
      this.logger.error(`Failed to log review error for event ${eventId}:`, logError);
    }
  }

  // Admin methods for threshold management
  async updateReviewThresholds(newThresholds: Partial<ReviewThresholds>): Promise<void> {
    // TODO: Implement admin endpoint to update thresholds
    // TODO: Validate threshold values (0.0 to 1.0, auto_approve > human_review > auto_reject)
    // TODO: Save to database for persistence
    Object.assign(this.thresholds, newThresholds);
    this.logger.log('Review thresholds updated:', this.thresholds);
  }

  getReviewThresholds(): ReviewThresholds {
    return { ...this.thresholds };
  }

  // Health check for monitoring
  async healthCheck(): Promise<{ status: string; thresholds: ReviewThresholds; aiServiceUrl: string }> {
    return {
      status: 'active',
      thresholds: this.thresholds,
      aiServiceUrl: this.aiServiceUrl,
    };
  }
}