import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { CreatePartnershipRequestDto, RespondToPartnershipDto } from './dto';
import type { PartnershipRequest, PartnershipStatus } from '@omnifit/shared';

@Injectable()
export class PartnershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createPartnershipRequest(
    userId: string,
    dto: CreatePartnershipRequestDto
  ): Promise<PartnershipRequest> {
    // TODO: Validate user exists and is not already in an active partnership
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: Check if user already has an active partnership
    const existingPartnership = await this.prisma.partnershipRequest.findFirst({
      where: {
        userId,
        status: { in: ['ACCEPTED', 'PENDING'] }
      }
    });

    if (existingPartnership) {
      throw new BadRequestException('User already has an active or pending partnership');
    }

    // TODO: If specific partner requested, validate they exist and are available
    if (dto.partnerId) {
      const partner = await this.prisma.user.findUnique({ 
        where: { id: dto.partnerId } 
      });
      
      if (!partner) {
        throw new NotFoundException('Requested partner not found');
      }

      if (dto.partnerId === userId) {
        throw new BadRequestException('Cannot request partnership with yourself');
      }

      // Check if partner already has an active partnership
      const partnerExisting = await this.prisma.partnershipRequest.findFirst({
        where: {
          OR: [
            { userId: dto.partnerId, status: { in: ['ACCEPTED', 'PENDING'] } },
            { partnerId: dto.partnerId, status: 'ACCEPTED' }
          ]
        }
      });

      if (partnerExisting) {
        throw new BadRequestException('Requested partner is not available');
      }
    }

    // Create partnership request
    const partnershipRequest = await this.prisma.partnershipRequest.create({
      data: {
        userId,
        partnerId: dto.partnerId,
        message: dto.message,
        allowsEventReview: dto.allowsEventReview ?? true,
        allowsPlanCreation: dto.allowsPlanCreation ?? true,
        allowsGoalSetting: dto.allowsGoalSetting ?? true,
        preferredGender: dto.preferredGender,
        preferredAgeRange: dto.preferredAgeRange,
        preferredExperience: dto.preferredExperience,
        preferredCategories: dto.preferredCategories || [],
        status: dto.partnerId ? 'PENDING' : 'REQUESTED', // PENDING if specific partner, REQUESTED for auto-matching
      },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true }
        },
        partner: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    // TODO: Send notification if specific partner requested
    if (dto.partnerId) {
      await this.notificationService.sendPartnershipRequestNotification(
        partnershipRequest
      );
    }

    // TODO: If auto-matching, add to matching queue (implement later)

    return partnershipRequest as PartnershipRequest;
  }

  async getPendingRequests(userId: string): Promise<PartnershipRequest[]> {
    // Get requests where current user is the requested partner
    const requests = await this.prisma.partnershipRequest.findMany({
      where: {
        partnerId: userId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: { 
            id: true, username: true, firstName: true, lastName: true, 
            avatar: true, profile: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests as PartnershipRequest[];
  }

  async respondToRequest(
    requestId: string,
    partnerId: string,
    dto: RespondToPartnershipDto
  ): Promise<PartnershipRequest> {
    const request = await this.prisma.partnershipRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        partner: true
      }
    });

    if (!request) {
      throw new NotFoundException('Partnership request not found');
    }

    if (request.partnerId !== partnerId) {
      throw new ForbiddenException('Not authorized to respond to this request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been responded to');
    }

    // Update request with response
    const updatedRequest = await this.prisma.partnershipRequest.update({
      where: { id: requestId },
      data: {
        status: dto.accept ? 'ACCEPTED' : 'REJECTED',
        partnerResponse: dto.response,
        responseAt: new Date(),
        acceptedAt: dto.accept ? new Date() : undefined
      },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true }
        },
        partner: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    // TODO: Send notification to requesting user
    await this.notificationService.sendPartnershipResponseNotification(
      updatedRequest
    );

    return updatedRequest as PartnershipRequest;
  }

  async getActivePartnerships(userId: string): Promise<PartnershipRequest[]> {
    const partnerships = await this.prisma.partnershipRequest.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { partnerId: userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: {
          select: { 
            id: true, username: true, firstName: true, lastName: true, 
            avatar: true, profile: true 
          }
        },
        partner: {
          select: { 
            id: true, username: true, firstName: true, lastName: true, 
            avatar: true, profile: true 
          }
        }
      },
      orderBy: { acceptedAt: 'desc' }
    });

    return partnerships as PartnershipRequest[];
  }

  async getPartnershipUsers(partnershipId: string, requestingUserId: string) {
    const partnership = await this.prisma.partnershipRequest.findUnique({
      where: { id: partnershipId },
      include: {
        user: {
          select: { 
            id: true, username: true, firstName: true, lastName: true, 
            avatar: true, profile: true 
          }
        },
        partner: {
          select: { 
            id: true, username: true, firstName: true, lastName: true, 
            avatar: true, profile: true 
          }
        }
      }
    });

    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }

    // Verify requesting user is part of this partnership
    if (partnership.userId !== requestingUserId && partnership.partnerId !== requestingUserId) {
      throw new ForbiddenException('Not authorized to view this partnership');
    }

    return {
      user: partnership.user,
      partner: partnership.partner,
      partnershipDetails: {
        status: partnership.status,
        allowsEventReview: partnership.allowsEventReview,
        allowsPlanCreation: partnership.allowsPlanCreation,
        allowsGoalSetting: partnership.allowsGoalSetting,
        createdAt: partnership.createdAt,
        acceptedAt: partnership.acceptedAt
      }
    };
  }

  async pausePartnership(partnershipId: string, userId: string): Promise<PartnershipRequest> {
    // TODO: Implement pause logic
    const partnership = await this.validatePartnershipAccess(partnershipId, userId);

    const updatedPartnership = await this.prisma.partnershipRequest.update({
      where: { id: partnershipId },
      data: { 
        status: 'PAUSED',
        updatedAt: new Date()
      },
      include: {
        user: true,
        partner: true
      }
    });

    // TODO: Notify the other user
    await this.notificationService.sendPartnershipStatusNotification(
      updatedPartnership,
      'paused'
    );

    return updatedPartnership as PartnershipRequest;
  }

  async resumePartnership(partnershipId: string, userId: string): Promise<PartnershipRequest> {
    // TODO: Implement resume logic
    const partnership = await this.validatePartnershipAccess(partnershipId, userId);

    if (partnership.status !== 'PAUSED') {
      throw new BadRequestException('Partnership is not paused');
    }

    const updatedPartnership = await this.prisma.partnershipRequest.update({
      where: { id: partnershipId },
      data: { 
        status: 'ACCEPTED',
        updatedAt: new Date()
      },
      include: {
        user: true,
        partner: true
      }
    });

    // TODO: Notify the other user
    await this.notificationService.sendPartnershipStatusNotification(
      updatedPartnership,
      'resumed'
    );

    return updatedPartnership as PartnershipRequest;
  }

  async endPartnership(partnershipId: string, userId: string): Promise<PartnershipRequest> {
    // TODO: Implement end logic
    const partnership = await this.validatePartnershipAccess(partnershipId, userId);

    const updatedPartnership = await this.prisma.partnershipRequest.update({
      where: { id: partnershipId },
      data: { 
        status: 'ENDED',
        endedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        user: true,
        partner: true
      }
    });

    // TODO: Archive related data, notify the other user
    await this.notificationService.sendPartnershipStatusNotification(
      updatedPartnership,
      'ended'
    );

    return updatedPartnership as PartnershipRequest;
  }

  async getPartnershipSuggestions(userId: string, limit: number = 10) {
    // TODO: Implement AI-driven partnership matching algorithm
    // For now, return basic suggestions based on:
    // 1. Similar activity levels
    // 2. Complementary goals
    // 3. No existing partnerships
    // 4. Active users

    const userProfile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!userProfile?.profile) {
      return [];
    }

    const suggestions = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        profile: {
          activityLevel: userProfile.profile.activityLevel, // Same activity level for now
        },
        // Exclude users who already have partnerships
        partnershipRequests: {
          none: {
            status: { in: ['ACCEPTED', 'PENDING'] }
          }
        },
        partnershipPartners: {
          none: {
            status: 'ACCEPTED'
          }
        }
      },
      include: {
        profile: {
          select: {
            activityLevel: true,
            fitnessGoals: true,
            spiritualGoals: true,
            level: true
          }
        }
      },
      take: limit
    });

    return suggestions.map(user => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      profile: user.profile,
      matchReason: 'Similar activity level and goals' // TODO: Make this more intelligent
    }));
  }

  private async validatePartnershipAccess(partnershipId: string, userId: string) {
    const partnership = await this.prisma.partnershipRequest.findUnique({
      where: { id: partnershipId }
    });

    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }

    if (partnership.userId !== userId && partnership.partnerId !== userId) {
      throw new ForbiddenException('Not authorized to modify this partnership');
    }

    return partnership;
  }
}