'use client';

import { Button } from '@omnifit/ui';
import { useAuth } from '@/lib/auth-context';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ConnectWallet } from '@/components/wallet/ConnectWallet';
import { WalletDisplay } from '@/components/wallet/WalletDisplay';
import { useWallet } from '@/hooks/useWallet';

export function Header() {
  const { user, logout } = useAuth();
  const { isLinked } = useWallet();

  return (
    <header className="border-b bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Wallet Connection */}
          {isLinked ? (
            <WalletDisplay />
          ) : (
            <ConnectWallet compact={true} />
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="ghost" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}