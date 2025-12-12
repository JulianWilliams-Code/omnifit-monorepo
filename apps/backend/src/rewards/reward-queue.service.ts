import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RewardEngineService } from './reward-engine.service';
import { RewardAuditService } from './reward-audit.service';
import Redis from 'ioredis';

interface RewardJobData {
  userId: string;
  eventId?: string;
  type: 'ACTIVITY' | 'STREAK' | 'MILESTONE' | 'MANUAL';
  metadata?: any;
}

interface StreakJobData extends RewardJobData {
  type: 'STREAK';
  metadata: {
    streakType: string;
    streakCount: number;
    category: string;
  };
}

interface MilestoneJobData extends RewardJobData {
  type: 'MILESTONE';
  metadata: {
    milestoneId: string;
    planId: string;
    description: string;
    tokenAmount: number;
  };
}

@Injectable()
export class RewardQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RewardQueueService.name);
  private rewardQueue: Queue;
  private rewardWorker: Worker;
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardEngine: RewardEngineService,
    private readonly auditService: RewardAuditService
  ) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true
    });
  }

  async onModuleInit() {
    try {
      await this.redis.connect();
      this.logger.log('Connected to Redis');

      // Initialize queue
      this.rewardQueue = new Queue('reward-processing', {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50,      // Keep last 50 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      // Initialize worker
      this.rewardWorker = new Worker(
        'reward-processing',
        async (job: Job<RewardJobData>) => {
          return await this.processRewardJob(job);
        },
        {
          connection: this.redis,
          concurrency: parseInt(process.env.REWARD_WORKER_CONCURRENCY || '5'),
          removeOnComplete: 100,
          removeOnFail: 50
        }
      );

      // Set up event listeners
      this.setupEventListeners();
      
      this.logger.log('Reward queue service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize reward queue service:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.rewardWorker) {
      await this.rewardWorker.close();
    }
    if (this.rewardQueue) {
      await this.rewardQueue.close();
    }
    if (this.redis) {
      await this.redis.disconnect();
    }
    this.logger.log('Reward queue service destroyed');
  }

  private setupEventListeners() {
    this.rewardWorker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed successfully`);
    });

    this.rewardWorker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed:`, err);
    });

    this.rewardWorker.on('stalled', (jobId) => {
      this.logger.warn(`Job ${jobId} stalled`);
    });

    this.rewardQueue.on('error', (err) => {
      this.logger.error('Queue error:', err);
    });
  }

  async queueEventReward(userId: string, eventId: string, priority = 0): Promise<string> {
    try {
      const job = await this.rewardQueue.add(
        'process-event-reward',
        {
          userId,
          eventId,
          type: 'ACTIVITY'
        } as RewardJobData,
        {
          priority,
          delay: 0, // Process immediately
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      // Create job record in database
      await this.prisma.rewardJob.create({
        data: {
          jobId: job.id!,
          userId,
          eventId,
          type: 'ACTIVITY',
          status: 'PENDING'
        }
      });

      this.logger.log(`Queued event reward job ${job.id} for user ${userId}, event ${eventId}`);
      return job.id!;
    } catch (error) {
      this.logger.error(`Failed to queue event reward:`, error);
      throw error;
    }
  }

  async queueStreakReward(
    userId: string,
    streakType: string,
    streakCount: number,
    category: string
  ): Promise<string> {
    try {
      const job = await this.rewardQueue.add(
        'process-streak-reward',
        {
          userId,
          type: 'STREAK',
          metadata: {
            streakType,
            streakCount,
            category
          }
        } as StreakJobData,
        {
          priority: 10, // Higher priority for streaks
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      await this.prisma.rewardJob.create({
        data: {
          jobId: job.id!,
          userId,
          type: 'STREAK',
          status: 'PENDING'
        }
      });

      this.logger.log(`Queued streak reward job ${job.id} for user ${userId}`);
      return job.id!;
    } catch (error) {
      this.logger.error(`Failed to queue streak reward:`, error);
      throw error;
    }
  }

  async queueMilestoneReward(
    userId: string,
    milestoneId: string,
    planId: string,
    description: string,
    tokenAmount: number
  ): Promise<string> {
    try {
      const job = await this.rewardQueue.add(
        'process-milestone-reward',
        {
          userId,
          type: 'MILESTONE',
          metadata: {
            milestoneId,
            planId,
            description,
            tokenAmount
          }
        } as MilestoneJobData,
        {
          priority: 5,
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      await this.prisma.rewardJob.create({
        data: {
          jobId: job.id!,
          userId,
          type: 'MILESTONE',
          status: 'PENDING'
        }
      });

      this.logger.log(`Queued milestone reward job ${job.id} for user ${userId}`);
      return job.id!;
    } catch (error) {
      this.logger.error(`Failed to queue milestone reward:`, error);
      throw error;
    }
  }

  private async processRewardJob(job: Job<RewardJobData>): Promise<any> {
    const { userId, eventId, type, metadata } = job.data;
    
    this.logger.log(`Processing reward job ${job.id} for user ${userId}, type ${type}`);

    try {
      // Update job status to processing
      await this.updateJobStatus(job.id!, 'PROCESSING');

      let result;
      switch (type) {
        case 'ACTIVITY':
          result = await this.processEventReward(userId, eventId!);
          break;
        case 'STREAK':
          result = await this.processStreakReward(userId, metadata);
          break;
        case 'MILESTONE':
          result = await this.processMilestoneReward(userId, metadata);
          break;
        default:
          throw new Error(`Unknown reward type: ${type}`);
      }

      // Update job status to completed
      await this.updateJobStatus(job.id!, 'COMPLETED', result);
      
      this.logger.log(`Completed reward job ${job.id}: ${result?.tokensEarned || 0} tokens`);
      return result;

    } catch (error) {
      this.logger.error(`Error processing job ${job.id}:`, error);
      
      // Update job status to failed
      await this.updateJobStatus(job.id!, 'FAILED', null, error.message);
      
      // Audit the failure
      await this.auditService.logRewardProcessing(
        userId,
        'job_failed',
        { jobId: job.id!, error: error.message }
      );
      
      throw error;
    }
  }

  private async processEventReward(userId: string, eventId: string) {
    // Get event data
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { eventApproval: true }
    });

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Process reward using engine
    const rewardResult = await this.rewardEngine.processEventReward(userId, eventId, event);
    
    if (!rewardResult) {
      return { tokensEarned: 0, reason: 'No applicable rules' };
    }

    // Create reward record
    const reward = await this.prisma.reward.create({
      data: {
        userId,
        eventId,
        type: 'ACTIVITY',
        amount: rewardResult.finalAmount,
        reason: `Activity: ${event.title}`,
        sourceType: 'event',
        multiplier: rewardResult.multipliers.length > 0 ? 
          rewardResult.multipliers.reduce((acc, m) => acc * m.multiplier, 1) : null,
        bonusReason: rewardResult.multipliers.map(m => m.description).join(', '),
        status: 'APPROVED' // Auto-approve event rewards
      }
    });

    // Update user total tokens
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        totalTokens: { increment: rewardResult.finalAmount }
      }
    });

    // Audit the reward processing
    await this.auditService.logRewardProcessing(userId, 'reward_created', {
      rewardId: reward.id,
      eventId,
      amount: rewardResult.finalAmount,
      rulesApplied: rewardResult.rulesApplied
    });

    return {
      tokensEarned: rewardResult.finalAmount,
      rewardId: reward.id,
      rulesApplied: rewardResult.rulesApplied,
      multipliers: rewardResult.multipliers
    };
  }

  private async processStreakReward(userId: string, metadata: any) {
    const { streakType, streakCount, category } = metadata;

    // Process streak reward using engine
    const rewardResult = await this.rewardEngine.processStreakReward(
      userId,
      streakType,
      streakCount,
      category
    );

    if (!rewardResult) {
      return { tokensEarned: 0, reason: 'No applicable streak rules' };
    }

    // Create reward record
    const reward = await this.prisma.reward.create({
      data: {
        userId,
        type: 'STREAK',
        amount: rewardResult.finalAmount,
        reason: `${streakType} streak of ${streakCount} days (${category})`,
        sourceType: 'streak',
        status: 'APPROVED'
      }
    });

    // Update user total tokens
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        totalTokens: { increment: rewardResult.finalAmount }
      }
    });

    return {
      tokensEarned: rewardResult.finalAmount,
      rewardId: reward.id,
      streakCount,
      rulesApplied: rewardResult.rulesApplied
    };
  }

  private async processMilestoneReward(userId: string, metadata: any) {
    const { milestoneId, planId, description, tokenAmount } = metadata;

    // Create milestone reward
    const reward = await this.prisma.reward.create({
      data: {
        userId,
        type: 'MILESTONE',
        amount: tokenAmount,
        reason: `Milestone completed: ${description}`,
        sourceType: 'milestone',
        status: 'APPROVED'
      }
    });

    // Update user total tokens
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        totalTokens: { increment: tokenAmount }
      }
    });

    return {
      tokensEarned: tokenAmount,
      rewardId: reward.id,
      milestoneId,
      planId
    };
  }

  private async updateJobStatus(
    jobId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    result?: any,
    errorMessage?: string
  ) {
    try {
      await this.prisma.rewardJob.update({
        where: { jobId },
        data: {
          status,
          tokensEarned: result?.tokensEarned || null,
          rulesApplied: result?.rulesApplied || null,
          errorMessage,
          processedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : null,
          retryCount: status === 'FAILED' ? { increment: 1 } : undefined
        }
      });
    } catch (error) {
      this.logger.error(`Failed to update job status for ${jobId}:`, error);
    }
  }

  // Queue monitoring methods
  async getQueueStats() {
    const counts = await this.rewardQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed'
    );

    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed
    };
  }

  async getFailedJobs(limit = 10) {
    return await this.rewardQueue.getFailed(0, limit - 1);
  }

  async retryFailedJob(jobId: string) {
    const job = await this.rewardQueue.getJob(jobId);
    if (job) {
      await job.retry();
      this.logger.log(`Retried job ${jobId}`);
    }
  }

  async clearCompletedJobs() {
    await this.rewardQueue.clean(0, 0, 'completed');
    this.logger.log('Cleared completed jobs');
  }
}