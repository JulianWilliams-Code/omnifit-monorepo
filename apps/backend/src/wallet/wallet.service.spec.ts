import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';

describe('WalletService', () => {
  let service: WalletService;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const testUserId = 'test-user-id';
  const testKeypair = nacl.sign.keyPair();
  const testPublicKey = bs58.encode(testKeypair.publicKey);
  const testMessage = 'Test message for signing';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            walletVerification: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
            },
            walletAudit: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateConnectionChallenge', () => {
    it('should generate a valid challenge', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.walletVerification.create.mockResolvedValue({
        id: 'verification-id',
        nonce: 'test-nonce',
        message: 'test-message',
        expiresAt: new Date(),
      } as any);

      const result = await service.generateConnectionChallenge(
        testUserId,
        testPublicKey
      );

      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresAt');
      expect(result.message).toContain('OmniFit Wallet Verification');
      expect(prismaService.walletVerification.create).toHaveBeenCalled();
    });

    it('should reject invalid public key', async () => {
      await expect(
        service.generateConnectionChallenge(testUserId, 'invalid-key')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if wallet is already connected to another user', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'different-user-id',
        walletAddress: testPublicKey,
      } as any);

      await expect(
        service.generateConnectionChallenge(testUserId, testPublicKey)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyAndConnectWallet', () => {
    const testNonce = 'test-nonce';
    
    beforeEach(() => {
      // Create a valid signature for testing
      const messageBytes = new TextEncoder().encode(testMessage);
      const signature = nacl.sign.detached(messageBytes, testKeypair.secretKey);
      const signatureBase58 = bs58.encode(signature);

      this.testSignature = signatureBase58;
    });

    it('should verify and connect wallet with valid signature', async () => {
      const messageBytes = new TextEncoder().encode(testMessage);
      const signature = nacl.sign.detached(messageBytes, testKeypair.secretKey);
      const signatureBase58 = bs58.encode(signature);

      prismaService.walletVerification.findFirst.mockResolvedValue({
        id: 'verification-id',
        userId: testUserId,
        publicKey: testPublicKey,
        message: testMessage,
        nonce: testNonce,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      } as any);

      prismaService.walletVerification.update.mockResolvedValue({} as any);
      prismaService.user.findUnique.mockResolvedValue({ walletAddress: null } as any);
      prismaService.user.update.mockResolvedValue({} as any);
      prismaService.walletAudit.create.mockResolvedValue({} as any);

      const result = await service.verifyAndConnectWallet(
        testUserId,
        {
          publicKey: testPublicKey,
          message: testMessage,
          signature: signatureBase58,
        }
      );

      expect(result.success).toBe(true);
      expect(result.walletAddress).toBe(testPublicKey);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: {
          walletAddress: testPublicKey,
          walletConnectedAt: expect.any(Date),
          walletLastVerified: expect.any(Date),
        },
      });
    });

    it('should reject invalid signature', async () => {
      const invalidSignature = 'invalid-signature';

      prismaService.walletVerification.findFirst.mockResolvedValue({
        id: 'verification-id',
        userId: testUserId,
        publicKey: testPublicKey,
        message: testMessage,
        nonce: testNonce,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      } as any);

      prismaService.walletVerification.update.mockResolvedValue({} as any);
      prismaService.walletAudit.create.mockResolvedValue({} as any);

      await expect(
        service.verifyAndConnectWallet(testUserId, {
          publicKey: testPublicKey,
          message: testMessage,
          signature: invalidSignature,
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired verification', async () => {
      prismaService.walletVerification.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyAndConnectWallet(testUserId, {
          publicKey: testPublicKey,
          message: testMessage,
          signature: 'any-signature',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disconnectWallet', () => {
    it('should disconnect wallet successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: testUserId,
        walletAddress: testPublicKey,
      } as any);

      prismaService.user.update.mockResolvedValue({} as any);
      prismaService.walletVerification.updateMany.mockResolvedValue({ count: 1 } as any);
      prismaService.walletAudit.create.mockResolvedValue({} as any);

      const result = await service.disconnectWallet(testUserId);

      expect(result.success).toBe(true);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: {
          walletAddress: null,
          walletConnectedAt: null,
          walletLastVerified: null,
        },
      });
    });

    it('should reject if no wallet is connected', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: testUserId,
        walletAddress: null,
      } as any);

      await expect(
        service.disconnectWallet(testUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWalletStatus', () => {
    it('should return wallet status', async () => {
      const mockUser = {
        walletAddress: testPublicKey,
        walletConnectedAt: new Date(),
        walletLastVerified: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.walletVerification.count.mockResolvedValue(0);

      const status = await service.getWalletStatus(testUserId);

      expect(status.connected).toBe(true);
      expect(status.walletAddress).toBe(testPublicKey);
      expect(status.connectedAt).toBe(mockUser.walletConnectedAt);
      expect(status.pendingVerifications).toBe(0);
    });

    it('should return disconnected status', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        walletAddress: null,
        walletConnectedAt: null,
        walletLastVerified: null,
      } as any);

      prismaService.walletVerification.count.mockResolvedValue(0);

      const status = await service.getWalletStatus(testUserId);

      expect(status.connected).toBe(false);
      expect(status.walletAddress).toBeNull();
    });
  });

  describe('Security Features', () => {
    it('should validate Solana public key format', async () => {
      const invalidKeys = [
        'invalid',
        '123',
        'not-base58',
        'too-short',
        '1'.repeat(100), // too long
      ];

      for (const invalidKey of invalidKeys) {
        await expect(
          service.generateConnectionChallenge(testUserId, invalidKey)
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should detect suspicious activity', async () => {
      // Mock multiple recent attempts
      prismaService.walletVerification.count.mockResolvedValue(15);
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.generateConnectionChallenge(testUserId, testPublicKey)
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit logs for all actions', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.walletVerification.create.mockResolvedValue({
        id: 'verification-id',
        nonce: 'test-nonce',
        message: 'test-message',
        expiresAt: new Date(),
      } as any);

      await service.generateConnectionChallenge(testUserId, testPublicKey);

      expect(prismaService.walletAudit.create).toHaveBeenCalled();
    });
  });

  describe('Message Creation', () => {
    it('should create proper challenge message format', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.walletVerification.create.mockResolvedValue({
        id: 'verification-id',
        nonce: 'test-nonce',
        message: 'test-message',
        expiresAt: new Date(),
      } as any);

      const result = await service.generateConnectionChallenge(testUserId, testPublicKey);

      expect(result.message).toContain('OmniFit Wallet Verification');
      expect(result.message).toContain('User ID:');
      expect(result.message).toContain('Wallet:');
      expect(result.message).toContain('Nonce:');
      expect(result.message).toContain('Timestamp:');
      expect(result.message).toContain('15 minutes');
    });
  });
});