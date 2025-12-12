import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';

interface WalletVerificationRequest {
  publicKey: string;
  message: string;
  signature: string;
}

interface WalletConnectionChallenge {
  nonce: string;
  message: string;
  expiresAt: Date;
}

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a wallet connection challenge for signature verification
   * This implements best practice for preventing replay attacks and wallet spoofing
   */
  async generateConnectionChallenge(
    userId: string,
    publicKey: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<WalletConnectionChallenge> {
    // Validate Solana public key format
    if (!this.isValidSolanaPublicKey(publicKey)) {
      throw new BadRequestException('Invalid Solana wallet public key format');
    }

    // Check if wallet is already connected to another user
    const existingUser = await this.prisma.user.findFirst({
      where: {
        walletAddress: publicKey,
        id: { not: userId } // Allow same user to re-verify
      }
    });

    if (existingUser) {
      throw new ConflictException('This wallet is already connected to another account');
    }

    // Generate cryptographically secure nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Create challenge message with anti-replay protection
    const timestamp = Date.now();
    const message = this.createChallengeMessage(nonce, publicKey, userId, timestamp);
    
    // Set expiration time (15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Clean up expired verifications for this user
    await this.cleanupExpiredVerifications(userId);

    // Create verification record
    await this.prisma.walletVerification.create({
      data: {
        userId,
        publicKey,
        nonce,
        message,
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    // Audit log
    await this.auditWalletAction(
      userId,
      'challenge_generated',
      publicKey,
      null,
      { nonce, expiresAt },
      ipAddress,
      userAgent
    );

    return {
      nonce,
      message,
      expiresAt
    };
  }

  /**
   * Verify wallet signature and connect wallet to user account
   * Implements signature verification best practices and anti-spoofing measures
   */
  async verifyAndConnectWallet(
    userId: string,
    verificationData: WalletVerificationRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; walletAddress: string }> {
    const { publicKey, message, signature } = verificationData;

    // Find pending verification
    const verification = await this.prisma.walletVerification.findFirst({
      where: {
        userId,
        publicKey,
        message,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification challenge');
    }

    try {
      // Verify signature using Solana's Ed25519 signature verification
      const isValidSignature = this.verifySignature(message, signature, publicKey);
      
      if (!isValidSignature) {
        // Mark verification as rejected
        await this.prisma.walletVerification.update({
          where: { id: verification.id },
          data: { 
            status: 'REJECTED',
            signature // Store the failed signature for audit
          }
        });

        // Audit failed verification
        await this.auditWalletAction(
          userId,
          'verification_failed',
          publicKey,
          null,
          { reason: 'invalid_signature', signature },
          ipAddress,
          userAgent
        );

        throw new UnauthorizedException('Invalid wallet signature');
      }

      // Additional security: Check for suspicious patterns
      await this.checkSuspiciousActivity(userId, publicKey, ipAddress);

      // Update verification as successful
      await this.prisma.walletVerification.update({
        where: { id: verification.id },
        data: {
          status: 'VERIFIED',
          signature,
          verifiedAt: new Date()
        }
      });

      // Get current wallet address for audit
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      });

      // Update user's wallet address
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress: publicKey,
          walletConnectedAt: new Date(),
          walletLastVerified: new Date()
        }
      });

      // Audit successful connection
      await this.auditWalletAction(
        userId,
        'wallet_connected',
        publicKey,
        currentUser?.walletAddress || null,
        { verificationId: verification.id },
        ipAddress,
        userAgent
      );

      return {
        success: true,
        walletAddress: publicKey
      };

    } catch (error) {
      // If it's not our thrown error, mark as failed for different reason
      if (!error.message.includes('Invalid wallet signature')) {
        await this.prisma.walletVerification.update({
          where: { id: verification.id },
          data: { 
            status: 'REJECTED',
            signature
          }
        });

        await this.auditWalletAction(
          userId,
          'verification_error',
          publicKey,
          null,
          { error: error.message },
          ipAddress,
          userAgent
        );
      }
      
      throw error;
    }
  }

  /**
   * Disconnect wallet from user account
   */
  async disconnectWallet(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    });

    if (!user?.walletAddress) {
      throw new BadRequestException('No wallet connected to this account');
    }

    const oldWalletAddress = user.walletAddress;

    // Remove wallet from user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: null,
        walletConnectedAt: null,
        walletLastVerified: null
      }
    });

    // Invalidate all pending verifications
    await this.prisma.walletVerification.updateMany({
      where: {
        userId,
        status: 'PENDING'
      },
      data: {
        status: 'EXPIRED'
      }
    });

    // Audit disconnection
    await this.auditWalletAction(
      userId,
      'wallet_disconnected',
      '',
      oldWalletAddress,
      {},
      ipAddress,
      userAgent
    );

    return { success: true };
  }

  /**
   * Get wallet connection status for user
   */
  async getWalletStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletAddress: true,
        walletConnectedAt: true,
        walletLastVerified: true
      }
    });

    const pendingVerifications = await this.prisma.walletVerification.count({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });

    return {
      connected: !!user?.walletAddress,
      walletAddress: user?.walletAddress,
      connectedAt: user?.walletConnectedAt,
      lastVerified: user?.walletLastVerified,
      pendingVerifications
    };
  }

  /**
   * Get wallet connection history for user
   */
  async getWalletHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.prisma.walletAudit.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.walletAudit.count({ where: { userId } })
    ]);

    return {
      data: history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Validate Solana public key format
   */
  private isValidSolanaPublicKey(publicKey: string): boolean {
    try {
      const pubkey = new PublicKey(publicKey);
      return PublicKey.isOnCurve(pubkey.toBytes());
    } catch {
      return false;
    }
  }

  /**
   * Create challenge message with anti-replay protection
   * Best Practice: Include domain, timestamp, and user context to prevent replay attacks
   */
  private createChallengeMessage(
    nonce: string,
    publicKey: string,
    userId: string,
    timestamp: number
  ): string {
    return [
      'OmniFit Wallet Verification',
      '',
      `Please sign this message to verify wallet ownership.`,
      `This signature will not trigger any blockchain transaction or cost any gas fees.`,
      '',
      `Domain: ${process.env.FRONTEND_URL || 'app.omnifit.com'}`,
      `User ID: ${userId}`,
      `Wallet: ${publicKey}`,
      `Nonce: ${nonce}`,
      `Timestamp: ${timestamp}`,
      '',
      'This request will expire in 15 minutes.'
    ].join('\n');
  }

  /**
   * Verify Ed25519 signature for Solana wallet
   * Critical Security Function: Prevents wallet spoofing and unauthorized access
   */
  private verifySignature(message: string, signature: string, publicKey: string): boolean {
    try {
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);
      
      // Decode base58 signature and public key
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(publicKey);

      // Verify using tweetnacl (Ed25519)
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Check for suspicious wallet connection patterns
   */
  private async checkSuspiciousActivity(userId: string, publicKey: string, ipAddress?: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check for multiple verification attempts
    const recentAttempts = await this.prisma.walletVerification.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo }
      }
    });

    if (recentAttempts > 10) {
      await this.auditWalletAction(
        userId,
        'suspicious_activity',
        publicKey,
        null,
        { reason: 'too_many_attempts', count: recentAttempts },
        ipAddress
      );
      throw new BadRequestException('Too many verification attempts. Please try again later.');
    }

    // Check for wallet address reuse patterns
    const walletUsageCount = await this.prisma.walletAudit.count({
      where: {
        publicKey,
        action: 'wallet_connected',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days
      }
    });

    if (walletUsageCount > 5) {
      await this.auditWalletAction(
        userId,
        'suspicious_activity',
        publicKey,
        null,
        { reason: 'wallet_reuse', usageCount: walletUsageCount },
        ipAddress,
        null,
        true // Mark as suspicious
      );
    }
  }

  /**
   * Clean up expired verification records
   */
  private async cleanupExpiredVerifications(userId: string) {
    await this.prisma.walletVerification.updateMany({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      },
      data: {
        status: 'EXPIRED'
      }
    });
  }

  /**
   * Audit wallet-related actions for security monitoring
   */
  private async auditWalletAction(
    userId: string,
    action: string,
    publicKey: string,
    oldPublicKey: string | null,
    metadata: any,
    ipAddress?: string,
    userAgent?: string,
    suspicious = false
  ) {
    await this.prisma.walletAudit.create({
      data: {
        userId,
        action,
        publicKey,
        oldPublicKey,
        metadata,
        ipAddress,
        userAgent,
        suspicious,
        reason: suspicious ? metadata?.reason : null
      }
    });
  }

  /**
   * Admin function: Get suspicious wallet activity
   */
  async getSuspiciousActivity(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.walletAudit.findMany({
        where: { suspicious: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.walletAudit.count({ where: { suspicious: true } })
    ]);

    return {
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}