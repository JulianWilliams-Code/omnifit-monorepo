import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { ConnectWallet } from '@/components/wallet/ConnectWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Wallet,
  History,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';

interface WalletHistoryItem {
  id: string;
  action: string;
  publicKey: string;
  oldPublicKey?: string;
  suspicious: boolean;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

const WalletSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    publicKey, 
    connectionStatus, 
    isLinked, 
    getWalletStatus, 
    getWalletHistory 
  } = useWallet();
  
  const [walletHistory, setWalletHistory] = useState<WalletHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load wallet status and history
  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setRefreshing(true);
    try {
      await getWalletStatus();
      await loadWalletHistory();
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    }
    setRefreshing(false);
  };

  const loadWalletHistory = async () => {
    setHistoryLoading(true);
    try {
      const history = await getWalletHistory(1, 20);
      if (history?.data) {
        setWalletHistory(history.data);
      }
    } catch (error) {
      console.error('Failed to load wallet history:', error);
    }
    setHistoryLoading(false);
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Add toast notification
  };

  const openInExplorer = (address: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    window.open(`https://explorer.solana.com/address/${address}${cluster}`, '_blank');
  };

  const getActionBadge = (action: string, suspicious: boolean) => {
    let color = 'bg-gray-100 text-gray-800';
    let icon = null;

    if (suspicious) {
      color = 'bg-red-100 text-red-800';
      icon = <AlertTriangle className="w-3 h-3" />;
    } else {
      switch (action) {
        case 'wallet_connected':
          color = 'bg-green-100 text-green-800';
          icon = <CheckCircle className="w-3 h-3" />;
          break;
        case 'wallet_disconnected':
          color = 'bg-orange-100 text-orange-800';
          icon = <Clock className="w-3 h-3" />;
          break;
        case 'challenge_generated':
          color = 'bg-blue-100 text-blue-800';
          icon = <Shield className="w-3 h-3" />;
          break;
        case 'verification_failed':
          color = 'bg-red-100 text-red-800';
          icon = <AlertTriangle className="w-3 h-3" />;
          break;
      }
    }

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {action.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wallet Settings</h1>
            <p className="text-gray-600 mt-2">
              Manage your Solana wallet connection and security
            </p>
          </div>
          <Button
            onClick={loadWalletData}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connectionStatus?.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-900">Wallet Connected</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Your wallet is verified and ready for rewards
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Verified
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Wallet Address:</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {connectionStatus.walletAddress}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(connectionStatus.walletAddress || '')}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInExplorer(connectionStatus.walletAddress || '')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="font-medium text-gray-700">Connected:</label>
                        <p className="text-gray-600 mt-1">
                          {connectionStatus.connectedAt 
                            ? new Date(connectionStatus.connectedAt).toLocaleString()
                            : 'Unknown'
                          }
                        </p>
                      </div>

                      <div>
                        <label className="font-medium text-gray-700">Last Verified:</label>
                        <p className="text-gray-600 mt-1">
                          {connectionStatus.lastVerified
                            ? new Date(connectionStatus.lastVerified).toLocaleString()
                            : 'Never'
                          }
                        </p>
                      </div>

                      <div>
                        <label className="font-medium text-gray-700">Network:</label>
                        <p className="text-gray-600 mt-1">
                          {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Wallet Connected
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Connect your Solana wallet to start earning token rewards
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connect Wallet */}
            <ConnectWallet 
              showStatus={false}
              onConnect={loadWalletData}
              onDisconnect={loadWalletData}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Wallet Verification Security</p>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Your wallet ownership is verified through cryptographic signature verification</li>
                        <li>No private keys are stored or transmitted - only public addresses</li>
                        <li>Each verification challenge is unique and expires in 15 minutes</li>
                        <li>Suspicious connection patterns are automatically detected and flagged</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Signature Verification</h4>
                    <p className="text-gray-600">
                      Uses Ed25519 cryptographic signatures to prove wallet ownership without exposing private keys.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Anti-Replay Protection</h4>
                    <p className="text-gray-600">
                      Challenge messages include timestamps and nonces to prevent replay attacks.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Audit Logging</h4>
                    <p className="text-gray-600">
                      All wallet connections and verifications are logged for security monitoring.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Fraud Detection</h4>
                    <p className="text-gray-600">
                      Automated systems detect suspicious patterns like wallet reuse or rapid connections.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Connection History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading history...</span>
                  </div>
                ) : walletHistory.length > 0 ? (
                  <div className="space-y-3">
                    {walletHistory.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-lg ${
                          item.suspicious ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getActionBadge(item.action, item.suspicious)}
                            <span className="text-sm text-gray-600">
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {item.ipAddress && (
                            <span className="text-xs text-gray-500 font-mono">
                              {item.ipAddress}
                            </span>
                          )}
                        </div>

                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-gray-600">Wallet: </span>
                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                              {formatAddress(item.publicKey)}
                            </code>
                          </div>
                          
                          {item.oldPublicKey && (
                            <div>
                              <span className="text-gray-600">Previous: </span>
                              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                {formatAddress(item.oldPublicKey)}
                              </code>
                            </div>
                          )}

                          {item.suspicious && item.reason && (
                            <div className="text-red-600">
                              <span className="font-medium">Flagged: </span>
                              {item.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No wallet connection history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WalletSettingsPage;