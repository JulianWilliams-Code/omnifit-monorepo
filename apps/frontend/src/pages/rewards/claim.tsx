import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Trophy, 
  Coins, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Wallet,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface Reward {
  id: string;
  type: string;
  amount: number;
  reason: string;
  earnedAt: string;
  expiresAt?: string;
  sourceType: string;
  event?: {
    title: string;
    type: string;
    completedAt: string;
  };
}

interface ClaimableRewards {
  rewards: Reward[];
  groupedRewards: Record<string, Reward[]>;
  totalClaimable: number;
  count: number;
}

interface MintRequest {
  id: string;
  tokenAmount: number;
  recipientWallet: string;
  status: string;
  requestedAt: string;
  riskScore?: number;
  description: string;
}

const ClaimRewardsPage: React.FC = () => {
  const { user } = useAuth();
  const [claimableRewards, setClaimableRewards] = useState<ClaimableRewards | null>(null);
  const [mintRequests, setMintRequests] = useState<MintRequest[]>([]);
  const [selectedRewards, setSelectedRewards] = useState<Set<string>>(new Set());
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Fetch claimable rewards
  const fetchClaimableRewards = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/rewards/claimable', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClaimableRewards(data);
        
        // Auto-select all rewards by default
        const allRewardIds = new Set(data.rewards.map((r: Reward) => r.id));
        setSelectedRewards(allRewardIds);
      }
    } catch (error) {
      console.error('Failed to fetch claimable rewards:', error);
      setError('Failed to load rewards');
    }
    setIsLoading(false);
  };

  // Fetch mint requests
  const fetchMintRequests = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/rewards/mint-requests', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMintRequests(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch mint requests:', error);
    }
  };

  useEffect(() => {
    fetchClaimableRewards();
    fetchMintRequests();
  }, [user]);

  const handleRewardToggle = (rewardId: string) => {
    const newSelected = new Set(selectedRewards);
    if (newSelected.has(rewardId)) {
      newSelected.delete(rewardId);
    } else {
      newSelected.add(rewardId);
    }
    setSelectedRewards(newSelected);
  };

  const handleSelectAll = () => {
    if (!claimableRewards) return;
    
    if (selectedRewards.size === claimableRewards.rewards.length) {
      setSelectedRewards(new Set());
    } else {
      const allIds = new Set(claimableRewards.rewards.map(r => r.id));
      setSelectedRewards(allIds);
    }
  };

  const handleClaimRewards = async () => {
    if (!user || selectedRewards.size === 0 || !walletAddress) return;

    setIsClaiming(true);
    setError('');
    setClaimResult(null);

    try {
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          rewardIds: Array.from(selectedRewards),
          recipientWallet: walletAddress
        })
      });

      const result = await response.json();

      if (response.ok) {
        setClaimResult(result.data);
        setSelectedRewards(new Set());
        
        // Refresh data
        await fetchClaimableRewards();
        await fetchMintRequests();
      } else {
        setError(result.message || 'Failed to claim rewards');
      }
    } catch (error) {
      console.error('Claim failed:', error);
      setError('Network error. Please try again.');
    }
    setIsClaiming(false);
  };

  const selectedAmount = claimableRewards?.rewards
    .filter(r => selectedRewards.has(r.id))
    .reduce((sum, r) => sum + r.amount, 0) || 0;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      QUEUED: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
      ADMIN_REVIEW: { color: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="w-3 h-3" /> },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="w-3 h-3" /> },
      FAILED: { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="w-3 h-3" /> }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: null };

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'ACTIVITY': return <Trophy className="w-4 h-4 text-blue-600" />;
      case 'STREAK': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'MILESTONE': return <Trophy className="w-4 h-4 text-purple-600" />;
      default: return <Coins className="w-4 h-4 text-yellow-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading rewards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Claim Rewards</h1>
        <p className="text-gray-600 mt-2">
          Convert your earned rewards into OmniFit tokens
        </p>
      </div>

      <Tabs defaultValue="claim" className="space-y-6">
        <TabsList>
          <TabsTrigger value="claim">Claim Rewards</TabsTrigger>
          <TabsTrigger value="requests">Mint Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="claim" className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Available Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {claimableRewards ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {claimableRewards.totalClaimable.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {claimableRewards.count}
                    </div>
                    <div className="text-sm text-gray-600">Rewards Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Selected Tokens</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">No rewards available</div>
              )}
            </CardContent>
          </Card>

          {/* Claim Form */}
          {claimableRewards && claimableRewards.rewards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Claim Tokens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wallet Address Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Solana Wallet Address
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your Solana wallet address..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Tokens will be minted to this address. Make sure it's correct!
                  </p>
                </div>

                {/* Reward Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Rewards to Claim
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedRewards.size === claimableRewards.rewards.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {claimableRewards.rewards.map((reward) => (
                      <div key={reward.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={selectedRewards.has(reward.id)}
                          onCheckedChange={() => handleRewardToggle(reward.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getRewardTypeIcon(reward.type)}
                              <span className="font-medium">{reward.reason}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                +{reward.amount} tokens
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(reward.earnedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Success Display */}
                {claimResult && (
                  <Alert className="border-green-500 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-medium">Claim request submitted successfully!</div>
                        <div className="text-sm">
                          {claimResult.tokenAmount.toLocaleString()} tokens requested
                        </div>
                        {claimResult.requiresReview && (
                          <div className="text-sm text-orange-600">
                            ⚠️ Request requires admin review due to risk factors
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          Estimated processing time: {claimResult.estimatedProcessingTime}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Claim Button */}
                <Button
                  onClick={handleClaimRewards}
                  disabled={selectedRewards.size === 0 || !walletAddress || isClaiming}
                  className="w-full"
                  size="lg"
                >
                  {isClaiming ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Claim...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Claim {selectedAmount.toLocaleString()} Tokens
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Mint Request History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mintRequests.length > 0 ? (
                <div className="space-y-4">
                  {mintRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4" />
                          <span className="font-medium">
                            {request.tokenAmount.toLocaleString()} tokens
                          </span>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Request ID: {request.id.substring(0, 8)}...</div>
                        <div>Wallet: {request.recipientWallet.substring(0, 8)}...</div>
                        <div>Requested: {new Date(request.requestedAt).toLocaleString()}</div>
                        {request.riskScore && (
                          <div>Risk Score: {(request.riskScore * 100).toFixed(0)}%</div>
                        )}
                      </div>

                      {request.status === 'COMPLETED' && (
                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                          <div className="text-sm text-green-800">
                            ✅ Tokens successfully minted to your wallet
                          </div>
                        </div>
                      )}

                      {request.status === 'ADMIN_REVIEW' && (
                        <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                          <div className="text-sm text-orange-800">
                            ⏳ Your request is under admin review for security
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <div>No mint requests yet</div>
                  <div className="text-sm">Your claim requests will appear here</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClaimRewardsPage;