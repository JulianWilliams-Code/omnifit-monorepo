#!/usr/bin/env node

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MintConfig {
  network: 'devnet' | 'testnet' | 'mainnet-beta';
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  image?: string;
}

interface MintResult {
  mintAddress: string;
  authorityKeypair: string; // base58 encoded
  freezeAuthorityKeypair?: string;
  transaction: string;
  explorerUrl: string;
  metadata: MintConfig;
  timestamp: string;
}

class SolanaMintCreator {
  private connection: Connection;
  private payerKeypair: Keypair;

  constructor(network: string = 'devnet') {
    const rpcUrl = this.getRpcUrl(network);
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    // Load or create payer keypair
    this.payerKeypair = this.loadPayerKeypair();
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
      console.log('Payer keypair not found, generating new one...');
      const newKeypair = Keypair.generate();
      this.saveKeypair(newKeypair, keypairPath);
      return newKeypair;
    }
  }

  private async saveKeypair(keypair: Keypair, filePath: string) {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        filePath,
        JSON.stringify(Array.from(keypair.secretKey)),
        'utf8'
      );
      console.log(`Keypair saved to: ${filePath}`);
    } catch (error) {
      console.error('Failed to save keypair:', error);
    }
  }

  async createOmniFitToken(config: MintConfig): Promise<MintResult> {
    console.log('Creating OmniFit token mint...');
    console.log('Config:', config);

    try {
      // Check payer balance
      const balance = await this.connection.getBalance(this.payerKeypair.publicKey);
      console.log(`Payer balance: ${balance / LAMPORTS_PER_SOL} SOL`);

      if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log('⚠️  Low balance! You may need to fund this account.');
        if (config.network === 'devnet') {
          console.log('Get devnet SOL: https://faucet.solana.com/');
        }
      }

      // Generate keypairs for mint authorities
      const mintAuthority = Keypair.generate();
      const freezeAuthority = config.network === 'mainnet-beta' ? Keypair.generate() : null;

      // Create mint account
      const mintAddress = await createMint(
        this.connection,
        this.payerKeypair, // Payer
        mintAuthority.publicKey, // Mint authority
        freezeAuthority?.publicKey || null, // Freeze authority (null for devnet)
        config.decimals, // Decimals
        Keypair.generate(), // Mint account keypair
        undefined, // Confirmation options
        TOKEN_PROGRAM_ID // Token program
      );

      console.log(`✅ Token mint created: ${mintAddress.toBase58()}`);

      // Save mint configuration
      const mintResult: MintResult = {
        mintAddress: mintAddress.toBase58(),
        authorityKeypair: this.keypairToBase58(mintAuthority),
        freezeAuthorityKeypair: freezeAuthority ? this.keypairToBase58(freezeAuthority) : undefined,
        transaction: '', // Will be updated if we track transaction
        explorerUrl: this.getExplorerUrl(mintAddress.toBase58(), config.network),
        metadata: config,
        timestamp: new Date().toISOString()
      };

      // Save mint data
      await this.saveMintData(mintResult);

      // Save authority keypairs securely
      await this.saveAuthorityKeypairs(mintResult);

      return mintResult;

    } catch (error) {
      console.error('Failed to create mint:', error);
      throw error;
    }
  }

  async createTokenAccount(
    mintAddress: string,
    ownerAddress: string
  ): Promise<{ tokenAccount: string; transaction?: string }> {
    console.log(`Creating token account for mint: ${mintAddress}`);

    try {
      const mint = new PublicKey(mintAddress);
      const owner = new PublicKey(ownerAddress);

      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.payerKeypair,
        mint,
        owner
      );

      console.log(`✅ Token account created: ${tokenAccount.address.toBase58()}`);

      return {
        tokenAccount: tokenAccount.address.toBase58()
      };

    } catch (error) {
      console.error('Failed to create token account:', error);
      throw error;
    }
  }

  private keypairToBase58(keypair: Keypair): string {
    return Buffer.from(keypair.secretKey).toString('base64');
  }

  private base58ToKeypair(base58: string): Keypair {
    const secretKey = Buffer.from(base58, 'base64');
    return Keypair.fromSecretKey(secretKey);
  }

  private getExplorerUrl(address: string, network: string): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/address/${address}${cluster}`;
  }

  private async saveMintData(mintResult: MintResult) {
    const mintDataPath = path.join(
      process.cwd(),
      'apps/blockchain/mints',
      `${mintResult.metadata.symbol.toLowerCase()}-${Date.now()}.json`
    );

    try {
      const dir = path.dirname(mintDataPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Remove sensitive data from saved result
      const safeData = {
        ...mintResult,
        authorityKeypair: '[REDACTED - Stored separately]',
        freezeAuthorityKeypair: '[REDACTED - Stored separately]'
      };

      await fs.writeFile(mintDataPath, JSON.stringify(safeData, null, 2));
      console.log(`Mint data saved to: ${mintDataPath}`);
    } catch (error) {
      console.error('Failed to save mint data:', error);
    }
  }

  private async saveAuthorityKeypairs(mintResult: MintResult) {
    const keypairsDir = path.join(process.cwd(), 'apps/blockchain/keypairs/authorities');
    
    try {
      await fs.mkdir(keypairsDir, { recursive: true });

      // Save mint authority
      const mintAuthorityPath = path.join(keypairsDir, `${mintResult.mintAddress}-authority.json`);
      const authorityKeypair = this.base58ToKeypair(mintResult.authorityKeypair);
      await fs.writeFile(
        mintAuthorityPath,
        JSON.stringify(Array.from(authorityKeypair.secretKey)),
        'utf8'
      );

      // Save freeze authority if exists
      if (mintResult.freezeAuthorityKeypair) {
        const freezeAuthorityPath = path.join(keypairsDir, `${mintResult.mintAddress}-freeze.json`);
        const freezeKeypair = this.base58ToKeypair(mintResult.freezeAuthorityKeypair);
        await fs.writeFile(
          freezeAuthorityPath,
          JSON.stringify(Array.from(freezeKeypair.secretKey)),
          'utf8'
        );
      }

      console.log(`🔐 Authority keypairs saved securely in ${keypairsDir}`);
    } catch (error) {
      console.error('Failed to save authority keypairs:', error);
    }
  }

  async fundAccount(publicKey: string, amount: number = 1) {
    if (this.connection.rpcEndpoint.includes('devnet')) {
      try {
        console.log(`Requesting ${amount} SOL airdrop for ${publicKey}...`);
        const signature = await this.connection.requestAirdrop(
          new PublicKey(publicKey),
          amount * LAMPORTS_PER_SOL
        );
        await this.connection.confirmTransaction(signature);
        console.log(`✅ Airdrop successful: ${signature}`);
      } catch (error) {
        console.error('Airdrop failed:', error);
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const creator = new SolanaMintCreator(process.env.SOLANA_NETWORK || 'devnet');

  switch (command) {
    case 'create':
      const config: MintConfig = {
        network: (process.env.SOLANA_NETWORK as any) || 'devnet',
        name: args[1] || 'OmniFit Token',
        symbol: args[2] || 'OMNI',
        decimals: parseInt(args[3] || '9'),
        description: 'OmniFit fitness and spiritual wellness token',
        image: 'https://omnifit.app/logo.png'
      };

      const result = await creator.createOmniFitToken(config);
      console.log('\n🎉 Mint created successfully!');
      console.log(`Mint Address: ${result.mintAddress}`);
      console.log(`Explorer: ${result.explorerUrl}`);
      break;

    case 'account':
      if (!args[1] || !args[2]) {
        console.error('Usage: npm run mint:account <mintAddress> <ownerAddress>');
        process.exit(1);
      }
      const accountResult = await creator.createTokenAccount(args[1], args[2]);
      console.log(`Token Account: ${accountResult.tokenAccount}`);
      break;

    case 'fund':
      if (!args[1]) {
        console.error('Usage: npm run mint:fund <publicKey> [amount]');
        process.exit(1);
      }
      await creator.fundAccount(args[1], parseFloat(args[2] || '1'));
      break;

    default:
      console.log(`
OmniFit Token Mint Creator

Commands:
  create [name] [symbol] [decimals] - Create new token mint
  account <mint> <owner>           - Create token account
  fund <publicKey> [amount]        - Fund account (devnet only)

Environment Variables:
  SOLANA_NETWORK     - Network (devnet, testnet, mainnet-beta)
  SOLANA_RPC_URL     - Custom RPC URL
  SOLANA_KEYPAIR_PATH - Path to payer keypair

Examples:
  npm run mint:create
  npm run mint:create "OmniFit Token" "OMNI" 9
  npm run mint:account 5xKd... 8sHx...
  npm run mint:fund 8sHx... 2
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SolanaMintCreator, type MintConfig, type MintResult };