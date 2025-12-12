#!/usr/bin/env node

import { Command } from 'commander';
import { TokenService } from './services/token.service';
import { WalletService } from './services/wallet.service';
import { RewardService } from './services/reward.service';
import { logger } from './utils/logger';

const program = new Command();

program
  .name('omnifit-blockchain')
  .description('OmniFit Blockchain CLI Tools')
  .version('1.0.0');

// Token commands
const tokenCmd = program
  .command('token')
  .description('Token management commands');

tokenCmd
  .command('create-mint')
  .description('Create OMF token mint')
  .option('-n, --network <network>', 'Solana network', 'devnet')
  .action(async (options) => {
    try {
      const tokenService = new TokenService(options.network);
      const result = await tokenService.createTokenMint();
      logger.info('Token mint created:', result);
    } catch (error) {
      logger.error('Failed to create token mint:', error);
      process.exit(1);
    }
  });

tokenCmd
  .command('mint-tokens')
  .description('Mint OMF tokens to wallet')
  .requiredOption('-t, --to <address>', 'Recipient wallet address')
  .requiredOption('-a, --amount <amount>', 'Amount to mint')
  .option('-n, --network <network>', 'Solana network', 'devnet')
  .action(async (options) => {
    try {
      const tokenService = new TokenService(options.network);
      const result = await tokenService.mintTokens(options.to, parseInt(options.amount));
      logger.info('Tokens minted:', result);
    } catch (error) {
      logger.error('Failed to mint tokens:', error);
      process.exit(1);
    }
  });

// Wallet commands
const walletCmd = program
  .command('wallet')
  .description('Wallet management commands');

walletCmd
  .command('create')
  .description('Create a new wallet')
  .action(async () => {
    try {
      const walletService = new WalletService();
      const wallet = await walletService.createWallet();
      logger.info('Wallet created:', {
        publicKey: wallet.publicKey.toString(),
        secretKey: '[REDACTED]' // Don't log secret keys
      });
    } catch (error) {
      logger.error('Failed to create wallet:', error);
      process.exit(1);
    }
  });

walletCmd
  .command('balance')
  .description('Check wallet balance')
  .requiredOption('-w, --wallet <address>', 'Wallet address')
  .option('-n, --network <network>', 'Solana network', 'devnet')
  .action(async (options) => {
    try {
      const walletService = new WalletService(options.network);
      const balance = await walletService.getTokenBalance(options.wallet);
      logger.info(`Wallet balance: ${balance} OMF`);
    } catch (error) {
      logger.error('Failed to get balance:', error);
      process.exit(1);
    }
  });

// Reward commands
const rewardCmd = program
  .command('reward')
  .description('Reward management commands');

rewardCmd
  .command('distribute')
  .description('Distribute rewards to user')
  .requiredOption('-u, --user <userId>', 'User ID')
  .requiredOption('-a, --amount <amount>', 'Reward amount')
  .requiredOption('-r, --reason <reason>', 'Reward reason')
  .option('-n, --network <network>', 'Solana network', 'devnet')
  .action(async (options) => {
    try {
      const rewardService = new RewardService(options.network);
      const result = await rewardService.distributeReward(
        options.user,
        parseInt(options.amount),
        options.reason
      );
      logger.info('Reward distributed:', result);
    } catch (error) {
      logger.error('Failed to distribute reward:', error);
      process.exit(1);
    }
  });

rewardCmd
  .command('process-batch')
  .description('Process batch rewards from database')
  .option('-n, --network <network>', 'Solana network', 'devnet')
  .option('-l, --limit <limit>', 'Batch size limit', '50')
  .action(async (options) => {
    try {
      const rewardService = new RewardService(options.network);
      const result = await rewardService.processBatchRewards(parseInt(options.limit));
      logger.info('Batch rewards processed:', result);
    } catch (error) {
      logger.error('Failed to process batch rewards:', error);
      process.exit(1);
    }
  });

// Setup command
program
  .command('setup')
  .description('Initialize blockchain infrastructure')
  .option('-n, --network <network>', 'Solana network', 'devnet')
  .action(async (options) => {
    try {
      logger.info('Setting up OmniFit blockchain infrastructure...');
      
      const tokenService = new TokenService(options.network);
      const walletService = new WalletService(options.network);
      
      // Create main program wallet
      logger.info('Creating program wallet...');
      const programWallet = await walletService.createWallet();
      
      // Create token mint
      logger.info('Creating OMF token mint...');
      const mintResult = await tokenService.createTokenMint();
      
      logger.info('Setup complete!', {
        network: options.network,
        programWallet: programWallet.publicKey.toString(),
        tokenMint: mintResult.mint
      });
    } catch (error) {
      logger.error('Setup failed:', error);
      process.exit(1);
    }
  });

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Parse arguments
program.parse();