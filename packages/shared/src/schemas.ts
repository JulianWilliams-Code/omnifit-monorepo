/**
 * OmniFit Validation Schemas
 * Zod schemas for input validation across all applications
 */

import { z } from 'zod';
import { VALIDATION_RULES } from './constants';

// Base schemas
export const IdSchema = z.string().uuid('Invalid ID format');
export const EmailSchema = z.string().email('Invalid email format').max(VALIDATION_RULES.EMAIL.MAX_LENGTH);
export const PasswordSchema = z.string()
  .min(VALIDATION_RULES.PASSWORD.MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.PASSWORD.MAX_LENGTH, `Password must not exceed ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`);

export const UsernameSchema = z.string()
  .min(VALIDATION_RULES.USERNAME.MIN_LENGTH, `Username must be at least ${VALIDATION_RULES.USERNAME.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.USERNAME.MAX_LENGTH, `Username must not exceed ${VALIDATION_RULES.USERNAME.MAX_LENGTH} characters`)
  .regex(VALIDATION_RULES.USERNAME.PATTERN, 'Username can only contain letters, numbers, underscores, and hyphens');

// Enum schemas
export const UserRoleSchema = z.enum(['USER', 'PARTNER', 'ADMIN', 'SUPER_ADMIN']);
export const GenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional();
export const ActivityLevelSchema = z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']);
export const EventTypeSchema = z.enum(['WORKOUT', 'MEDITATION', 'PRAYER', 'STUDY', 'SERVICE', 'OTHER']);
export const EventCategorySchema = z.enum(['FITNESS', 'SPIRITUAL', 'HYBRID']);
export const MoodLevelSchema = z.enum(['VERY_LOW', 'LOW', 'NEUTRAL', 'GOOD', 'VERY_GOOD']).optional();
export const EnergyLevelSchema = z.enum(['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']).optional();

// User schemas
export const CreateUserSchema = z.object({
  email: EmailSchema,
  username: UsernameSchema,
  password: PasswordSchema,
  firstName: z.string().max(VALIDATION_RULES.NAME.MAX_LENGTH).optional(),
  lastName: z.string().max(VALIDATION_RULES.NAME.MAX_LENGTH).optional(),
  walletAddress: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().max(VALIDATION_RULES.NAME.MAX_LENGTH).optional(),
  lastName: z.string().max(VALIDATION_RULES.NAME.MAX_LENGTH).optional(),
  avatar: z.string().url().optional(),
  walletAddress: z.string().optional(),
}).partial();

export const UserProfileSchema = z.object({
  bio: z.string().max(VALIDATION_RULES.BIO.MAX_LENGTH).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: GenderSchema,
  height: z.number().min(50).max(300).optional(), // cm
  weight: z.number().min(20).max(500).optional(), // kg
  activityLevel: ActivityLevelSchema,
  timezone: z.string().default('UTC'),
  language: z.string().default('en'),
  fitnessGoals: z.array(z.string()).default([]),
  spiritualGoals: z.array(z.string()).default([]),
});

// Authentication schemas
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Event schemas
export const CreateEventSchema = z.object({
  type: EventTypeSchema,
  category: EventCategorySchema,
  title: z.string().min(VALIDATION_RULES.ACTIVITY_TITLE.MIN_LENGTH).max(VALIDATION_RULES.ACTIVITY_TITLE.MAX_LENGTH),
  description: z.string().max(VALIDATION_RULES.ACTIVITY_DESCRIPTION.MAX_LENGTH).optional(),
  duration: z.number().min(1).max(480), // 1 minute to 8 hours
  intensity: z.number().min(1).max(10).optional(),
  mood: MoodLevelSchema,
  energy: EnergyLevelSchema,
  location: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  completedAt: z.coerce.date().default(() => new Date()),
  // Fitness specific
  caloriesBurned: z.number().min(0).optional(),
  exercises: z.array(z.object({
    name: z.string().min(1).max(100),
    sets: z.number().min(0).optional(),
    reps: z.number().min(0).optional(),
    weight: z.number().min(0).optional(), // kg
    distance: z.number().min(0).optional(), // meters
    duration: z.number().min(0).optional(), // seconds
  })).default([]),
  // Spiritual specific
  technique: z.string().max(100).optional(),
  reflection: z.string().max(1000).optional(),
  gratitude: z.array(z.string()).default([]),
  insights: z.array(z.string()).default([]),
});

export const UpdateEventSchema = CreateEventSchema.partial().omit({ completedAt: true });

// Partner schemas
export const CreatePartnerSchema = z.object({
  name: z.string().min(1).max(100),
  email: EmailSchema,
  type: z.enum(['GYM', 'STUDIO', 'CHURCH', 'NONPROFIT', 'RETAILER', 'SERVICE']),
  description: z.string().min(10).max(1000),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  contactPerson: z.string().min(1).max(100),
  offerType: z.enum(['DISCOUNT', 'FREE_TRIAL', 'EXCLUSIVE_ACCESS', 'MERCHANDISE', 'SERVICE']),
  offerDescription: z.string().min(10).max(500),
  tokenRequirement: z.number().min(100).max(10000),
  maxRedemptions: z.number().min(1).optional(),
  validUntil: z.coerce.date().optional(),
});

export const UpdatePartnerSchema = CreatePartnerSchema.partial();

export const ApprovePartnerSchema = z.object({
  approved: z.boolean(),
  notes: z.string().max(500).optional(),
});

// Reward schemas
export const CreateRewardSchema = z.object({
  userId: IdSchema,
  eventId: IdSchema.optional(),
  partnerId: IdSchema.optional(),
  type: z.enum(['ACTIVITY', 'STREAK', 'MILESTONE', 'PARTNER_REFERRAL', 'MANUAL']),
  amount: z.number().min(1),
  reason: z.string().min(1).max(200),
  sourceType: z.enum(['event', 'streak', 'milestone', 'partner', 'manual']),
  multiplier: z.number().min(0).optional(),
  bonusReason: z.string().max(200).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const ClaimRewardSchema = z.object({
  rewardIds: z.array(IdSchema),
});

// Streak schemas
export const CreateStreakSchema = z.object({
  userId: IdSchema,
  type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  category: EventCategorySchema,
});

export const UpdateStreakSchema = z.object({
  isActive: z.boolean(),
  endDate: z.coerce.date().optional(),
});

// Notification schemas
export const CreateNotificationSchema = z.object({
  userId: IdSchema,
  type: z.enum(['REWARD', 'STREAK', 'PARTNER', 'MILESTONE', 'SOCIAL', 'SYSTEM']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
});

export const MarkNotificationReadSchema = z.object({
  notificationIds: z.array(IdSchema),
});

// AI schemas
export const GenerateAIMessageSchema = z.object({
  userId: IdSchema,
  type: z.enum(['DAILY_MOTIVATION', 'STREAK_ENCOURAGEMENT', 'MILESTONE_CELEBRATION', 'PARTNER_RECOMMENDATION']),
  context: z.record(z.any()).optional(),
});

export const AIPromptTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  template: z.string().min(10).max(2000),
  variables: z.array(z.string()),
  isActive: z.boolean().default(true),
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const FilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// Wallet schemas
export const ConnectWalletSchema = z.object({
  address: z.string().min(32).max(44), // Solana address length
  signature: z.string().optional(),
  network: z.enum(['devnet', 'testnet', 'mainnet-beta']).default('devnet'),
});

export const WalletTransactionSchema = z.object({
  signature: z.string(),
  amount: z.number(),
  type: z.enum(['REWARD', 'CLAIM', 'TRANSFER', 'STAKE', 'UNSTAKE']),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
});

// Admin schemas
export const AdminCreateUserSchema = CreateUserSchema.extend({
  role: UserRoleSchema,
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
});

export const AdminUpdateUserSchema = UpdateUserSchema.extend({
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

export const ManualRewardSchema = z.object({
  userId: IdSchema,
  amount: z.number().min(1).max(10000),
  reason: z.string().min(5).max(200),
  expiresAt: z.coerce.date().optional(),
});

// Human Accountability Schemas
export const CreatePartnershipRequestSchema = z.object({
  partnerId: IdSchema.optional(), // If requesting specific partner
  message: z.string().max(500).optional(),
  allowsEventReview: z.boolean().default(true),
  allowsPlanCreation: z.boolean().default(true),
  allowsGoalSetting: z.boolean().default(true),
  preferredGender: GenderSchema.optional(),
  preferredAgeRange: z.string().max(20).optional(),
  preferredExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  preferredCategories: z.array(EventCategorySchema).default([]),
});

export const RespondToPartnershipSchema = z.object({
  accept: z.boolean(),
  response: z.string().max(500).optional(),
});

export const CreatePlanSchema = z.object({
  userId: IdSchema, // User the plan is for
  type: z.enum(['SPIRITUAL', 'WORKOUT', 'HYBRID']),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  weeklyGoal: z.number().min(1).max(21).optional(),
  activities: z.array(z.object({
    name: z.string(),
    type: EventTypeSchema,
    category: EventCategorySchema,
    scheduledDays: z.array(z.number().min(0).max(6)), // 0=Sunday, 6=Saturday
    duration: z.number().min(5).max(480), // minutes
    intensity: z.number().min(1).max(10).optional(),
  })),
  goals: z.array(z.object({
    description: z.string(),
    targetValue: z.number().optional(),
    targetDate: z.coerce.date().optional(),
    category: EventCategorySchema,
  })),
  milestones: z.array(z.object({
    description: z.string(),
    targetDate: z.coerce.date(),
    rewardTokens: z.number().min(0),
  })),
});

export const UpdatePlanSchema = CreatePlanSchema.partial().omit({ userId: true });

export const ApproveEventSchema = z.object({
  approve: z.boolean(),
  feedback: z.string().max(500).optional(),
  rating: z.number().min(1).max(5).optional(),
  clarificationNeeded: z.string().max(500).optional(),
});

export const GenerateDailySummarySchema = z.object({
  userId: IdSchema,
  date: z.coerce.date(),
  forceRegenerate: z.boolean().default(false),
});

export const DraftPartnerReplySchema = z.object({
  summaryId: IdSchema,
  context: z.string().max(1000).optional(), // Additional context from partner
});

// Reward Engine Schemas
export const ClaimRewardsSchema = z.object({
  rewardIds: z.array(IdSchema).min(1, 'At least one reward must be selected'),
  recipientWallet: z.string().regex(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/, 'Invalid Solana wallet address'),
});

export const CreateRewardRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  conditions: z.object({
    eventType: z.array(z.string()).optional(),
    category: z.array(z.string()).optional(),
    minDuration: z.number().min(0).optional(),
    maxDuration: z.number().min(0).optional(),
    minIntensity: z.number().min(1).max(10).optional(),
    maxIntensity: z.number().min(1).max(10).optional(),
    streakCount: z.number().min(1).optional(),
    partnerApproved: z.boolean().optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
    dayOfWeek: z.array(z.number().min(0).max(6)).optional()
  }),
  baseAmount: z.number().min(1).max(10000),
  multiplierRules: z.array(z.object({
    condition: z.string(),
    multiplier: z.number().min(0.1).max(10),
    description: z.string()
  })).optional(),
  maxDailyAmount: z.number().min(1).optional(),
  maxUserAmount: z.number().min(1).optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional()
});

export const UpdateRewardRuleSchema = CreateRewardRuleSchema.partial();

export const ApproveMintRequestSchema = z.object({
  notes: z.string().max(500).optional()
});

export const RejectMintRequestSchema = z.object({
  reason: z.string().min(1).max(500)
});

// Wallet Connection Schemas
export const GenerateWalletChallengeSchema = z.object({
  publicKey: z.string().regex(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/, 'Invalid Solana wallet address')
});

export const VerifyWalletSignatureSchema = z.object({
  publicKey: z.string().regex(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/, 'Invalid Solana wallet address'),
  message: z.string().min(1, 'Message is required'),
  signature: z.string().min(1, 'Signature is required')
});

// Export all schemas as a collection
export const schemas = {
  // Base
  Id: IdSchema,
  Email: EmailSchema,
  Password: PasswordSchema,
  Username: UsernameSchema,
  
  // User
  CreateUser: CreateUserSchema,
  UpdateUser: UpdateUserSchema,
  UserProfile: UserProfileSchema,
  
  // Auth
  Login: LoginSchema,
  RefreshToken: RefreshTokenSchema,
  ChangePassword: ChangePasswordSchema,
  
  // Event
  CreateEvent: CreateEventSchema,
  UpdateEvent: UpdateEventSchema,
  
  // Partner
  CreatePartner: CreatePartnerSchema,
  UpdatePartner: UpdatePartnerSchema,
  ApprovePartner: ApprovePartnerSchema,
  
  // Reward
  CreateReward: CreateRewardSchema,
  ClaimReward: ClaimRewardSchema,
  
  // Streak
  CreateStreak: CreateStreakSchema,
  UpdateStreak: UpdateStreakSchema,
  
  // Notification
  CreateNotification: CreateNotificationSchema,
  MarkNotificationRead: MarkNotificationReadSchema,
  
  // AI
  GenerateAIMessage: GenerateAIMessageSchema,
  AIPromptTemplate: AIPromptTemplateSchema,
  
  // Common
  Pagination: PaginationSchema,
  Filter: FilterSchema,
  
  // Wallet
  ConnectWallet: ConnectWalletSchema,
  WalletTransaction: WalletTransactionSchema,
  
  // Admin
  AdminCreateUser: AdminCreateUserSchema,
  AdminUpdateUser: AdminUpdateUserSchema,
  ManualReward: ManualRewardSchema,
  
  // Human Accountability
  CreatePartnershipRequest: CreatePartnershipRequestSchema,
  RespondToPartnership: RespondToPartnershipSchema,
  CreatePlan: CreatePlanSchema,
  UpdatePlan: UpdatePlanSchema,
  ApproveEvent: ApproveEventSchema,
  GenerateDailySummary: GenerateDailySummarySchema,
  DraftPartnerReply: DraftPartnerReplySchema,
  
  // Reward Engine
  ClaimRewards: ClaimRewardsSchema,
  CreateRewardRule: CreateRewardRuleSchema,
  UpdateRewardRule: UpdateRewardRuleSchema,
  ApproveMintRequest: ApproveMintRequestSchema,
  RejectMintRequest: RejectMintRequestSchema,
  
  // Wallet Connection
  GenerateWalletChallenge: GenerateWalletChallengeSchema,
  VerifyWalletSignature: VerifyWalletSignatureSchema,
} as const;