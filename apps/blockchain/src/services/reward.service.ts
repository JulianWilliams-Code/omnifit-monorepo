import { PrismaClient } from '@prisma/client';
import { TokenService } from './token.service';
import { WalletService } from './wallet.service';
import { logger } from '../utils/logger';
import type { Reward, User } from '@omnifit/shared';

export class RewardService {
  private prisma: PrismaClient;
  private tokenService: TokenService;
  private walletService: WalletService;

  constructor(network: string = 'devnet') {
    this.prisma = new PrismaClient();
    this.tokenService = new TokenService(network);
    this.walletService = new WalletService(network);
  }

  async distributeReward(
    userId: string,
    amount: number,
    reason: string,
    eventId?: string,
    partnerId?: string
  ): Promise<{ rewardId: string; signature?: string }> {
    try {
      // Get user and validate wallet
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Create reward record
      const reward = await this.prisma.reward.create({
        data: {
          userId,
          eventId,
          partnerId,
          type: eventId ? 'ACTIVITY' : partnerId ? 'PARTNER_REFERRAL' : 'MANUAL',
          amount,
          reason,
          status: 'PENDING',
          sourceType: eventId ? 'event' : partnerId ? 'partner' : 'manual',
        },
      });

      logger.info(`Created reward record: ${reward.id} for user: ${userId}`);

      // If user has wallet, attempt blockchain distribution
      let signature: string | undefined;
      
      if (user.walletAddress) {
        try {
          const result = await this.tokenService.mintTokens(user.walletAddress, amount);
          signature = result.signature;

          // Update reward status
          await this.prisma.reward.update({
            where: { id: reward.id },
            data: {
              status: 'APPROVED',
              claimedAt: new Date(),
            },
          });

          // Update user's token balance
          await this.prisma.userProfile.update({
            where: { userId },
            data: {
              totalTokens: {
                increment: amount,
              },
            },
          });

          // Create transaction record
          await this.prisma.transaction.create({
            data: {
              userId,
              type: 'REWARD',
              amount,
              toAddress: user.walletAddress,
              signature,
              status: 'CONFIRMED',
              confirmedAt: new Date(),
            },
          });

          logger.info(`Distributed ${amount} OMF tokens to ${user.walletAddress}. Signature: ${signature}`);
        } catch (error) {
          logger.error('Failed to distribute tokens on blockchain:', error);
          // Keep reward as PENDING for manual processing
        }
      }

      return {
        rewardId: reward.id,
        signature,
      };
    } catch (error) {
      logger.error('Error distributing reward:', error);
      throw error;
    }
  }

  async processBatchRewards(limit: number = 50): Promise<{ processed: number; successful: number; failed: number }> {
    try {
      // Get pending rewards for users with wallets
      const pendingRewards = await this.prisma.reward.findMany({
        where: {
          status: 'PENDING',
          user: {
            walletAddress: {
              not: null,
            },
          },
        },
        include: {
          user: true,
        },
        take: limit,
        orderBy: {
          createdAt: 'asc',
        },
      });

      let successful = 0;
      let failed = 0;

      logger.info(`Processing ${pendingRewards.length} pending rewards...`);

      for (const reward of pendingRewards) {
        try {
          if (!reward.user.walletAddress) {
            continue;
          }

          // Mint tokens to user's wallet
          const result = await this.tokenService.mintTokens(
            reward.user.walletAddress,
            reward.amount
          );

          // Update reward status
          await this.prisma.reward.update({
            where: { id: reward.id },
            data: {
              status: 'APPROVED',
              claimedAt: new Date(),
            },
          });

          // Update user's token balance
          await this.prisma.userProfile.update({
            where: { userId: reward.userId },
            data: {
              totalTokens: {
                increment: reward.amount,
              },
            },
          });

          // Create transaction record
          await this.prisma.transaction.create({
            data: {
              userId: reward.userId,
              type: 'REWARD',
              amount: reward.amount,
              toAddress: reward.user.walletAddress,
              signature: result.signature,
              status: 'CONFIRMED',
              confirmedAt: new Date(),
            },
          });

          successful++;
          logger.info(`Processed reward ${reward.id}: ${reward.amount} OMF → ${reward.user.walletAddress}`);
        } catch (error) {
          failed++;
          logger.error(`Failed to process reward ${reward.id}:`, error);
          
          // Mark as failed for manual review
          await this.prisma.reward.update({
            where: { id: reward.id },
            data: {
              status: 'REJECTED',
            },
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`Batch processing complete: ${successful} successful, ${failed} failed`);

      return {
        processed: pendingRewards.length,
        successful,
        failed,
      };
    } catch (error) {
      logger.error('Error processing batch rewards:', error);
      throw error;
    }
  }

  async claimReward(rewardId: string, userWalletAddress: string): Promise<{ signature: string }> {
    try {
      // Get reward
      const reward = await this.prisma.reward.findUnique({
        where: { id: rewardId },
        include: { user: true },
      });

      if (!reward) {
        throw new Error(`Reward with ID ${rewardId} not found`);
      }

      if (reward.status !== 'APPROVED') {
        throw new Error('Reward is not approved for claiming');
      }

      if (reward.claimedAt) {
        throw new Error('Reward has already been claimed');
      }

      // Check if reward has expired
      if (reward.expiresAt && new Date() > reward.expiresAt) {
        await this.prisma.reward.update({
          where: { id: rewardId },
          data: { status: 'EXPIRED' },
        });
        throw new Error('Reward has expired');
      }

      // Mint tokens to user's wallet
      const result = await this.tokenService.mintTokens(userWalletAddress, reward.amount);

      // Update reward as claimed
      await this.prisma.reward.update({
        where: { id: rewardId },
        data: {
          status: 'CLAIMED',
          claimedAt: new Date(),
        },
      });

      // Update user's token balance
      await this.prisma.userProfile.update({
        where: { userId: reward.userId },
        data: {
          totalTokens: {
            increment: reward.amount,
          },
        },
      });

      // Create transaction record
      await this.prisma.transaction.create({
        data: {
          userId: reward.userId,
          type: 'CLAIM',
          amount: reward.amount,
          toAddress: userWalletAddress,
          signature: result.signature,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      logger.info(`Reward ${rewardId} claimed: ${reward.amount} OMF → ${userWalletAddress}`);

      return {
        signature: result.signature,
      };
    } catch (error) {
      logger.error('Error claiming reward:', error);
      throw error;
    }
  }

  async getRewardHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ rewards: Reward[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [rewards, total] = await Promise.all([
      this.prisma.reward.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reward.count({
        where: { userId },
      }),
    ]);

    return {
      rewards: rewards as Reward[],
      total,
      pages: Math.ceil(total / limit),
    };
  }
}