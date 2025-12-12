#!/usr/bin/env node

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MintRequest {
  mintRequestId: string;
  userId: string;
  tokenAmount: number;
  recipientWallet: string;
  status: string;
  description: string;
  rewardIds: string[];
}

interface MintOperation {
  mintAddress: string;
  recipientWallet: string;
  amount: number;
  decimals: number;
  mintRequestId?: string;
}

interface MintResult {
  signature: string;
  mintAddress: string;
  recipientWallet: string;
  tokenAccount: string;
  amount: number;
  explorerUrl: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

class TokenMinter {
  private connection: Connection;
  private payerKeypair: Keypair;
  private mintRequestsPath: string;
  private mintLogsPath: string;

  constructor(network: string = 'devnet') {
    const rpcUrl = this.getRpcUrl(network);
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    this.payerKeypair = this.loadPayerKeypair();
    this.mintRequestsPath = path.join(process.cwd(), 'apps/blockchain/mint-requests');
    this.mintLogsPath = path.join(process.cwd(), 'apps/blockchain/mint-logs');
    
    this.ensureDirectories();
  }

  private getRpcUrl(network: string): string {
    switch (network) {
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'mainnet-beta':
        return process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  private loadPayerKeypair(): Keypair {
    const keypairPath = process.env.SOLANA_KEYPAIR_PATH || 
      path.join(process.cwd(), 'apps/blockchain/keypairs/payer.json');
    
    try {
      const keypairData = require(keypairPath);
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    } catch (error) {
      throw new Error(`Failed to load payer keypair from ${keypairPath}: ${error}`);
    }
  }

  private loadMintAuthority(mintAddress: string): Keypair {
    const authorityPath = path.join(
      process.cwd(),
      'apps/blockchain/keypairs/authorities',
      `${mintAddress}-authority.json`
    );

    try {
      const keypairData = require(authorityPath);
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    } catch (error) {
      throw new Error(`Failed to load mint authority for ${mintAddress}: ${error}`);
    }
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.mintRequestsPath, { recursive: true });
      await fs.mkdir(this.mintLogsPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async mintTokens(operation: MintOperation): Promise<MintResult> {
    console.log('🏗️  Starting mint operation...');
    console.log(`Mint: ${operation.mintAddress}`);
    console.log(`Recipient: ${operation.recipientWallet}`);
    console.log(`Amount: ${operation.amount / Math.pow(10, operation.decimals)} tokens`);

    try {
      const mintPublicKey = new PublicKey(operation.mintAddress);
      const recipientPublicKey = new PublicKey(operation.recipientWallet);
      
      // Load mint authority
      const mintAuthority = this.loadMintAuthority(operation.mintAddress);
      console.log(`Using mint authority: ${mintAuthority.publicKey.toBase58()}`);

      // Get or create associated token account for recipient
      console.log('📦 Getting/creating token account...');
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.payerKeypair, // Payer for account creation
        mintPublicKey,     // Mint
        recipientPublicKey // Owner
      );

      console.log(`Token account: ${recipientTokenAccount.address.toBase58()}`);

      // Check existing balance
      let initialBalance = 0;
      try {
        const accountInfo = await getAccount(this.connection, recipientTokenAccount.address);
        initialBalance = Number(accountInfo.amount);
        console.log(`Initial balance: ${initialBalance / Math.pow(10, operation.decimals)} tokens`);
      } catch (error) {
        console.log('New token account, initial balance: 0');
      }

      // Mint tokens
      console.log('🪙 Minting tokens...');
      const signature = await mintTo(
        this.connection,
        this.payerKeypair,           // Payer
        mintPublicKey,               // Mint
        recipientTokenAccount.address, // Destination
        mintAuthority,               // Mint authority
        operation.amount,            // Amount in lamports
        [],                         // Multi signers
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );

      console.log('✅ Mint successful!');
      console.log(`Transaction signature: ${signature}`);

      // Verify the mint
      const finalBalance = await this.verifyMint(
        recipientTokenAccount.address,
        initialBalance + operation.amount
      );

      const result: MintResult = {
        signature,
        mintAddress: operation.mintAddress,
        recipientWallet: operation.recipientWallet,
        tokenAccount: recipientTokenAccount.address.toBase58(),
        amount: operation.amount,
        explorerUrl: this.getExplorerUrl(signature),
        timestamp: new Date().toISOString(),
        success: true
      };

      // Log the operation
      await this.logMintOperation(result, operation);

      // Update mint request file if provided
      if (operation.mintRequestId) {
        await this.updateMintRequestFile(operation.mintRequestId, result);
      }

      console.log(`🎉 Minted ${operation.amount / Math.pow(10, operation.decimals)} tokens successfully!`);
      console.log(`Explorer: ${result.explorerUrl}`);

      return result;

    } catch (error) {
      console.error('❌ Mint operation failed:', error);
      
      const failedResult: MintResult = {
        signature: '',
        mintAddress: operation.mintAddress,
        recipientWallet: operation.recipientWallet,
        tokenAccount: '',
        amount: operation.amount,
        explorerUrl: '',
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      };

      await this.logMintOperation(failedResult, operation);
      
      throw error;
    }
  }

  private async verifyMint(tokenAccount: PublicKey, expectedBalance: number): Promise<number> {
    try {
      const accountInfo = await getAccount(this.connection, tokenAccount);
      const actualBalance = Number(accountInfo.amount);
      
      if (actualBalance !== expectedBalance) {
        console.warn(`⚠️  Balance mismatch. Expected: ${expectedBalance}, Actual: ${actualBalance}`);
      } else {
        console.log('✅ Balance verified');
      }
      
      return actualBalance;
    } catch (error) {
      console.error('Failed to verify balance:', error);
      throw error;
    }
  }

  private getExplorerUrl(signature: string): string {
    const network = process.env.SOLANA_NETWORK || 'devnet';
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
  }

  private async logMintOperation(result: MintResult, operation: MintOperation) {
    const logFileName = `mint-${Date.now()}.json`;
    const logFilePath = path.join(this.mintLogsPath, logFileName);

    const logEntry = {
      operation,
      result,
      timestamp: new Date().toISOString()
    };

    try {
      await fs.writeFile(logFilePath, JSON.stringify(logEntry, null, 2));
      console.log(`📝 Operation logged to: ${logFilePath}`);
    } catch (error) {
      console.error('Failed to log operation:', error);
    }
  }

  private async updateMintRequestFile(mintRequestId: string, result: MintResult) {
    const requestFile = path.join(this.mintRequestsPath, `mint-request-${mintRequestId}.json`);
    
    try {
      const requestData = await fs.readFile(requestFile, 'utf-8');
      const request = JSON.parse(requestData);
      
      // Update with mint result
      request.mintSignature = result.signature;
      request.explorerUrl = result.explorerUrl;
      request.tokenAccount = result.tokenAccount;
      request.mintedAt = result.timestamp;
      request.status = result.success ? 'COMPLETED' : 'FAILED';
      request.mintError = result.error;

      // Add to audit trail
      request.auditTrail.push({
        action: result.success ? 'minting_completed' : 'minting_failed',
        timestamp: result.timestamp,
        actor: 'blockchain_operator',
        data: {
          signature: result.signature,
          explorerUrl: result.explorerUrl,
          error: result.error
        }
      });

      await fs.writeFile(requestFile, JSON.stringify(request, null, 2));
      console.log(`📋 Updated mint request file: ${requestFile}`);
    } catch (error) {
      console.error(`Failed to update mint request file: ${error}`);
    }
  }

  async processPendingMintRequests(): Promise<MintResult[]> {
    console.log('🔍 Processing pending mint requests...');
    
    try {
      const files = await fs.readdir(this.mintRequestsPath);
      const requestFiles = files.filter(file => file.startsWith('mint-request-') && file.endsWith('.json'));
      
      const results: MintResult[] = [];
      
      for (const file of requestFiles) {
        const filePath = path.join(this.mintRequestsPath, file);
        
        try {
          const requestData = await fs.readFile(filePath, 'utf-8');
          const request: MintRequest = JSON.parse(requestData);
          
          // Only process approved requests that haven't been minted
          if (request.status === 'APPROVED' && !request.mintSignature) {
            console.log(`\n📋 Processing request: ${request.mintRequestId}`);
            
            // Get mint configuration (assuming OmniFit token for now)
            const mintAddress = process.env.OMNIFIT_MINT_ADDRESS;
            if (!mintAddress) {
              throw new Error('OMNIFIT_MINT_ADDRESS environment variable not set');
            }

            const operation: MintOperation = {
              mintAddress,
              recipientWallet: request.recipientWallet,
              amount: request.tokenAmount * Math.pow(10, 9), // Convert to lamports (9 decimals)
              decimals: 9,
              mintRequestId: request.mintRequestId
            };

            const result = await this.mintTokens(operation);
            results.push(result);
            
            // Small delay between operations
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Failed to process ${file}:`, error);
        }
      }
      
      if (results.length === 0) {
        console.log('📭 No pending mint requests found');
      } else {
        console.log(`🎉 Processed ${results.length} mint requests`);
      }
      
      return results;
    } catch (error) {
      console.error('Failed to process pending requests:', error);
      throw error;
    }
  }

  async getAccountBalance(tokenAccount: string): Promise<number> {
    try {
      const accountPublicKey = new PublicKey(tokenAccount);
      const accountInfo = await getAccount(this.connection, accountPublicKey);
      return Number(accountInfo.amount);
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return 0;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const minter = new TokenMinter(process.env.SOLANA_NETWORK || 'devnet');

  switch (command) {
    case 'mint':
      if (args.length < 4) {
        console.error('Usage: npm run mint:tokens <mintAddress> <recipientWallet> <amount> [decimals]');
        process.exit(1);
      }

      const operation: MintOperation = {
        mintAddress: args[1],
        recipientWallet: args[2],
        amount: parseFloat(args[3]) * Math.pow(10, parseInt(args[4] || '9')),
        decimals: parseInt(args[4] || '9')
      };

      await minter.mintTokens(operation);
      break;

    case 'process':
      await minter.processPendingMintRequests();
      break;

    case 'balance':
      if (!args[1]) {
        console.error('Usage: npm run mint:balance <tokenAccount>');
        process.exit(1);
      }
      
      const balance = await minter.getAccountBalance(args[1]);
      const decimals = parseInt(args[2] || '9');
      console.log(`Balance: ${balance / Math.pow(10, decimals)} tokens (${balance} lamports)`);
      break;

    default:
      console.log(`
OmniFit Token Minter

Commands:
  mint <mint> <recipient> <amount> [decimals] - Mint tokens to account
  process                                    - Process pending mint requests  
  balance <tokenAccount> [decimals]          - Check token account balance

Environment Variables:
  SOLANA_NETWORK         - Network (devnet, testnet, mainnet-beta)
  SOLANA_RPC_URL         - Custom RPC URL
  SOLANA_KEYPAIR_PATH    - Path to payer keypair
  OMNIFIT_MINT_ADDRESS   - OmniFit token mint address

Examples:
  npm run mint:tokens 5xKd... 8sHx... 100 9
  npm run mint:process
  npm run mint:balance 3tGb... 9
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TokenMinter, type MintOperation, type MintResult };