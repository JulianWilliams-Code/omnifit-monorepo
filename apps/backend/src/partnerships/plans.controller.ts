import { Body, Controller, Get, Post, Patch, Delete, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@ApiTags('Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a plan for a user (partner only)' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async createPlan(
    @Body() createPlanDto: CreatePlanDto,
    @Req() req: any
  ) {
    // TODO: Verify current user is partner of the target user
    // TODO: Verify partnership allows plan creation
    // TODO: Create plan with activities, goals, and milestones
    // TODO: Send notification to target user
    
    return this.plansService.createPlan(req.user.id, createPlanDto);
  }

  @Get('created-by-me')
  @ApiOperation({ summary: 'Get plans created by current user (as partner)' })
  @ApiResponse({ status: 200, description: 'List of plans created by current user' })
  async getPlansCreatedByMe(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string
  ) {
    return this.plansService.getPlansCreatedBy(
      req.user.id,
      page || 1,
      limit || 20,
      status
    );
  }

  @Get('assigned-to-me')
  @ApiOperation({ summary: 'Get plans assigned to current user' })
  @ApiResponse({ status: 200, description: 'List of plans assigned to current user' })
  async getPlansAssignedToMe(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string
  ) {
    return this.plansService.getPlansForUser(
      req.user.id,
      page || 1,
      limit || 20,
      status
    );
  }

  @Get(':planId')
  @ApiOperation({ summary: 'Get plan details' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  async getPlan(
    @Param('planId') planId: string,
    @Req() req: any
  ) {
    // TODO: Verify user has access (either creator or assigned user)
    return this.plansService.getPlanById(planId, req.user.id);
  }

  @Patch(':planId')
  @ApiOperation({ summary: 'Update a plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  async updatePlan(
    @Param('planId') planId: string,
    @Body() updatePlanDto: UpdatePlanDto,
    @Req() req: any
  ) {
    // TODO: Verify user is plan creator
    return this.plansService.updatePlan(planId, req.user.id, updatePlanDto);
  }

  @Patch(':planId/status')
  @ApiOperation({ summary: 'Update plan status' })
  @ApiResponse({ status: 200, description: 'Plan status updated' })
  async updatePlanStatus(
    @Param('planId') planId: string,
    @Body() body: { status: string },
    @Req() req: any
  ) {
    // TODO: Allow both creator and assigned user to change status
    return this.plansService.updatePlanStatus(planId, req.user.id, body.status);
  }

  @Post(':planId/activities/:activityId/complete')
  @ApiOperation({ summary: 'Mark a planned activity as completed' })
  @ApiResponse({ status: 200, description: 'Activity marked as completed' })
  async completeActivity(
    @Param('planId') planId: string,
    @Param('activityId') activityId: string,
    @Body() body: { eventId: string }, // Link to the actual event logged
    @Req() req: any
  ) {
    // TODO: Verify user is assigned to this plan
    // TODO: Link the completed event to the planned activity
    // TODO: Update plan progress
    // TODO: Check if milestones are reached
    
    return this.plansService.completeActivity(
      planId,
      activityId,
      req.user.id,
      body.eventId
    );
  }

  @Get(':planId/progress')
  @ApiOperation({ summary: 'Get plan progress and analytics' })
  @ApiResponse({ status: 200, description: 'Plan progress data' })
  async getPlanProgress(
    @Param('planId') planId: string,
    @Req() req: any
  ) {
    // TODO: Calculate progress metrics:
    // - Activities completed vs planned
    // - Goals achievement status
    // - Milestone progress
    // - Weekly/monthly trends
    
    return this.plansService.getPlanProgress(planId, req.user.id);
  }

  @Get(':planId/upcoming-activities')
  @ApiOperation({ summary: 'Get upcoming activities for a plan' })
  @ApiResponse({ status: 200, description: 'List of upcoming activities' })
  async getUpcomingActivities(
    @Param('planId') planId: string,
    @Query('days') days?: number,
    @Req() req: any
  ) {
    // TODO: Get activities scheduled for the next X days
    return this.plansService.getUpcomingActivities(
      planId,
      req.user.id,
      days || 7
    );
  }

  @Post(':planId/milestones/:milestoneId/complete')
  @ApiOperation({ summary: 'Mark a milestone as completed' })
  @ApiResponse({ status: 200, description: 'Milestone completed' })
  async completeMilestone(
    @Param('planId') planId: string,
    @Param('milestoneId') milestoneId: string,
    @Req() req: any
  ) {
    // TODO: Mark milestone as completed
    // TODO: Award milestone rewards
    // TODO: Send notification to partner
    
    return this.plansService.completeMilestone(
      planId,
      milestoneId,
      req.user.id
    );
  }

  @Delete(':planId')
  @ApiOperation({ summary: 'Archive a plan' })
  @ApiResponse({ status: 200, description: 'Plan archived successfully' })
  async archivePlan(
    @Param('planId') planId: string,
    @Req() req: any
  ) {
    // TODO: Only plan creator can archive
    // TODO: Set status to ARCHIVED instead of deleting
    return this.plansService.archivePlan(planId, req.user.id);
  }

  @Get(':planId/share')
  @ApiOperation({ summary: 'Generate shareable link for plan progress' })
  @ApiResponse({ status: 200, description: 'Shareable link generated' })
  async generateShareableLink(
    @Param('planId') planId: string,
    @Req() req: any
  ) {
    // TODO: Generate a secure shareable link for plan progress
    // This could be shared with family/friends for additional accountability
    return this.plansService.generateShareableLink(planId, req.user.id);
  }
}