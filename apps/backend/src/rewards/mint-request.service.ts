import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardAuditService } from './reward-audit.service';
import * as fs from 'fs/promises';
import * as path from 'path';

interface RiskAssessment {
  score: number; // 0-1, higher is riskier
  factors: string[];
  reasoning: string;
}

@Injectable()
export class MintRequestService {
  private readonly mintRequestStorePath = path.join(
    process.cwd(),
    'apps/blockchain/mint-requests'
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: RewardAuditService
  ) {
    this.ensureMintRequestDirectory();
  }

  private async ensureMintRequestDirectory() {
    try {
      await fs.mkdir(this.mintRequestStorePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create mint request directory:', error);
    }
  }

  async createMintRequest(
    userId: string,
    rewardIds: string[],
    recipientWallet: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Validate rewards belong to user and are claimable
    const rewards = await this.prisma.reward.findMany({
      where: {
        id: { in: rewardIds },
        userId,
        status: 'APPROVED'
      }
    });

    if (rewards.length !== rewardIds.length) {
      throw new BadRequestException('Some rewards are not available for claiming');
    }

    const totalAmount = rewards.reduce((sum, reward) => sum + reward.amount, 0);

    if (totalAmount <= 0) {
      throw new BadRequestException('No tokens to claim');
    }

    // Validate wallet address format (basic Solana address validation)
    if (!this.isValidSolanaAddress(recipientWallet)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    // Risk assessment
    const riskAssessment = await this.assessRisk(userId, totalAmount, recipientWallet);

    // Determine initial status based on risk
    const status = riskAssessment.score > 0.7 ? 'ADMIN_REVIEW' : 'QUEUED';

    // Create mint request
    const mintRequest = await this.prisma.mintRequest.create({
      data: {
        userId,
        tokenAmount: totalAmount,
        recipientWallet,
        description: `Claiming ${rewards.length} rewards (${totalAmount} tokens)`,
        rewardIds,
        status,
        riskScore: riskAssessment.score,
        ipAddress,
        userAgent
      }
    });

    // Mark rewards as claimed
    await this.prisma.reward.updateMany({
      where: { id: { in: rewardIds } },
      data: {
        status: 'CLAIMED',
        claimedAt: new Date()
      }
    });

    // Create JSON file for blockchain operator
    await this.createMintRequestFile(mintRequest, rewards, riskAssessment);

    // Audit the mint request
    await this.auditService.logMintRequest(
      userId,
      'mint_request_created',
      mintRequest.id,
      {
        tokenAmount: totalAmount,
        rewardIds,
        recipientWallet,
        riskScore: riskAssessment.score,
        status
      },
      userId,
      ipAddress,
      userAgent
    );

    return {
      mintRequestId: mintRequest.id,
      tokenAmount: totalAmount,
      status,
      riskScore: riskAssessment.score,
      requiresReview: status === 'ADMIN_REVIEW',
      estimatedProcessingTime: status === 'ADMIN_REVIEW' ? '24-48 hours' : '1-6 hours'
    };
  }

  async approveMintRequest(
    mintRequestId: string,
    adminId: string,
    notes?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const mintRequest = await this.prisma.mintRequest.findUnique({
      where: { id: mintRequestId }
    });

    if (!mintRequest) {
      throw new BadRequestException('Mint request not found');
    }

    if (mintRequest.status !== 'ADMIN_REVIEW' && mintRequest.status !== 'QUEUED') {
      throw new BadRequestException('Mint request cannot be approved in current status');
    }

    // Update mint request
    const updatedRequest = await this.prisma.mintRequest.update({
      where: { id: mintRequestId },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewNotes: notes,
        reviewedAt: new Date()
      }
    });

    // Update the JSON file
    await this.updateMintRequestFile(mintRequestId, { 
      approved: true, 
      approvedBy: adminId,
      approvedAt: new Date().toISOString(),
      notes
    });

    // Audit the approval
    await this.auditService.logMintRequest(
      updatedRequest.userId,
      'mint_request_approved',
      mintRequestId,
      {
        approvedBy: adminId,
        notes,
        tokenAmount: updatedRequest.tokenAmount
      },
      adminId,
      ipAddress,
      userAgent
    );

    return updatedRequest;
  }

  async rejectMintRequest(
    mintRequestId: string,
    adminId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const mintRequest = await this.prisma.mintRequest.findUnique({
      where: { id: mintRequestId },
      include: {
        user: { select: { id: true } }
      }
    });

    if (!mintRequest) {
      throw new BadRequestException('Mint request not found');
    }

    if (mintRequest.status !== 'ADMIN_REVIEW' && mintRequest.status !== 'QUEUED') {
      throw new BadRequestException('Mint request cannot be rejected in current status');
    }

    // Update mint request
    const updatedRequest = await this.prisma.mintRequest.update({
      where: { id: mintRequestId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewNotes: reason,
        reviewedAt: new Date()
      }
    });

    // Restore rewards to approved status
    await this.prisma.reward.updateMany({
      where: { id: { in: mintRequest.rewardIds } },
      data: {
        status: 'APPROVED',
        claimedAt: null
      }
    });

    // Update the JSON file
    await this.updateMintRequestFile(mintRequestId, { 
      rejected: true,
      rejectedBy: adminId,
      rejectedAt: new Date().toISOString(),
      reason
    });

    // Audit the rejection
    await this.auditService.logMintRequest(
      updatedRequest.userId,
      'mint_request_rejected',
      mintRequestId,
      {
        rejectedBy: adminId,
        reason,
        tokenAmount: updatedRequest.tokenAmount
      },
      adminId,
      ipAddress,
      userAgent
    );

    return updatedRequest;
  }

  async updateMintStatus(
    mintRequestId: string,
    signature: string,
    explorerUrl?: string
  ) {
    const mintRequest = await this.prisma.mintRequest.update({
      where: { id: mintRequestId },
      data: {
        status: 'COMPLETED',
        mintSignature: signature,
        explorerUrl,
        mintedAt: new Date()
      }
    });

    // Update the JSON file
    await this.updateMintRequestFile(mintRequestId, {
      minted: true,
      mintSignature: signature,
      explorerUrl,
      mintedAt: new Date().toISOString()
    });

    return mintRequest;
  }

  async getPendingMintRequests(adminId: string) {
    const requests = await this.prisma.mintRequest.findMany({
      where: {
        status: { in: ['QUEUED', 'ADMIN_REVIEW', 'APPROVED'] }
      },
      include: {
        user: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: [
        { status: 'desc' }, // ADMIN_REVIEW first
        { riskScore: 'desc' }, // Higher risk first
        { requestedAt: 'asc' } // Older first
      ]
    });

    return requests;
  }

  async getUserMintRequests(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.mintRequest.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' }
      }),
      this.prisma.mintRequest.count({ where: { userId } })
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  private async assessRisk(
    userId: string,
    amount: number,
    wallet: string
  ): Promise<RiskAssessment> {
    const factors: string[] = [];
    let score = 0;

    // Check user account age
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });

