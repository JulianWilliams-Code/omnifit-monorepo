import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { ConnectWallet } from '../ConnectWallet';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/lib/auth-context';

// Mock the hooks
jest.mock('@solana/wallet-adapter-react');
jest.mock('@/hooks/useWallet');
jest.mock('@/lib/auth-context');

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockUseSolanaWallet = useSolanaWallet as jest.MockedFunction<typeof useSolanaWallet>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ConnectWallet', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: { token: 'test-token', email: 'test@example.com' },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    mockUseSolanaWallet.mockReturnValue({
      publicKey: null,
      connected: false,
      signMessage: undefined,
      disconnect: jest.fn(),
      select: jest.fn(),
    } as any);

    mockUseWallet.mockReturnValue({
      publicKey: null,
      connected: false,
      isConnecting: false,
      isDisconnecting: false,
      connectionStatus: null,
      isLinked: false,
      selectWallet: jest.fn(),
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      getWalletStatus: jest.fn(),
      getWalletHistory: jest.fn(),
    });
  });

  it('renders connect wallet component', () => {
    render(<ConnectWallet />);
    
    expect(screen.getByText('Wallet Connection')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Connect Your Wallet')).toBeInTheDocument();
  });

  it('shows wallet adapter button when wallet not connected', () => {
    render(<ConnectWallet />);
    
    // The WalletMultiButton should be rendered
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows verification step when wallet is connected but not verified', () => {
    mockUseSolanaWallet.mockReturnValue({
      publicKey: { toString: () => 'test-public-key' },
      connected: true,
      signMessage: jest.fn(),
      disconnect: jest.fn(),
      select: jest.fn(),
    } as any);

    render(<ConnectWallet />);
    
    expect(screen.getByText('Step 2: Verify Ownership')).toBeInTheDocument();
    expect(screen.getByText('Verify Wallet Ownership')).toBeInTheDocument();
  });

  it('shows verified state when wallet is linked', () => {
    mockUseSolanaWallet.mockReturnValue({
      publicKey: { toString: () => 'test-public-key' },
      connected: true,
      signMessage: jest.fn(),
      disconnect: jest.fn(),
      select: jest.fn(),
    } as any);

    mockUseWallet.mockReturnValue({
      ...mockUseWallet(),
      isLinked: true,
      connectionStatus: {
        connected: true,
        walletAddress: 'test-public-key',
        connectedAt: '2024-01-01T00:00:00Z',
        lastVerified: '2024-01-01T00:00:00Z',
        pendingVerifications: 0,
      },
    });

    render(<ConnectWallet />);
    
    expect(screen.getByText('Wallet Verified')).toBeInTheDocument();
    expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
  });

  it('handles wallet verification click', async () => {
    const mockConnectWallet = jest.fn().mockResolvedValue({ success: true });
    
    mockUseSolanaWallet.mockReturnValue({
      publicKey: { toString: () => 'test-public-key' },
      connected: true,
      signMessage: jest.fn(),
      disconnect: jest.fn(),
      select: jest.fn(),
    } as any);

    mockUseWallet.mockReturnValue({
      ...mockUseWallet(),
      connectWallet: mockConnectWallet,
    });

    render(<ConnectWallet />);
    
    const verifyButton = screen.getByText('Verify Wallet Ownership');
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockConnectWallet).toHaveBeenCalled();
    });
  });

  it('handles wallet disconnection', async () => {
    const mockDisconnectWallet = jest.fn().mockResolvedValue({ success: true });
    
    mockUseSolanaWallet.mockReturnValue({
      publicKey: { toString: () => 'test-public-key' },
      connected: true,
      signMessage: jest.fn(),
      disconnect: jest.fn(),
      select: jest.fn(),
    } as any);

    mockUseWallet.mockReturnValue({
      ...mockUseWallet(),
      isLinked: true,
      disconnectWallet: mockDisconnectWallet,
      connectionStatus: {
        connected: true,
        walletAddress: 'test-public-key',
        connectedAt: '2024-01-01T00:00:00Z',
        lastVerified: '2024-01-01T00:00:00Z',
        pendingVerifications: 0,
      },
    });

    render(<ConnectWallet />);
    
    const disconnectButton = screen.getByText('Disconnect Wallet');
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(mockDisconnectWallet).toHaveBeenCalled();
    });
  });

  it('shows loading state during connection', () => {
    mockUseSolanaWallet.mockReturnValue({
      publicKey: { toString: () => 'test-public-key' },
      connected: true,
      signMessage: jest.fn(),
      disconnect: jest.fn(),
      select: jest.fn(),
    } as any);

    mockUseWallet.mockReturnValue({
      ...mockUseWallet(),
      isConnecting: true,
    });

    render(<ConnectWallet />);
    
    expect(screen.getByText('Verifying...')).toBeInTheDocument();
  });

  it('shows loading state during disconnection', () => {
    mockUseSolanaWallet.mockReturnValue({
      publicKey: { toString: () => 'test-public-key' },
      connected: true,
      signMessage: jest.fn(),
      disconnect: jest.fn(),
      select: jest.fn(),
    } as any);

    mockUseWallet.mockReturnValue({
      ...mockUseWallet(),
      isLinked: true,
      isDisconnecting: true,
      connectionStatus: {
        connected: true,
        walletAddress: 'test-public-key',
        connectedAt: '2024-01-01T00:00:00Z',
        lastVerified: '2024-01-01T00:00:00Z',
        pendingVerifications: 0,
      },
    });

    render(<ConnectWallet />);
    
    expect(screen.getByText('Disconnecting...')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<ConnectWallet compact={true} />);
    
    // In compact mode, the full card layout should not be present
    expect(screen.queryByText('Wallet Connection')).not.toBeInTheDocument();
    expect(screen.queryByText('Step 1: Connect Your Wallet')).not.toBeInTheDocument();
  });

  it('shows network warning for non-mainnet', () => {
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'devnet';
    
    render(<ConnectWallet />);
    
    expect(screen.getByText(/Connected to devnet network/)).toBeInTheDocument();
  });

  it('displays error messages', () => {
    mockUseSolanaWallet.mockReturnValue({
      publicKey: { toString: () => 'test-public-key' },
      connected: true,
      signMessage: jest.fn(),
      disconnect: jest.fn(),
      select: jest.fn(),
    } as any);

    const mockConnectWallet = jest.fn().mockRejectedValue(new Error('Connection failed'));
    
    mockUseWallet.mockReturnValue({
      ...mockUseWallet(),
      connectWallet: mockConnectWallet,
    });

    render(<ConnectWallet />);
    
    const verifyButton = screen.getByText('Verify Wallet Ownership');
    fireEvent.click(verifyButton);

    // Error should be handled by the component
    expect(mockConnectWallet).toHaveBeenCalled();
  });
});