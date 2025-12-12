/**
 * OmniFit Constants
 * Application-wide constants and configuration values
 */

// Token Configuration
export const TOKEN_CONFIG = {
  SYMBOL: 'OMF',
  NAME: 'OmniFit Token',
  DECIMALS: 9,
  TOTAL_SUPPLY: 1_000_000_000, // 1 billion tokens
  INITIAL_PRICE: 0.01, // $0.01 USD
} as const;

// Reward System Constants
export const REWARD_CONFIG = {
  // Base token amounts per activity minute
  FITNESS_BASE_RATE: 2, // tokens per minute
  SPIRITUAL_BASE_RATE: 3, // tokens per minute
  
  // Multipliers
  INTENSITY_MULTIPLIERS: {
    LOW: 0.8,
    MEDIUM: 1.0,
    HIGH: 1.3,
    VERY_HIGH: 1.5,
  },
  
  MOOD_MULTIPLIERS: {
    VERY_LOW: 0.8,
    LOW: 0.9,
    NEUTRAL: 1.0,
    GOOD: 1.2,
    VERY_GOOD: 1.4,
  },
  
  // Streak bonuses
  STREAK_MULTIPLIERS: {
    WEEK_1: 1.1, // 10% bonus
    WEEK_2: 1.2, // 20% bonus
    MONTH_1: 1.3, // 30% bonus
    MONTH_2: 1.5, // 50% bonus
    MONTH_3: 1.8, // 80% bonus
    YEAR_1: 2.0, // 100% bonus
  },
  
  // Milestone rewards (fixed amounts)
  MILESTONES: {
    FIRST_WORKOUT: 100,
    FIRST_MEDITATION: 100,
    WEEK_STREAK: 250,
    MONTH_STREAK: 1000,
    LEVEL_UP_BASE: 500, // multiplied by level
    PERSONAL_RECORD: 200,
  },
  
  // Limits
  MAX_DAILY_TOKENS: 1000,
  MAX_ACTIVITY_DURATION: 480, // 8 hours in minutes
  MIN_ACTIVITY_DURATION: 1, // 1 minute
} as const;

// User Levels and Experience
export const LEVEL_CONFIG = {
  BASE_XP: 1000, // XP needed for level 2
  XP_MULTIPLIER: 1.5, // Each level requires 50% more XP
  MAX_LEVEL: 100,
  LEVEL_BONUS_PERCENT: 5, // 5% bonus per level above 1
} as const;

// API Configuration
export const API_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  TIMEOUT_MS: 30000, // 30 seconds
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
  EMAIL: {
    MAX_LENGTH: 255,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  NAME: {
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s'-]+$/,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
  ACTIVITY_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  ACTIVITY_DESCRIPTION: {
    MAX_LENGTH: 1000,
  },
} as const;

// Application URLs
export const APP_URLS = {
  FRONTEND: process.env.FRONTEND_URL || 'http://localhost:3000',
  BACKEND: process.env.BACKEND_URL || 'http://localhost:3001',
  AI_SERVICE: process.env.AI_SERVICE_URL || 'http://localhost:3002',
} as const;

// Solana Configuration
export const SOLANA_CONFIG = {
  CLUSTER: (process.env.SOLANA_CLUSTER as 'devnet' | 'testnet' | 'mainnet-beta') || 'devnet',
  RPC_ENDPOINTS: {
    DEVNET: 'https://api.devnet.solana.com',
    TESTNET: 'https://api.testnet.solana.com',
    MAINNET: 'https://api.mainnet-beta.solana.com',
  },
  PROGRAM_IDS: {
    // TODO: Replace with actual deployed program IDs
    REWARDS: 'FitTokReward1111111111111111111111111111111',
    TOKEN_MINT: 'FitToken11111111111111111111111111111111',
  },
} as const;

// Partner Configuration
export const PARTNER_CONFIG = {
  MIN_TOKEN_REQUIREMENT: 100,
  MAX_TOKEN_REQUIREMENT: 10000,
  APPROVAL_TIMEOUT_DAYS: 7,
  OFFER_DURATION_DAYS: 30,
  MAX_REDEMPTIONS_DEFAULT: 100,
} as const;

// AI Service Configuration
export const AI_CONFIG = {
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
  MODEL: 'gpt-3.5-turbo',
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000,
  },
  PROMPT_CATEGORIES: [
    'DAILY_MOTIVATION',
    'STREAK_ENCOURAGEMENT', 
    'MILESTONE_CELEBRATION',
    'PARTNER_RECOMMENDATION',
    'SOCIAL_POST',
  ],
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_003',
  
  // User Management
  USER_NOT_FOUND: 'USER_001',
  USER_ALREADY_EXISTS: 'USER_002',
  USER_INACTIVE: 'USER_003',
  
  // Events and Activities
  EVENT_NOT_FOUND: 'EVENT_001',
  EVENT_INVALID_DURATION: 'EVENT_002',
  EVENT_ALREADY_COMPLETED: 'EVENT_003',
  
  // Rewards
  REWARD_NOT_FOUND: 'REWARD_001',
  REWARD_ALREADY_CLAIMED: 'REWARD_002',
  REWARD_EXPIRED: 'REWARD_003',
  REWARD_INSUFFICIENT_BALANCE: 'REWARD_004',
  
  // Partners
  PARTNER_NOT_FOUND: 'PARTNER_001',
  PARTNER_NOT_APPROVED: 'PARTNER_002',
  PARTNER_OFFER_EXPIRED: 'PARTNER_003',
  
  // System
  VALIDATION_ERROR: 'SYS_001',
  RATE_LIMIT_EXCEEDED: 'SYS_002',
  SERVICE_UNAVAILABLE: 'SYS_003',
} as const;

// Feature Flags (for phased rollout)
export const FEATURE_FLAGS = {
  // Phase 1 - Core Features
  USER_REGISTRATION: true,
  MANUAL_ACTIVITY_LOGGING: true,
  BASIC_REWARDS: true,
  
  // Phase 2 - AI Integration
  AI_COACHING_MESSAGES: false,
  AI_CONTENT_GENERATION: false,
  AUTOMATED_REMINDERS: false,
  
  // Phase 3 - Blockchain
  TOKEN_REWARDS: false,
  WALLET_INTEGRATION: false,
  AUTOMATED_DISTRIBUTION: false,
  
  // Phase 4 - Advanced Features
  SOCIAL_FEATURES: false,
  ADVANCED_ANALYTICS: false,
  MOBILE_APP: false,
  
  // Phase 5 - Enterprise
  WHITE_LABEL: false,
  API_ACCESS: false,
  CUSTOM_INTEGRATIONS: false,
} as const;

// Database Table Names
export const TABLES = {
  USERS: 'users',
  USER_PROFILES: 'user_profiles',
  EVENTS: 'events',
  EXERCISES: 'exercises',
  PARTNERS: 'partners',
  REWARDS: 'rewards',
  STREAKS: 'streaks',
  NOTIFICATIONS: 'notifications',
  TRANSACTIONS: 'transactions',
  AI_MESSAGES: 'ai_messages',
  AI_PROMPT_TEMPLATES: 'ai_prompt_templates',
} as const;