    if (user) {
      const accountAgeMs = Date.now() - user.createdAt.getTime();
      const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

      if (accountAgeDays < 7) {
        score += 0.4;
        factors.push('New account (< 7 days)');
      } else if (accountAgeDays < 30) {
        score += 0.2;
        factors.push('Recent account (< 30 days)');
      }
    }

    // Check claim amount
    if (amount > 10000) {
      score += 0.3;
      factors.push('Large claim amount (> 10,000 tokens)');
    } else if (amount > 5000) {
      score += 0.1;
      factors.push('Moderate claim amount (> 5,000 tokens)');
    }

    // Check recent mint requests
    const recentRequests = await this.prisma.mintRequest.count({
      where: {
        userId,
        requestedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (recentRequests > 3) {
      score += 0.3;
      factors.push('Multiple recent requests (> 3 in 24h)');
    } else if (recentRequests > 1) {
      score += 0.1;
      factors.push('Recent request activity');
    }

    // Check if wallet has been used before
    const walletUsage = await this.prisma.mintRequest.count({
      where: {
        recipientWallet: wallet,
        userId: { not: userId },
        status: { in: ['COMPLETED', 'APPROVED'] }
      }
    });

    if (walletUsage > 0) {
      score += 0.2;
      factors.push('Wallet used by other users');
    }

    const reasoning = factors.length > 0 
      ? `Risk factors: ${factors.join(', ')}`
      : 'No significant risk factors detected';

    return {
      score: Math.min(score, 1), // Cap at 1.0
      factors,
      reasoning
    };
  }

  private isValidSolanaAddress(address: string): boolean {
    // Basic Solana address validation
    return /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(address);
  }

  private async createMintRequestFile(
    mintRequest: any,
    rewards: any[],
    riskAssessment: RiskAssessment
  ) {
    const fileName = `mint-request-${mintRequest.id}.json`;
    const filePath = path.join(this.mintRequestStorePath, fileName);

    const data = {
      mintRequestId: mintRequest.id,
      userId: mintRequest.userId,
      tokenAmount: mintRequest.tokenAmount,
      recipientWallet: mintRequest.recipientWallet,
      status: mintRequest.status,
      requestedAt: mintRequest.requestedAt,
      description: mintRequest.description,
      
      // Risk assessment
      riskScore: riskAssessment.score,
      riskFactors: riskAssessment.factors,
      riskReasoning: riskAssessment.reasoning,
      
      // Reward details
      rewardCount: rewards.length,
      rewardBreakdown: rewards.map(r => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        reason: r.reason,
        earnedAt: r.earnedAt
      })),
      
      // Operator instructions
      instructions: {
        network: process.env.SOLANA_NETWORK || 'devnet',
        program: 'token_program',
        action: 'mint_to_account',
        requiresReview: mintRequest.status === 'ADMIN_REVIEW'
      },
      
      // Audit trail
      auditTrail: [
        {
          action: 'request_created',
          timestamp: mintRequest.requestedAt,
          actor: 'user',
          data: { tokenAmount: mintRequest.tokenAmount }
        }
      ]
    };

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Failed to create mint request file ${fileName}:`, error);
    }
  }

  private async updateMintRequestFile(mintRequestId: string, update: any) {
    const fileName = `mint-request-${mintRequestId}.json`;
    const filePath = path.join(this.mintRequestStorePath, fileName);

    try {
      const existingData = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(existingData);
      
      // Update data
      Object.assign(data, update);
      
      // Add to audit trail
      data.auditTrail.push({
        action: Object.keys(update)[0],
        timestamp: new Date().toISOString(),
        actor: update.approvedBy || update.rejectedBy || 'system',
        data: update
      });

      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Failed to update mint request file ${fileName}:`, error);
    }
  }
}