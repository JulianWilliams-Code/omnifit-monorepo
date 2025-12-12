import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMintToInstruction,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

interface MintRequestProcessor {
  connection: Connection;
  mintAuthority: Keypair;
  tokenMintAddress: PublicKey;
  prisma: PrismaClient;
}

class SolanaMintProcessor implements MintRequestProcessor {
  connection: Connection;
  mintAuthority: Keypair;
  tokenMintAddress: PublicKey;
  prisma: PrismaClient;

  constructor() {
    // TODO: Require environment variable validation
    const cluster = process.env.SOLANA_CLUSTER || 'devnet';
    const rpcUrl = this.getRpcUrl(cluster);
    
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.prisma = new PrismaClient();
    
    // Load mint authority keypair from environment
    const keypairPath = process.env.MINT_AUTHORITY_KEYPAIR_PATH;
    if (!keypairPath) {
      throw new Error('MINT_AUTHORITY_KEYPAIR_PATH environment variable required');
    }
    
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Keypair file not found at ${keypairPath}`);
    }

    const secretKeyString = fs.readFileSync(keypairPath, 'utf-8');
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    this.mintAuthority = Keypair.fromSecretKey(secretKey);

    // TODO: Validate token mint address
    const mintAddress = process.env.TOKEN_MINT_ADDRESS;
    if (!mintAddress) {
      throw new Error('TOKEN_MINT_ADDRESS environment variable required');
    }
    
    this.tokenMintAddress = new PublicKey(mintAddress);
    
    console.log(`Mint processor initialized:`);
    console.log(`- Cluster: ${cluster}`);
    console.log(`- RPC: ${rpcUrl}`);
    console.log(`- Mint Authority: ${this.mintAuthority.publicKey.toBase58()}`);
    console.log(`- Token Mint: ${this.tokenMintAddress.toBase58()}`);
  }

  private getRpcUrl(cluster: string): string {
    // TODO: Add custom RPC URL support from environment
    switch (cluster) {
      case 'mainnet-beta':
        return process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'devnet':
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  async processApprovedMintRequests(): Promise<void> {
    try {
      console.log('Fetching approved mint requests...');
      
      // Get approved mint requests that haven't been processed
      const mintRequests = await this.prisma.mintRequest.findMany({
        where: {
          status: 'APPROVED',
          mintSignature: null, // Not yet minted
        },
        orderBy: { requestedAt: 'asc' },
        take: 10, // Process in batches of 10
      });

      console.log(`Found ${mintRequests.length} requests to process`);

      for (const request of mintRequests) {
        await this.processSingleMintRequest(request);
        
        // Add delay between transactions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('Failed to process mint requests:', error);
      throw error;
    }
  }

  private async processSingleMintRequest(request: any): Promise<void> {
    try {
      console.log(`Processing mint request ${request.id} for ${request.tokenAmount} tokens...`);

      // Update status to minting
      await this.prisma.mintRequest.update({
        where: { id: request.id },
        data: { status: 'MINTING' },
      });

      // Validate recipient wallet
      const recipientPubkey = new PublicKey(request.recipientWallet);

      // Get or create associated token account
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.mintAuthority, // payer
        this.tokenMintAddress,
        recipientPubkey
      );

      // Get mint info for decimals
      const mintInfo = await getMint(this.connection, this.tokenMintAddress);
      const amount = request.tokenAmount * Math.pow(10, mintInfo.decimals);

      // Create mint instruction
      const mintInstruction = createMintToInstruction(
        this.tokenMintAddress,
        recipientTokenAccount.address,
        this.mintAuthority.publicKey,
        amount
      );

      // Create and send transaction
      const transaction = new Transaction().add(mintInstruction);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.mintAuthority],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        }
      );

      console.log(`Minted ${request.tokenAmount} tokens to ${request.recipientWallet}`);
      console.log(`Transaction signature: ${signature}`);

      // Update mint request with success
      await this.prisma.mintRequest.update({
        where: { id: request.id },
        data: {
          status: 'COMPLETED',
          mintSignature: signature,
          mintedAt: new Date(),
          explorerUrl: this.getExplorerUrl(signature),
        },
      });

      // Create audit log
      await this.prisma.rewardAudit.create({
        data: {
          userId: request.userId,
          action: 'mint_completed',
          resource: 'mint_request',
          resourceId: request.id,
          newValues: {
            signature,
            amount: request.tokenAmount,
            recipient: request.recipientWallet,
          },
          metadata: {
            cluster: process.env.SOLANA_CLUSTER,
            mint_authority: this.mintAuthority.publicKey.toBase58(),
          },
        },
      });

    } catch (error) {
      console.error(`Failed to process mint request ${request.id}:`, error);

      // Update mint request with failure
      await this.prisma.mintRequest.update({
        where: { id: request.id },
        data: {
          status: 'FAILED',
          // TODO: Add error message field to schema
        },
      });

      // TODO: Alert administrators about failed mints
      // TODO: Consider retry logic for transient failures
    }
  }

  private getExplorerUrl(signature: string): string {
    const cluster = process.env.SOLANA_CLUSTER || 'devnet';
    const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
    return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
  }

  async validateSetup(): Promise<boolean> {
    try {
      console.log('Validating mint processor setup...');

      // Check connection
      const version = await this.connection.getVersion();
      console.log(`✓ Connected to Solana RPC (version: ${version['solana-core']})`);

      // Check mint authority balance
      const balance = await this.connection.getBalance(this.mintAuthority.publicKey);
      console.log(`✓ Mint authority balance: ${balance / 1e9} SOL`);
      
      if (balance < 0.01e9) { // Less than 0.01 SOL
        console.warn('⚠ Low SOL balance for transaction fees');
      }

      // Validate token mint
      const mintInfo = await getMint(this.connection, this.tokenMintAddress);
      console.log(`✓ Token mint validated:`);
      console.log(`  - Supply: ${mintInfo.supply / BigInt(Math.pow(10, mintInfo.decimals))}`);
      console.log(`  - Decimals: ${mintInfo.decimals}`);
      console.log(`  - Mint authority: ${mintInfo.mintAuthority?.toBase58()}`);

      // Verify mint authority
      if (!mintInfo.mintAuthority?.equals(this.mintAuthority.publicKey)) {
        throw new Error('Keypair is not the mint authority for this token');
      }

      console.log('✓ Setup validation completed successfully');
      return true;

    } catch (error) {
      console.error('Setup validation failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('Usage: node sign_and_submit_mint_request.js [validate|process|monitor]');
    process.exit(1);
  }

  const processor = new SolanaMintProcessor();

  try {
    switch (command) {
      case 'validate':
        const isValid = await processor.validateSetup();
        process.exit(isValid ? 0 : 1);
        break;

      case 'process':
        await processor.processApprovedMintRequests();
        break;

      case 'monitor':
        console.log('Starting continuous monitoring mode...');
        setInterval(async () => {
          try {
            await processor.processApprovedMintRequests();
          } catch (error) {
            console.error('Error in monitoring loop:', error);
          }
        }, 30000); // Check every 30 seconds
        break;

      default:
        console.log('Unknown command. Use validate, process, or monitor');
        process.exit(1);
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    if (command !== 'monitor') {
      await processor.close();
    }
  }
}

// TODO: Production considerations:
// 1. Implement multisig authority instead of single keypair
// 2. Add proper error alerting and monitoring
// 3. Implement rate limiting and transaction batching
// 4. Add comprehensive logging and audit trails
// 5. Secure key management (HSM/KMS integration)
// 6. Add transaction fee estimation and management
// 7. Implement proper retry logic with exponential backoff

if (require.main === module) {
  main().catch(console.error);
}

export { SolanaMintProcessor };