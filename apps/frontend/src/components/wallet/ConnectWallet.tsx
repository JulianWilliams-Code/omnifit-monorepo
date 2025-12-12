import React, { useState, useEffect } from 'react';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react';

interface ConnectWalletProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
  showStatus?: boolean;
  compact?: boolean;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({
  onConnect,
  onDisconnect,
  showStatus = true,
  compact = false
}) => {
  const { connection } = useConnection();
  const { publicKey, connected: walletConnected } = useSolanaWallet();
  const {
    connectWallet,
    disconnectWallet,
    isConnecting,
    isDisconnecting,
    connectionStatus,
    isLinked,
    getWalletStatus
  } = useWallet();

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load wallet status on component mount
  useEffect(() => {
    getWalletStatus();
  }, [getWalletStatus]);

  // Reset messages after delay
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleConnect = async () => {
    try {
      setError('');
      setSuccess('');

      if (!walletConnected || !publicKey) {
        setError('Please connect your wallet first using the wallet button');
        return;
      }

      await connectWallet();
      setSuccess('Wallet connected and verified successfully!');
      onConnect?.(');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    try {
      setError('');
      setSuccess('');

      await disconnectWallet();
      setSuccess('Wallet disconnected successfully');
      onDisconnect?.();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect wallet');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getConnectionStatusBadge = () => {
    if (!walletConnected) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Not Connected
        </Badge>
      );
    }

    if (isLinked) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Verified
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Unverified
      </Badge>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {!walletConnected ? (
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
        ) : (
          <>
            {isLinked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-2"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                {formatAddress(publicKey?.toString() || '')}
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                size="sm"
                className="flex items-center gap-2"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Verify Wallet
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Wallet Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Adapter Connection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 1: Connect Your Wallet
          </label>
          <WalletMultiButton className="!w-full !bg-blue-600 hover:!bg-blue-700" />
          {walletConnected && publicKey && (
            <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
              Connected: {formatAddress(publicKey.toString())}
            </div>
          )}
        </div>

        {/* OmniFit Verification */}
        {walletConnected && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Step 2: Verify Ownership
            </label>
            
            {showStatus && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Status:</span>
                {getConnectionStatusBadge()}
              </div>
            )}

            {isLinked ? (
              <div className="space-y-2">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Wallet Verified</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your wallet is connected and verified for earning tokens
                  </p>
                  {connectionStatus?.connectedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Connected: {new Date(connectionStatus.connectedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="w-full"
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect Wallet'
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Wallet Ownership
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Information */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Wallet verification requires signing a message (no gas fees)</p>
          <p>• Your wallet will be used for token rewards</p>
          <p>• You can change your connected wallet anytime</p>
        </div>

        {/* Network Info */}
        {process.env.NEXT_PUBLIC_SOLANA_NETWORK !== 'mainnet-beta' && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
            <p>⚠️ Connected to {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'} network</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};