import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/DropdownMenu';
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  ExternalLink, 
  Settings,
  Disconnect,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/router';

export const WalletDisplay: React.FC = () => {
  const router = useRouter();
  const { publicKey, connectionStatus, isLinked, disconnectWallet } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
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

  if (!publicKey || !connectionStatus?.connected) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="font-mono text-sm">
            {formatAddress(publicKey.toString())}
          </span>
          <div className="flex items-center gap-1">
            {isLinked ? (
              <CheckCircle className="w-3 h-3 text-green-600" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-orange-500" />
            )}
            <ChevronDown className="w-3 h-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Wallet Info */}
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Wallet</span>
            <Badge 
              variant={isLinked ? "default" : "secondary"}
              className={isLinked ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
            >
              {isLinked ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 font-mono mt-1">
            {publicKey.toString()}
          </p>
          {connectionStatus.connectedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Connected: {new Date(connectionStatus.connectedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <DropdownMenuItem
          onClick={() => copyToClipboard(publicKey.toString())}
          className="flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy Address
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => openInExplorer(publicKey.toString())}
          className="flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          View in Explorer
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push('/settings/wallet')}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Wallet Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={disconnectWallet}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Disconnect className="w-4 h-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};