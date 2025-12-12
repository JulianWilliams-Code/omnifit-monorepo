/**
 * OmniFit Enums
 * Centralized enum definitions for type safety
 */

export enum UserRole {
  USER = 'USER',
  PARTNER = 'PARTNER', 
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum ActivityLevel {
  SEDENTARY = 'SEDENTARY',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  ACTIVE = 'ACTIVE',
  VERY_ACTIVE = 'VERY_ACTIVE'
}

export enum EventType {
  WORKOUT = 'WORKOUT',
  MEDITATION = 'MEDITATION',
  PRAYER = 'PRAYER',
  STUDY = 'STUDY',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER'
}

export enum EventCategory {
  FITNESS = 'FITNESS',
  SPIRITUAL = 'SPIRITUAL',
  HYBRID = 'HYBRID'
}

export enum MoodLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  NEUTRAL = 'NEUTRAL',
  GOOD = 'GOOD',
  VERY_GOOD = 'VERY_GOOD'
}

export enum EnergyLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export enum PartnerType {
  GYM = 'GYM',
  STUDIO = 'STUDIO',
  CHURCH = 'CHURCH',
  NONPROFIT = 'NONPROFIT',
  RETAILER = 'RETAILER',
  SERVICE = 'SERVICE'
}

export enum PartnerStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  ACTIVE = 'ACTIVE'
}

export enum OfferType {
  DISCOUNT = 'DISCOUNT',
  FREE_TRIAL = 'FREE_TRIAL',
  EXCLUSIVE_ACCESS = 'EXCLUSIVE_ACCESS',
  MERCHANDISE = 'MERCHANDISE',
  SERVICE = 'SERVICE'
}

export enum RewardType {
  ACTIVITY = 'ACTIVITY',
  STREAK = 'STREAK',
  MILESTONE = 'MILESTONE',
  PARTNER_REFERRAL = 'PARTNER_REFERRAL',
  MANUAL = 'MANUAL'
}

export enum RewardStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CLAIMED = 'CLAIMED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED'
}

export enum StreakType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum NotificationType {
  REWARD = 'REWARD',
  STREAK = 'STREAK',
  PARTNER = 'PARTNER',
  MILESTONE = 'MILESTONE',
  SOCIAL = 'SOCIAL',
  SYSTEM = 'SYSTEM'
}

export enum TransactionType {
  REWARD = 'REWARD',
  CLAIM = 'CLAIM',
  TRANSFER = 'TRANSFER',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum AIMessageType {
  DAILY_MOTIVATION = 'DAILY_MOTIVATION',
  STREAK_ENCOURAGEMENT = 'STREAK_ENCOURAGEMENT',
  MILESTONE_CELEBRATION = 'MILESTONE_CELEBRATION',
  PARTNER_RECOMMENDATION = 'PARTNER_RECOMMENDATION'
}

// Utility type to get enum values as union type
export type EnumValues<T extends Record<string, string>> = T[keyof T];

// Helper functions for enum operations
export const getEnumValues = <T extends Record<string, string>>(enumObject: T): T[keyof T][] => {
  return Object.values(enumObject);
};

export const isValidEnumValue = <T extends Record<string, string>>(
  enumObject: T, 
  value: string
): value is T[keyof T] => {
  return Object.values(enumObject).includes(value as T[keyof T]);
};

export const getEnumKeys = <T extends Record<string, string>>(enumObject: T): (keyof T)[] => {
  return Object.keys(enumObject) as (keyof T)[];
};