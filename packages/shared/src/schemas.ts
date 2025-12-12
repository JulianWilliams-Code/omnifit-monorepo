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
} as const;