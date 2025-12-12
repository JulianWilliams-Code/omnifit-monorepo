import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface TokenBalanceProps {
  balance: number;
  pendingRewards?: number;
  showUSDValue?: boolean;
  tokenPrice?: number;
  className?: string;
}

const TokenBalance = React.forwardRef<HTMLDivElement, TokenBalanceProps>(
  ({ balance, pendingRewards = 0, showUSDValue = false, tokenPrice = 0.01, className }, ref) => {
    const formatTokens = (amount: number) => {
      if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}M`;
      }
      if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K`;
      }
      return amount.toLocaleString();
    };
    
    const usdValue = balance * tokenPrice;
    
    return (
      <Card ref={ref} className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-token-500">OMF</span>
            <span>Token Balance</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-token-500">
                {formatTokens(balance)}
              </div>
              {showUSDValue && (
                <div className="text-sm text-muted-foreground">
                  ≈ ${usdValue.toFixed(2)} USD
                </div>
              )}
            </div>
            
            {pendingRewards > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Pending Rewards
                </span>
                <Badge variant="token" className="text-xs">
                  +{formatTokens(pendingRewards)} OMF
                </Badge>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 text-center pt-3 border-t">
              <div>
                <div className="text-lg font-semibold text-fitness-500">
                  {formatTokens(Math.floor(balance * 0.6))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Fitness Rewards
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-spiritual-500">
                  {formatTokens(Math.floor(balance * 0.4))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Spiritual Rewards
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

TokenBalance.displayName = 'TokenBalance';

export { TokenBalance };