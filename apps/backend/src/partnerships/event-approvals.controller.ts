import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventApprovalsService } from './event-approvals.service';
import { ApproveEventDto } from './dto';

@ApiTags('Event Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventApprovalsController {
  constructor(private readonly eventApprovalsService: EventApprovalsService) {}

  @Get('pending-approvals')
  @ApiOperation({ summary: 'Get events requiring approval from current user as partner' })
  @ApiResponse({ status: 200, description: 'List of events pending approval' })
  async getPendingApprovals(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    // TODO: Get all events that need approval from current user
    // These are events logged by users who have this person as their partner
    // and have allowsEventReview enabled
    return this.eventApprovalsService.getPendingApprovals(
      req.user.id,
      page || 1,
      limit || 20
    );
  }

  @Post(':eventId/approve')
  @ApiOperation({ summary: 'Approve or reject a partner\'s event' })
  @ApiResponse({ status: 200, description: 'Event approval recorded' })
  async approveEvent(
    @Param('eventId') eventId: string,
    @Body() approveEventDto: ApproveEventDto,
    @Req() req: any
  ) {
    // TODO: Record approval/rejection with feedback
    // 1. Validate that current user is partner of event creator
    // 2. Create/update EventApproval record
    // 3. If approved, apply reward multiplier to the event
    // 4. Send notification to event creator
    // 5. Update reward calculation if necessary
    
    return this.eventApprovalsService.approveEvent(
      eventId,
      req.user.id,
      approveEventDto
    );
  }

  @Get(':eventId/approval-status')
  @ApiOperation({ summary: 'Get approval status for a specific event' })
  @ApiResponse({ status: 200, description: 'Event approval status' })
  async getApprovalStatus(
    @Param('eventId') eventId: string,
    @Req() req: any
  ) {
    // TODO: Get approval status for an event
    // Validate user has access (either event creator or partner)
    return this.eventApprovalsService.getApprovalStatus(eventId, req.user.id);
  }

  @Get('my-events/approval-history')
  @ApiOperation({ summary: 'Get approval history for current user\'s events' })
  @ApiResponse({ status: 200, description: 'List of event approvals for user\'s events' })
  async getMyEventApprovals(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string
  ) {
    // TODO: Get approval history for events created by current user
    return this.eventApprovalsService.getUserEventApprovals(
      req.user.id,
      page || 1,
      limit || 20,
      status
    );
  }

  @Post(':eventId/request-clarification')
  @ApiOperation({ summary: 'Request clarification on an event' })
  @ApiResponse({ status: 200, description: 'Clarification request sent' })
  async requestClarification(
    @Param('eventId') eventId: string,
    @Body() body: { message: string },
    @Req() req: any
  ) {
    // TODO: Request clarification from event creator
    // 1. Update approval status to REQUIRES_CLARIFICATION
    // 2. Store clarification message
    // 3. Send notification to event creator
    
    return this.eventApprovalsService.requestClarification(
      eventId,
      req.user.id,
      body.message
    );
  }

  @Patch(':eventId/provide-clarification')
  @ApiOperation({ summary: 'Provide clarification for an event' })
  @ApiResponse({ status: 200, description: 'Clarification provided' })
  async provideClarification(
    @Param('eventId') eventId: string,
    @Body() body: { clarification: string },
    @Req() req: any
  ) {
    // TODO: Provide clarification for an event
    // 1. Validate user is event creator
    // 2. Update event with additional details
    // 3. Reset approval status to PENDING
    // 4. Send notification to partner
    
    return this.eventApprovalsService.provideClarification(
      eventId,
      req.user.id,
      body.clarification
    );
  }

  @Get('approval-stats')
  @ApiOperation({ summary: 'Get approval statistics for current user as partner' })
  @ApiResponse({ status: 200, description: 'Approval statistics' })
  async getApprovalStats(@Req() req: any) {
    // TODO: Get statistics about approvals given by current user
    // - Total approvals given
    // - Approval rate
    // - Average response time
    // - Most common feedback themes
    
    return this.eventApprovalsService.getApprovalStats(req.user.id);
  }
}