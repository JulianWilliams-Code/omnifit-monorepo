/**
 * OmniFit Shared Utilities
 * Common utility functions used across all applications
 */

import { REWARD_CONFIG, LEVEL_CONFIG, TOKEN_CONFIG } from '../constants';
import type { Event, EventCategory, UserProfile, ActivityLevel } from '../types';

// Date utilities
export const formatDate = (date: Date, format: 'short' | 'long' | 'relative' = 'short'): string => {
  if (format === 'relative') {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }
  
  return format === 'long' 
    ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : date.toLocaleDateString();
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const getDaysUntil = (date: Date): number => {
  const today = new Date();
  const timeDiff = date.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Reward calculation utilities
export const calculateActivityReward = (
  event: Partial<Event>,
  userProfile?: UserProfile
): number => {
  if (!event.duration || event.duration < REWARD_CONFIG.MIN_ACTIVITY_DURATION) {
    return 0;
  }

  const baseRate = event.category === 'FITNESS' 
    ? REWARD_CONFIG.FITNESS_BASE_RATE 
    : REWARD_CONFIG.SPIRITUAL_BASE_RATE;
  
  let baseReward = Math.min(
    event.duration * baseRate,
    REWARD_CONFIG.MAX_DAILY_TOKENS
  );

  // Apply intensity multiplier
  if (event.intensity) {
    const intensityKey = event.intensity <= 3 ? 'LOW' :
                        event.intensity <= 6 ? 'MEDIUM' :
                        event.intensity <= 8 ? 'HIGH' : 'VERY_HIGH';
    baseReward *= REWARD_CONFIG.INTENSITY_MULTIPLIERS[intensityKey];
  }

  // Apply mood multiplier
  if (event.mood) {
    const moodMultiplier = REWARD_CONFIG.MOOD_MULTIPLIERS[event.mood] || 1;
    baseReward *= moodMultiplier;
  }

  // Apply level bonus
  if (userProfile?.level && userProfile.level > 1) {
    const levelBonus = 1 + ((userProfile.level - 1) * LEVEL_CONFIG.LEVEL_BONUS_PERCENT / 100);
    baseReward *= levelBonus;
  }

  return Math.floor(baseReward);
};

export const calculateStreakMultiplier = (streakDays: number): number => {
  if (streakDays >= 365) return REWARD_CONFIG.STREAK_MULTIPLIERS.YEAR_1;
  if (streakDays >= 90) return REWARD_CONFIG.STREAK_MULTIPLIERS.MONTH_3;
  if (streakDays >= 60) return REWARD_CONFIG.STREAK_MULTIPLIERS.MONTH_2;
  if (streakDays >= 30) return REWARD_CONFIG.STREAK_MULTIPLIERS.MONTH_1;
  if (streakDays >= 14) return REWARD_CONFIG.STREAK_MULTIPLIERS.WEEK_2;
  if (streakDays >= 7) return REWARD_CONFIG.STREAK_MULTIPLIERS.WEEK_1;
  return 1;
};

export const calculateLevelFromXP = (experience: number): number => {
  let level = 1;
  let xpRequired = LEVEL_CONFIG.BASE_XP;
  
  while (experience >= xpRequired && level < LEVEL_CONFIG.MAX_LEVEL) {
    level++;
    experience -= xpRequired;
    xpRequired = Math.floor(xpRequired * LEVEL_CONFIG.XP_MULTIPLIER);
  }
  
  return level;
};

export const getXPForNextLevel = (currentXP: number, currentLevel: number): number => {
  let xpRequired = LEVEL_CONFIG.BASE_XP;
  
  for (let i = 1; i < currentLevel; i++) {
    xpRequired = Math.floor(xpRequired * LEVEL_CONFIG.XP_MULTIPLIER);
  }
  
  return xpRequired;
};

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const truncate = (str: string, length: number): string => {
  return str.length > length ? str.substring(0, length) + '...' : str;
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
};

export const isStrongPassword = (password: string): boolean => {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[^A-Za-z0-9]/.test(password);
};

// Token utilities
export const formatTokenAmount = (amount: number, decimals: number = 2): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(decimals)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(decimals)}K`;
  }
  return amount.toLocaleString();
};

export const calculateTokenValue = (amount: number): number => {
  return amount * TOKEN_CONFIG.INITIAL_PRICE;
};

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups: Record<string, T[]>, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

export const sortByDate = <T extends { createdAt: Date }>(
  array: T[], 
  order: 'asc' | 'desc' = 'desc'
): T[] => {
  return array.sort((a, b) => {
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    return order === 'asc' ? diff : -diff;
  });
};

// Health calculation utilities
export const calculateBMI = (weight: number, height: number): number => {
  // weight in kg, height in cm
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export const estimateCaloriesBurned = (
  activityType: string,
  duration: number, // minutes
  weight: number, // kg
  intensity: number = 5 // 1-10 scale
): number => {
  // MET (Metabolic Equivalent of Task) values for different activities
  const metValues: Record<string, number> = {
    'WORKOUT': 6,
    'MEDITATION': 1,
    'PRAYER': 1.5,
    'STUDY': 1.5,
    'SERVICE': 3,
    'OTHER': 3
  };
  
  const baseMET = metValues[activityType] || 3;
  const adjustedMET = baseMET * (intensity / 5); // Scale by intensity
  
  // Calories = MET × weight(kg) × duration(hours)
  return Math.round(adjustedMET * weight * (duration / 60));
};

// Error handling utilities
export const createError = (code: string, message: string, details?: any) => {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  };
};

export const isApiError = (error: any): error is { code: string; message: string } => {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
};

// Local storage utilities (for frontend)
export const safeLocalStorage = {
  get: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {
      // Silent fail for SSR/environments without localStorage
    }
    return null;
  },
  
  set: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Silent fail
    }
  },
  
  remove: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Silent fail
    }
  }
};

// Random utilities
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};