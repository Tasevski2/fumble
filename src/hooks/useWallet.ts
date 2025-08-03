import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWalletClient,
} from 'wagmi';
import { useAppStore } from '@/state/useAppStore';
import { initMDT, type SessionHandle } from '@/lib/mdt';
import { isChainSupported } from '@/config/chains';
import { type SupportedChainId } from '@/config/wagmi';

export function useWallet() {
  const [error, setError] = useState<string | null>(null);
  const [sessionHandles, setSessionHandles] = useState<
    Record<number, SessionHandle>
  >({});

  // Wagmi hooks
  const { address, isConnected, chainId } = useAccount();
  const {
    connectAsync: wagmiConnect,
    connectors,
    isPending: isConnecting,
  } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const { updateAddress, sessions, updateSession } = useAppStore();

  // Get MetaMask connector

  // Connect wallet using Wagmi
  const connect = useCallback(
    async (addressId: string) => {
      setError(null);

      // Try MetaMask connector first, then fallback to injected
      const metaMaskConnector = connectors.find(
        (connector) => connector.id === 'metaMask'
      );
      const injectedConnector = connectors.find(
        (connector) => connector.id === 'injected'
      );
      console.log({ connectors });
      const preferredConnector = metaMaskConnector || injectedConnector;

      console.log(
        '🔗 Available connectors:',
        connectors.map((c) => c.id)
      );
      console.log('🔗 Using connector:', preferredConnector?.id);

      if (!preferredConnector) {
        setError('No wallet connector found');
        return;
      }

      try {
        const result = await wagmiConnect({ connector: preferredConnector });
        console.log('🔗 Connection result:', result);

        // Note: Don't update address here - let useEffect handle it
        // to prevent race conditions and infinite loops
      } catch (err: any) {
        setError(err.message || 'Connection failed');
        console.error('🔗 Connection error:', err);
      }
    },
    [wagmiConnect, connectors]
  );

  // Initialize session for a chain
  const initializeSession = useCallback(
    async (targetChainId: number) => {
      setError(null);

      try {
        // Check if chain is supported
        if (!isChainSupported(targetChainId)) {
          throw new Error(`Chain ${targetChainId} is not supported`);
        }

        // Ensure wallet is connected
        if (!isConnected || !address) {
          throw new Error('Wallet not connected');
        }

        // Switch to the correct chain if needed
        if (chainId !== targetChainId) {
          await switchChain({ chainId: targetChainId as SupportedChainId });
        }

        // Initialize MDT session with walletClient
        const sessionHandle = await initMDT(targetChainId, walletClient);

        // Store session handle
        setSessionHandles((prev) => ({
          ...prev,
          [targetChainId]: sessionHandle,
        }));

        // Update store
        updateSession(targetChainId, {
          chainId: targetChainId,
          accountAddress: sessionHandle.accountAddress,
          isEnabled: true,
          expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
        });

        return sessionHandle;
      } catch (err: any) {
        setError(err.message || 'Session initialization failed');
        console.error('Session initialization error:', err);
        throw err;
      }
    },
    [isConnected, address, chainId, switchChain, walletClient, updateSession]
  );

  // Get session for a chain
  const getSession = useCallback(
    (chainId: number): SessionHandle | null => {
      return sessionHandles[chainId] || null;
    },
    [sessionHandles]
  );

  // Check if session exists for a chain
  const hasSession = useCallback(
    (chainId: number): boolean => {
      const session = sessions[chainId];
      return session?.isEnabled || false;
    },
    [sessions]
  );

  // Update addresses when account changes - avoid infinite loop by not depending on addresses array
  useEffect(() => {
    const currentAddresses = useAppStore.getState().addresses;

    if (isConnected && address && chainId) {
      // Update any matching addresses in store
      currentAddresses.forEach((addr) => {
        if (addr.address.toLowerCase() === address.toLowerCase()) {
          updateAddress(addr.id, {
            isConnected: true,
            address,
            chainId,
          });
        }
      });
    } else if (!isConnected) {
      // Mark all addresses as disconnected
      currentAddresses.forEach((addr) => {
        if (addr.isConnected) {
          updateAddress(addr.id, { isConnected: false });
        }
      });
    }
  }, [isConnected, address, chainId, updateAddress]);

  return {
    connect,
    disconnect,
    initializeSession,
    getSession,
    hasSession,
    isConnecting,
    isConnected,
    address,
    chainId,
    error,
    // Add additional Wagmi-specific properties
    switchChain: (chainId: SupportedChainId) => switchChain({ chainId }),
  };
}
