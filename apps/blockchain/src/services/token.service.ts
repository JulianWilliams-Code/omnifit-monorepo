import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TokenError,
} from '@solana/spl-token';
import { WalletService } from './wallet.service';
import { logger } from '../utils/logger';
import { TOKEN_CONFIG } from '@omnifit/shared';

export class TokenService {
  private connection: Connection;
  private walletService: WalletService;

  constructor(network: string = 'devnet') {
    this.walletService = new WalletService(network);
    this.connection = this.walletService.getConnection();
  }

  async createTokenMint(): Promise<{ mint: string; authority: string }> {
    try {
      // Create a new keypair for the mint authority
      const mintAuthority = Keypair.generate();
      const freezeAuthority = Keypair.generate();

      // Airdrop SOL to mint authority for rent
      const signature = await this.connection.requestAirdrop(
        mintAuthority.publicKey,
        2000000000 // 2 SOL
      );
      await this.connection.confirmTransaction(signature);

      // Create the mint
      const mint = await createMint(
        this.connection,
        mintAuthority, // payer
        mintAuthority.publicKey, // mint authority
        freezeAuthority.publicKey, // freeze authority
        TOKEN_CONFIG.DECIMALS // decimals
      );

      logger.info(`Token mint created: ${mint.toString()}`);

      // Save mint info to environment/config
      const mintInfo = {
        mint: mint.toString(),
        authority: mintAuthority.publicKey.toString(),
        freezeAuthority: freezeAuthority.publicKey.toString(),
      };

      // TODO: Save keypairs securely (use proper secret management in production)
      logger.warn('IMPORTANT: Save these keypairs securely:');
      logger.warn(`Mint Authority Secret: [${Array.from(mintAuthority.secretKey)}]`);
      logger.warn(`Freeze Authority Secret: [${Array.from(freezeAuthority.secretKey)}]`);

      return {
        mint: mint.toString(),
        authority: mintAuthority.publicKey.toString(),
      };
    } catch (error) {
      logger.error('Error creating token mint:', error);
      throw error;
    }
  }

  async mintTokens(toAddress: string, amount: number): Promise<{ signature: string; amount: number }> {
    try {
      // Load mint authority (in production, load from secure storage)
      const mintAuthoritySecretKey = process.env.MINT_AUTHORITY_SECRET_KEY;
      if (!mintAuthoritySecretKey) {
        throw new Error('Mint authority secret key not found in environment');
      }

      const mintAuthority = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(mintAuthoritySecretKey))
      );

      const mintPublicKey = new PublicKey(process.env.TOKEN_MINT_ADDRESS || '');
      const toPublicKey = new PublicKey(toAddress);

      // Get or create associated token account
      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        mintAuthority,
        mintPublicKey,
        toPublicKey
      );

      // Calculate amount with decimals
      const mintAmount = amount * Math.pow(10, TOKEN_CONFIG.DECIMALS);

      // Mint tokens
      const signature = await mintTo(
        this.connection,
        mintAuthority, // payer
        mintPublicKey, // mint
        toTokenAccount.address, // destination
        mintAuthority, // authority
        mintAmount // amount
      );

      logger.info(`Minted ${amount} OMF tokens to ${toAddress}. Signature: ${signature}`);

      return {
        signature,
        amount,
      };
    } catch (error) {
      logger.error('Error minting tokens:', error);
      throw error;
    }
  }

  async getTokenBalance(walletAddress: string): Promise<number> {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(process.env.TOKEN_MINT_ADDRESS || '');

      // Get associated token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        Keypair.generate(), // Dummy payer, won't be used for read operations
        mintPublicKey,
        walletPublicKey
      );

      // Get account info
      const accountInfo = await getAccount(this.connection, tokenAccount.address);
      
      // Convert from lamports to tokens
      const balance = Number(accountInfo.amount) / Math.pow(10, TOKEN_CONFIG.DECIMALS);
      
      return balance;
    } catch (error) {
      if (error instanceof TokenError) {
        // Account doesn't exist, return 0
        return 0;
      }
      logger.error('Error getting token balance:', error);
      throw error;
    }
  }

  async transferTokens(
    fromKeypair: Keypair,
    toAddress: string,
    amount: number
  ): Promise<{ signature: string; amount: number }> {
    try {
      const mintPublicKey = new PublicKey(process.env.TOKEN_MINT_ADDRESS || '');
      const toPublicKey = new PublicKey(toAddress);

      // Get source token account
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair,
        mintPublicKey,
        fromKeypair.publicKey
      );

      // Get destination token account
      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair, // payer for account creation if needed
        mintPublicKey,
        toPublicKey
      );

      // Calculate transfer amount with decimals
      const transferAmount = amount * Math.pow(10, TOKEN_CONFIG.DECIMALS);

      // Create transfer instruction
      const { transfer, createTransferInstruction } = await import('@solana/spl-token');
      
      const signature = await transfer(
        this.connection,
        fromKeypair, // payer
        fromTokenAccount.address, // source
        toTokenAccount.address, // destination
        fromKeypair, // owner
        transferAmount // amount
      );

      logger.info(`Transferred ${amount} OMF tokens from ${fromKeypair.publicKey.toString()} to ${toAddress}. Signature: ${signature}`);

      return {
        signature,
        amount,
      };
    } catch (error) {
      logger.error('Error transferring tokens:', error);
      throw error;
    }
  }

  async burnTokens(fromKeypair: Keypair, amount: number): Promise<{ signature: string; amount: number }> {
    try {
      const mintPublicKey = new PublicKey(process.env.TOKEN_MINT_ADDRESS || '');

      // Get token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair,
        mintPublicKey,
        fromKeypair.publicKey
      );

      // Calculate burn amount with decimals
      const burnAmount = amount * Math.pow(10, TOKEN_CONFIG.DECIMALS);

      // Burn tokens
      const { burn } = await import('@solana/spl-token');
      
      const signature = await burn(
        this.connection,
        fromKeypair, // payer
        tokenAccount.address, // account to burn from
        mintPublicKey, // mint
        fromKeypair, // owner
        burnAmount // amount
      );

      logger.info(`Burned ${amount} OMF tokens from ${fromKeypair.publicKey.toString()}. Signature: ${signature}`);

      return {
        signature,
        amount,
      };
    } catch (error) {
      logger.error('Error burning tokens:', error);
      throw error;
    }
  }
}