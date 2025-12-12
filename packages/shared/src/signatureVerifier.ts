import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Utility for verifying Solana wallet signatures
 * Used in wallet connection and authentication flows
 * 
 * Security considerations:
 * - Always verify signatures on the server side
 * - Use nonces to prevent replay attacks  
 * - Include timestamp in signed messages
 * - Rate limit signature verification attempts
 * - Log all verification attempts for audit
 */

export interface SignatureVerificationResult {
  isValid: boolean;
  publicKey?: string;
  message?: string;
  error?: string;
}

export interface NonceChallenge {
  nonce: string;
  message: string;
  expiresAt: Date;
}

export class SignatureVerifier {
  private static readonly MESSAGE_PREFIX = 'OmniFit Wallet Verification';
  private static readonly NONCE_EXPIRY_MINUTES = 15;

  /**
   * Generate a nonce challenge for wallet verification
   * @param userId - The user ID requesting verification
   * @param publicKey - The wallet public key to verify
   * @returns NonceChallenge object
   */
  static generateNonceChallenge(userId: string, publicKey: string): NonceChallenge {
    // TODO: Use cryptographically secure random number generator in production
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (this.NONCE_EXPIRY_MINUTES * 60 * 1000));

    const message = `${this.MESSAGE_PREFIX}

User ID: ${userId}
Wallet: ${publicKey}
Nonce: ${nonce}
Timestamp: ${timestamp}

This signature proves you own this wallet.
Valid for ${this.NONCE_EXPIRY_MINUTES} minutes.

WARNING: Only sign this message on the official OmniFit website.`;

    return {
      nonce,
      message,
      expiresAt,
    };
  }

  /**
   * Verify a signed message against a public key
   * @param message - The original message that was signed
   * @param signature - Base58 encoded signature
   * @param publicKey - Base58 encoded public key  
   * @returns SignatureVerificationResult
   */
  static verifySignature(
    message: string, 
    signature: string, 
    publicKey: string
  ): SignatureVerificationResult {
    try {
      // Validate inputs
      if (!message || !signature || !publicKey) {
        return {
          isValid: false,
          error: 'Missing required parameters',
        };
      }

      // Decode base58 signature and public key
      let signatureBytes: Uint8Array;
      let publicKeyBytes: Uint8Array;

      try {
        signatureBytes = bs58.decode(signature);
        publicKeyBytes = bs58.decode(publicKey);
      } catch (error) {
        return {
          isValid: false,
          error: 'Invalid base58 encoding',
        };
      }

      // Validate signature and public key lengths
      if (signatureBytes.length !== 64) {
        return {
          isValid: false,
          error: 'Invalid signature length (expected 64 bytes)',
        };
      }

      if (publicKeyBytes.length !== 32) {
        return {
          isValid: false,
          error: 'Invalid public key length (expected 32 bytes)',
        };
      }

      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);

      // Verify signature using Ed25519
      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      return {
        isValid,
        publicKey,
        message,
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify a nonce challenge response
   * @param originalNonce - The nonce that was issued
   * @param message - The signed message
   * @param signature - Base58 encoded signature
   * @param publicKey - Base58 encoded public key
   * @param issuedAt - When the nonce was issued
   * @returns SignatureVerificationResult with additional nonce validation
   */
  static verifyNonceChallenge(
    originalNonce: string,
    message: string,
    signature: string,
    publicKey: string,
    issuedAt: Date
  ): SignatureVerificationResult & { nonceValid?: boolean; expired?: boolean } {
    // Check if nonce is expired
    const now = new Date();
    const expiryTime = new Date(issuedAt.getTime() + (this.NONCE_EXPIRY_MINUTES * 60 * 1000));
    const expired = now > expiryTime;

    if (expired) {
      return {
        isValid: false,
        nonceValid: false,
        expired: true,
        error: 'Nonce challenge has expired',
      };
    }

    // Verify the nonce is in the message
    const nonceValid = message.includes(`Nonce: ${originalNonce}`);
    
    if (!nonceValid) {
      return {
        isValid: false,
        nonceValid: false,
        expired: false,
        error: 'Nonce does not match or missing from message',
      };
    }

    // Verify the signature
    const signatureResult = this.verifySignature(message, signature, publicKey);

    return {
      ...signatureResult,
      nonceValid,
      expired: false,
    };
  }

  /**
   * Validate Solana public key format
   * @param publicKey - Base58 encoded public key to validate
   * @returns boolean indicating if format is valid
   */
  static isValidSolanaPublicKey(publicKey: string): boolean {
    try {
      const decoded = bs58.decode(publicKey);
      return decoded.length === 32;
    } catch {
      return false;
    }
  }

  /**
   * Extract public key from message for verification
   * Used to ensure the public key in the message matches the one being verified
   * @param message - The signed message
   * @returns string | null - The extracted public key or null if not found
   */
  static extractPublicKeyFromMessage(message: string): string | null {
    const walletMatch = message.match(/Wallet: ([A-HJ-NP-Za-km-z1-9]{32,44})/);
    return walletMatch ? walletMatch[1] : null;
  }

  /**
   * Security audit helper - should be called for all verification attempts
   * TODO: Implement proper audit logging in your application
   * @param result - The verification result
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param userId - Associated user ID
   */
  static auditVerificationAttempt(
    result: SignatureVerificationResult,
    ipAddress?: string,
    userAgent?: string,
    userId?: string
  ): void {
    // TODO: Implement audit logging
    const auditData = {
      timestamp: new Date().toISOString(),
      success: result.isValid,
      publicKey: result.publicKey,
      error: result.error,
      ipAddress,
      userAgent,
      userId,
    };

    // TODO: Send to audit logging service
    console.log('Signature verification audit:', auditData);
  }

  /**
   * Rate limiting helper - implement in your application
   * TODO: Implement rate limiting per IP and per user
   * @param identifier - IP address or user ID
   * @returns boolean indicating if request should be allowed
   */
  static checkRateLimit(identifier: string): boolean {
    // TODO: Implement rate limiting logic
    // Suggested limits:
    // - 10 attempts per IP per minute
    // - 5 attempts per user per minute
    // - 100 attempts per IP per hour
    
    return true; // Placeholder - always allow for now
  }
}

// TODO: Production security checklist:
// 1. ✓ Use Ed25519 signature verification
// 2. ✓ Implement nonce challenges with expiry
// 3. ✓ Validate all inputs and handle errors
// 4. TODO: Add proper rate limiting
// 5. TODO: Implement comprehensive audit logging
// 6. TODO: Add IP-based suspicious activity detection
// 7. TODO: Implement CSRF protection for web interfaces
// 8. TODO: Add monitoring and alerting for failed attempts
// 9. TODO: Regular security audits and penetration testing
// 10. TODO: Consider hardware security module (HSM) for high-value operations

export default SignatureVerifier;