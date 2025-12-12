import { useState, useCallback } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useAuth } from './useAuth';

interface WalletConnectionChallenge {
  nonce: string;
  message: string;
  expiresAt: string;
}

interface WalletStatus {
  connected: boolean;
  walletAddress: string | null;
  connectedAt: string | null;
  lastVerified: string | null;
  pendingVerifications: number;
}

export function useWallet() {
  const { publicKey, signMessage, connected, disconnect, select } = useSolanaWallet();
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<WalletStatus | null>(null);

  // Generate wallet connection challenge
  const generateChallenge = useCallback(async (walletPublicKey: string): Promise<WalletConnectionChallenge> => {
    if (!user?.token) throw new Error('User not authenticated');

    const response = await fetch('/api/wallet/challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({
        publicKey: walletPublicKey
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to generate challenge');
    }

    return result.data;
  }, [user]);

  // Verify wallet signature and connect
  const verifyAndConnect = useCallback(async (
    walletPublicKey: string,
    message: string,
    signature: string
  ) => {
    if (!user?.token) throw new Error('User not authenticated');

    const response = await fetch('/api/wallet/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({
        publicKey: walletPublicKey,
        message,
        signature
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to verify wallet');
    }

    return result.data;
  }, [user]);

  // Connect wallet with verification
  const connectWallet = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    setIsConnecting(true);

    try {
      // 1. Generate challenge from backend
      const challenge = await generateChallenge(publicKey.toString());

      // 2. Sign the challenge message
      const messageBytes = new TextEncoder().encode(challenge.message);
      const signedMessage = await signMessage(messageBytes);

      // 3. Convert signature to base58
      const signature = Buffer.from(signedMessage).toString('base64');
      const bs58Signature = Buffer.from(signature, 'base64').toString('base64');

      // 4. Send verification to backend
      await verifyAndConnect(
        publicKey.toString(),
        challenge.message,
        bs58Signature
      );

      // 5. Refresh connection status
      await getWalletStatus();

      return { success: true };
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      throw new Error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [publicKey, signMessage, generateChallenge, verifyAndConnect]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (!user?.token) throw new Error('User not authenticated');

    setIsDisconnecting(true);

    try {
      // 1. Disconnect from backend
      const response = await fetch('/api/wallet/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to disconnect wallet');
      }

      // 2. Disconnect from wallet adapter
      await disconnect();

      // 3. Update status
      setConnectionStatus(null);

      return { success: true };
    } catch (error: any) {
      console.error('Wallet disconnection failed:', error);
      throw new Error(error.message || 'Failed to disconnect wallet');
    } finally {
      setIsDisconnecting(false);
    }
  }, [user, disconnect]);

  // Get wallet connection status
  const getWalletStatus = useCallback(async (): Promise<WalletStatus | null> => {
    if (!user?.token) return null;

    try {
      const response = await fetch('/api/wallet/status', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setConnectionStatus(result.data);
        return result.data;
      }
    } catch (error) {
      console.error('Failed to fetch wallet status:', error);
    }

    return null;
  }, [user]);

  // Get wallet connection history
  const getWalletHistory = useCallback(async (page = 1, limit = 20) => {
    if (!user?.token) return null;

    try {
      const response = await fetch(`/api/wallet/history?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        return {
          data: result.data,
          pagination: result.pagination
        };
      }
    } catch (error) {
      console.error('Failed to fetch wallet history:', error);
    }

    return null;
  }, [user]);

  return {
    // Solana wallet adapter state
    publicKey,
    connected,
    isConnecting,
    isDisconnecting,
    
    // OmniFit wallet connection state
    connectionStatus,
    isLinked: connectionStatus?.connected || false,
    
    // Actions
    selectWallet: select,
    connectWallet,
    disconnectWallet,
    getWalletStatus,
    getWalletHistory
  };
}