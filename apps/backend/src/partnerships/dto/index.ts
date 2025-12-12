import { IsOptional, IsString, IsBoolean, IsArray, IsEnum, IsNumber, IsDateString, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Partnership Request DTOs
export class CreatePartnershipRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowsEventReview?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowsPlanCreation?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowsGoalSetting?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
  preferredGender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredAgeRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  preferredExperience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsEnum(['FITNESS', 'SPIRITUAL', 'HYBRID'], { each: true })
  preferredCategories?: string[] = [];
}

export class RespondToPartnershipDto {
  @ApiProperty()
  @IsBoolean()
  accept: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  response?: string;
}

// Plan DTOs
export class CreatePlanActivityDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEnum(['WORKOUT', 'MEDITATION', 'PRAYER', 'STUDY', 'SERVICE', 'OTHER'])
  type: string;

  @ApiProperty()
  @IsEnum(['FITNESS', 'SPIRITUAL', 'HYBRID'])
  category: string;

  @ApiProperty()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  scheduledDays: number[];

  @ApiProperty()
  @IsNumber()
  @Min(5)
  @Max(480)
  duration: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  intensity?: number;
}

export class CreatePlanGoalDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiProperty()
  @IsEnum(['FITNESS', 'SPIRITUAL', 'HYBRID'])
  category: string;
}

export class CreatePlanMilestoneDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsDateString()
  targetDate: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  rewardTokens: number;
}

export class CreatePlanDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsEnum(['SPIRITUAL', 'WORKOUT', 'HYBRID'])
  type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(21)
  weeklyGoal?: number;

  @ApiProperty({ type: [CreatePlanActivityDto] })
  @IsArray()
  @Type(() => CreatePlanActivityDto)
  activities: CreatePlanActivityDto[];

  @ApiProperty({ type: [CreatePlanGoalDto] })
  @IsArray()
  @Type(() => CreatePlanGoalDto)
  goals: CreatePlanGoalDto[];

  @ApiProperty({ type: [CreatePlanMilestoneDto] })
  @IsArray()
  @Type(() => CreatePlanMilestoneDto)
  milestones: CreatePlanMilestoneDto[];
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['SPIRITUAL', 'WORKOUT', 'HYBRID'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(21)
  weeklyGoal?: number;

  @ApiPropertyOptional({ type: [CreatePlanActivityDto] })
  @IsOptional()
  @IsArray()
  @Type(() => CreatePlanActivityDto)
  activities?: CreatePlanActivityDto[];

  @ApiPropertyOptional({ type: [CreatePlanGoalDto] })
  @IsOptional()
  @IsArray()
  @Type(() => CreatePlanGoalDto)
  goals?: CreatePlanGoalDto[];

  @ApiPropertyOptional({ type: [CreatePlanMilestoneDto] })
  @IsOptional()
  @IsArray()
  @Type(() => CreatePlanMilestoneDto)
  milestones?: CreatePlanMilestoneDto[];
}

// Event Approval DTOs
export class ApproveEventDto {
  @ApiProperty()
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clarificationNeeded?: string;
}

// Daily Summary DTOs
export class GenerateDailySummaryDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean = false;
}

export class DraftPartnerReplyDto {
  @ApiProperty()
  @IsUUID()
  summaryId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;
}