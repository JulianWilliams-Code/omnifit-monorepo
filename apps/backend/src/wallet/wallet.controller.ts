import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

interface GenerateChallengeDto {
  publicKey: string;
}

interface VerifyWalletDto {
  publicKey: string;
  message: string;
  signature: string;
}

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  async generateChallenge(
    @Request() req: any,
    @Body() challengeData: GenerateChallengeDto
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');

    const challenge = await this.walletService.generateConnectionChallenge(
      userId,
      challengeData.publicKey,
      ipAddress,
      userAgent
    );

    return {
      success: true,
      data: challenge,
      message: 'Please sign the message with your wallet to verify ownership'
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyWallet(
    @Request() req: any,
    @Body() verificationData: VerifyWalletDto
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.walletService.verifyAndConnectWallet(
      userId,
      verificationData,
      ipAddress,
      userAgent
    );

    return {
      success: true,
      data: result,
      message: 'Wallet connected successfully'
    };
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnectWallet(@Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.walletService.disconnectWallet(
      userId,
      ipAddress,
      userAgent
    );

    return {
      success: true,
      data: result,
      message: 'Wallet disconnected successfully'
    };
  }

  @Get('status')
  async getWalletStatus(@Request() req: any) {
    const userId = req.user.id;
    const status = await this.walletService.getWalletStatus(userId);

    return {
      success: true,
      data: status
    };
  }

  @Get('history')
  async getWalletHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const userId = req.user.id;
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');

    const history = await this.walletService.getWalletHistory(userId, pageNum, limitNum);

    return {
      success: true,
      data: history.data,
      pagination: history.pagination
    };
  }

  /**
   * Admin endpoint for monitoring suspicious wallet activity
   */
  @Get('admin/suspicious')
  async getSuspiciousActivity(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // TODO: Add admin role check
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '50');

    const activities = await this.walletService.getSuspiciousActivity(pageNum, limitNum);

    return {
      success: true,
      data: activities.data,
      pagination: activities.pagination
    };
  }
}