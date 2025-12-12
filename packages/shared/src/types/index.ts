/**
 * OmniFit Shared Types
 * Common TypeScript interfaces and types used across all applications
 */

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  walletAddress?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile;
}

export interface UserProfile {
  bio?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  height?: number; // cm
  weight?: number; // kg
  activityLevel: ActivityLevel;
  timezone: string;
  language: string;
  // Faith & Fitness Goals
  fitnessGoals: string[];
  spiritualGoals: string[];
  // Progress Tracking
  currentFitnessStreak: number;
  longestFitnessStreak: number;
  currentSpiritualStreak: number;
  longestSpiritualStreak: number;
  currentCombinedStreak: number;
  longestCombinedStreak: number;
  // Gamification
  level: number;
  experience: number;
  totalTokens: number;
}

export interface Event {
  id: string;
  userId: string;
  type: EventType;
  category: EventCategory;
  title: string;
  description?: string;
  duration?: number; // minutes
  intensity?: number; // 1-10 scale
  mood?: MoodLevel;
  energy?: EnergyLevel;
  location?: string;
  notes?: string;
  tags: string[];
  completedAt: Date;
  createdAt: Date;
  // Fitness specific
  caloriesBurned?: number;
  exercises?: Exercise[];
  // Spiritual specific
  technique?: string;
  reflection?: string;
  gratitude?: string[];
  insights?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number; // kg
  distance?: number; // meters
  duration?: number; // seconds
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  type: PartnerType;
  status: PartnerStatus;
  description: string;
  logo?: string;
  website?: string;
  contactPerson: string;
  // Partnership Details
  offerType: OfferType;
  offerDescription: string;
  tokenRequirement: number; // tokens needed to claim
  maxRedemptions?: number;
  validUntil?: Date;
  // Admin fields
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reward {
  id: string;
  userId: string;
  eventId?: string;
  partnerId?: string;
  type: RewardType;
  amount: number; // token amount
  reason: string;
  status: RewardStatus;
  // Metadata
  sourceType: 'event' | 'streak' | 'milestone' | 'partner' | 'manual';
  multiplier?: number;
  bonusReason?: string;
  // Timestamps
  earnedAt: Date;
  claimedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Streak {
  id: string;
  userId: string;
  type: StreakType;
  category: EventCategory;
  currentCount: number;
  longestCount: number;
  lastActiveDate: Date;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  // Milestone tracking
  milestones: StreakMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StreakMilestone {
  days: number;
  bonus: number; // token bonus
  achieved: boolean;
  achievedAt?: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  walletAddress?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  readAt?: Date;
  createdAt: Date;
}

// Blockchain Types
export interface TokenBalance {
  address: string;
  balance: number;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  fromAddress?: string;
  toAddress?: string;
  signature?: string;
  status: TransactionStatus;
  createdAt: Date;
  confirmedAt?: Date;
}

// AI Types
export interface AIMessage {
  id: string;
  userId: string;
  type: AIMessageType;
  content: string;
  context?: Record<string, any>;
  generatedAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  variables: string[];
  isActive: boolean;
}

// Enums (will be defined in separate enum file)
export type UserRole = 'USER' | 'PARTNER' | 'ADMIN' | 'SUPER_ADMIN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type EventType = 'WORKOUT' | 'MEDITATION' | 'PRAYER' | 'STUDY' | 'SERVICE' | 'OTHER';
export type EventCategory = 'FITNESS' | 'SPIRITUAL' | 'HYBRID';
export type MoodLevel = 'VERY_LOW' | 'LOW' | 'NEUTRAL' | 'GOOD' | 'VERY_GOOD';
export type EnergyLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type PartnerType = 'GYM' | 'STUDIO' | 'CHURCH' | 'NONPROFIT' | 'RETAILER' | 'SERVICE';
export type PartnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE';
export type OfferType = 'DISCOUNT' | 'FREE_TRIAL' | 'EXCLUSIVE_ACCESS' | 'MERCHANDISE' | 'SERVICE';
export type RewardType = 'ACTIVITY' | 'STREAK' | 'MILESTONE' | 'PARTNER_REFERRAL' | 'MANUAL';
export type RewardStatus = 'PENDING' | 'APPROVED' | 'CLAIMED' | 'EXPIRED' | 'REJECTED';
export type StreakType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type NotificationType = 'REWARD' | 'STREAK' | 'PARTNER' | 'MILESTONE' | 'SOCIAL' | 'SYSTEM';
export type TransactionType = 'REWARD' | 'CLAIM' | 'TRANSFER' | 'STAKE' | 'UNSTAKE';
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
export type AIMessageType = 'DAILY_MOTIVATION' | 'STREAK_ENCOURAGEMENT' | 'MILESTONE_CELEBRATION' | 'PARTNER_RECOMMENDATION';

// AI Marketing & Community Types
export interface SocialPostRequest {
  platform: 'twitter' | 'telegram' | 'linkedin' | 'newsletter';
  content: string;
  scheduledFor?: Date;
  isThread?: boolean;
  metadata?: Record<string, any>;
}

export interface SocialPostResult {
  success: boolean;
  postId?: string;
  error?: string;
  platform: string;
}

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  userId?: string;
  timestamp?: Date;
}

// Review Worker Types
export interface AIReviewRequest {
  eventId: string;
  event: {
    type: string;
    category: string;
    duration?: number;
    intensity?: number;
    description?: string;
    notes?: string;
  };
  user: {
    activityLevel: string;
    history?: any[];
  };
  context: {
    timestamp: Date;
  };
}

export interface AIReviewResult {
  confidence: number;
  approved: boolean;
  reasoning: string;
  flagged_concerns: string[];
}

export enum EventStatus {
  PENDING = 'PENDING',
  AI_REVIEW = 'AI_REVIEW', 
  APPROVED_AI = 'APPROVED_AI',
  HUMAN_REVIEW = 'HUMAN_REVIEW',
  APPROVED_PARTNER = 'APPROVED_PARTNER',
  REJECTED_AI = 'REJECTED_AI',
  REJECTED_PARTNER = 'REJECTED_PARTNER',
  REVIEW_ERROR = 'REVIEW_ERROR'
}

// Reward Engine Types
export interface RewardCalculationInput {
  eventId: string;
  userId: string;
  eventType: string;
  category: string;
  duration?: number;
  intensity?: number;
  partnerApproved?: boolean;
}

export interface RewardCalculationResult {
  baseReward: number;
  streakMultiplier: number;
  partnerBonus: number;
  categoryMultiplier: number;
  finalAmount: number;
  cappedAmount: number;
  reasoning: string[];
}

// Mint Request Types
export interface MintRequest {
  id: string;
  userId: string;
  tokenAmount: number;
  recipientWallet: string;
  description: string;
  status: MintRequestStatus;
  rewardIds: string[];
  requestedAt: Date;
  mintSignature?: string;
  explorerUrl?: string;
}

export enum MintRequestStatus {
  QUEUED = 'QUEUED',
  ADMIN_REVIEW = 'ADMIN_REVIEW', 
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MINTING = 'MINTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Signature Verification Types
export interface NonceChallenge {
  nonce: string;
  message: string;
  expiresAt: Date;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  publicKey?: string;
  message?: string;
  error?: string;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: 'up' | 'down';
    ai_service: 'up' | 'down';
    blockchain: 'up' | 'down';
    redis: 'up' | 'down';
  };
  version: string;
}

// Analytics Types
export interface UserAnalytics {
  userId: string;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  eventsCreated: number;
  tokensEarned: number;
  lastActivity: Date;
}

export interface PlatformAnalytics {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;  
    monthly: number;
  };
  totalEvents: number;
  totalRewards: number;
  totalTokensMinted: number;
  growth: {
    userGrowthRate: number;
    activityGrowthRate: number;
  };
}

// Human Accountability System Types
export type PartnershipStatus = 'REQUESTED' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PAUSED' | 'ENDED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CLARIFICATION';
export type PlanType = 'SPIRITUAL' | 'WORKOUT' | 'HYBRID';
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface PartnershipRequest {
  id: string;
  userId: string;
  partnerId?: string;
  status: PartnershipStatus;
  message?: string;ring;
  allowsEventReview: boolean;
  allowsPlanCreation: boolean;
  allowsGoalSetting: boolean;
  preferredGender?: Gender;
  preferredAgeRange?: string;
  preferredExperience?: string;
  preferredCategories: EventCategory[];
  partnerResponse?: string;
  responseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  endedAt?: Date;
}

export interface Plan {
  id: string;
  createdBy: string;
  type: PlanType;
  title: string;
  description?: string;
  status: PlanStatus;
  startDate: Date;
  endDate?: Date;
  weeklyGoal?: number;
  activities: any; // JSON structure
  goals: any; // JSON structure
  milestones: any; // JSON structure
  completedActivities: number;
  totalActivities: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventApproval {
  id: string;
  eventId: string;
  userId: string;
  partnerId?: string;
  status: ApprovalStatus;
  partnerFeedback?: string;
  partnerRating?: number;
  clarificationNeeded?: string;
  aiSummary?: string;
  approvalMultiplier?: number;
  submittedAt: Date;
  reviewedAt?: Date;
}

export interface DailySummary {
  id: string;
  userId: string;
  date: Date;
  adherenceBullet: string;
  highlightsBullet: string;
  recommendationBullet: string;
  activitiesCompleted: number;
  activitiesPlanned: number;
  totalDuration: number;
  avgMood?: number;
  avgEnergy?: number;
  partnerNotified: boolean;
  partnerViewed: boolean;
  partnerViewedAt?: Date;
  generatedAt: Date;
  updatedAt: Date;
}

export interface PartnerNotification {
  id: string;
  partnerId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  emailSent: boolean;
  webhookSent: boolean;
  deliveredAt?: Date;
  readAt?: Date;
  actionTaken?: string;
  createdAt: Date;
}