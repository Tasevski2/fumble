import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWalletClient,
} from 'wagmi';
import { useAppStore } from '@/state/useAppStore';
import { initMDT, type SessionHandle, isSessionValid } from '@/lib/mdt';
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
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const { updateAddress, sessions, updateSession } = useAppStore();

  // Helper to reconstruct session handle from stored session data
  const reconstructSessionHandle = useCallback(
    async (targetChainId: number): Promise<SessionHandle | null> => {
      const storedSession = sessions[targetChainId];
      if (!storedSession || !storedSession.isEnabled) {
        return null;
      }

      try {
        console.log(
          `🔄 Reconstructing session handle for chain ${targetChainId}`
        );

        // Ensure wallet is connected
        if (!isConnected || !address) {
          throw new Error('Wallet not connected');
        }

        // Switch to the correct chain if needed
        if (chainId !== targetChainId) {
          await switchChainAsync({
            chainId: targetChainId as SupportedChainId,
          });
        }

        // Re-initialize MDT session using stored session data
        const sessionHandle = await initMDT(targetChainId, walletClient);

        // Update session handle in local state
        setSessionHandles((prev) => ({
          ...prev,
          [targetChainId]: sessionHandle,
        }));

        console.log(
          `✅ Session handle reconstructed for chain ${targetChainId}`
        );
        return sessionHandle;
      } catch (error) {
        console.error(
          `❌ Failed to reconstruct session handle for chain ${targetChainId}:`,
          error
        );
        return null;
      }
    },
    [sessions, isConnected, address, chainId, switchChainAsync, walletClient]
  );

  // Check if MetaMask is available
  const isMetaMaskAvailable = useCallback(() => {
    const metaMaskConnector = connectors.find(
      (connector) => connector.id === 'metaMask' || connector.id === 'injected'
    );
    return !!metaMaskConnector;
  }, [connectors]);

  // Validate MetaMask installation
  const validateMetaMask = useCallback(() => {
    if (!isMetaMaskAvailable()) {
      throw new Error(
        'MetaMask is not installed. Please install MetaMask to use Fumble.'
      );
    }

    // Additional check for window.ethereum to ensure MetaMask is properly installed
    if (typeof window !== 'undefined' && !window.ethereum?.isMetaMask) {
      throw new Error(
        'MetaMask extension not detected. Please ensure MetaMask is installed and enabled.'
      );
    }

    return true;
  }, [isMetaMaskAvailable]);

  // Clean up expired sessions
  const cleanupExpiredSessions = useCallback(() => {
    const allSessions = useAppStore.getState().sessions;
    let hasExpired = false;

    Object.entries(allSessions).forEach(([chainIdStr, session]) => {
      const chainId = parseInt(chainIdStr);
      if (session.expiresAt && !isSessionValid(session.expiresAt)) {
        console.log(`Cleaning up expired session for chain ${chainId}`);
        updateSession(chainId, { isEnabled: false });
        hasExpired = true;
      }
    });

    if (hasExpired) {
      console.log('Expired sessions cleaned up');
    }
  }, [updateSession]);

  // Connect wallet using MetaMask only
  const connect = useCallback(
    async (addressId: string) => {
      setError(null);

      try {
        // Validate MetaMask installation first
        validateMetaMask();

        // Get MetaMask connector
        const metaMaskConnector = connectors.find(
          (connector) =>
            connector.id === 'metaMask' || connector.id === 'injected'
        );

        console.log('🔗 Available connectors:', connectors);
        console.log('🔗 MetaMask connector found:', !!metaMaskConnector);

        if (!metaMaskConnector) {
          throw new Error(
            'MetaMask connector not available. Please refresh and try again.'
          );
        }

        const result = await wagmiConnect({ connector: metaMaskConnector });
        console.log('🔗 MetaMask connection result:', result);

        // Validate that we're actually connected to MetaMask
        if (result.accounts && result.accounts.length > 0) {
          console.log(
            '✅ Successfully connected to MetaMask account:',
            result.accounts[0]
          );
        } else {
          console.warn('⚠️ Connected but no accounts found');
        }

        // Note: Don't update address here - let useEffect handle it
        // to prevent race conditions and infinite loops
      } catch (err: any) {
        setError(err.message || 'MetaMask connection failed');
        console.error('🔗 MetaMask connection error:', err);
      }
    },
    [wagmiConnect, connectors, validateMetaMask]
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
          await switchChainAsync({
            chainId: targetChainId as SupportedChainId,
          });
        }

        // Initialize MDT session with walletClient
        console.log(
          `🔗 Initializing MDT session for chain ${targetChainId}...`
        );
        const sessionHandle = await initMDT(targetChainId, walletClient);
        console.log(`✅ MDT session handle created:`, sessionHandle);

        // Store session handle in local state
        setSessionHandles((prev) => {
          const updated = {
            ...prev,
            [targetChainId]: sessionHandle,
          };
          console.log(`📦 Session handles updated:`, updated);
          return updated;
        });

        // Update global store with deployment tracking
        const sessionData = {
          chainId: targetChainId,
          accountAddress: sessionHandle.accountAddress,
          sessionKeyAddress: sessionHandle.sessionKeyAddress,
          isEnabled: true,
          isDeployed: sessionHandle.isDeployed,
          deploymentHash: sessionHandle.deploymentHash,
          expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
        };
        console.log(`💾 Updating session in store:`, sessionData);
        updateSession(targetChainId, sessionData);

        // Verify session was stored
        const storedSessions = useAppStore.getState().sessions;
        console.log(`✅ All sessions in store:`, storedSessions);
        console.log(
          `✅ Session for chain ${targetChainId}:`,
          storedSessions[targetChainId]
        );

        return sessionHandle;
      } catch (err: any) {
        setError(err.message || 'Session initialization failed');
        console.error('Session initialization error:', err);
        throw err;
      }
    },
    [
      isConnected,
      address,
      chainId,
      switchChainAsync,
      walletClient,
      updateSession,
    ]
  );

  // Get session for a chain - auto-reconstruct if missing but stored
  const getSession = useCallback(
    async (targetChainId: number): Promise<SessionHandle | null> => {
      // Check if session handle exists in memory
      if (sessionHandles[targetChainId]) {
        console.log(
          `✅ Session handle found in memory for chain ${targetChainId}`
        );
        return sessionHandles[targetChainId];
      }

      // Check if session exists in storage but handle is missing
      const storedSession = sessions[targetChainId];
      if (storedSession && storedSession.isEnabled) {
        console.log(
          `🔄 Session exists in storage but handle missing for chain ${targetChainId}`
        );

        // Reconstruct session handle from stored data
        const reconstructedHandle = await reconstructSessionHandle(
          targetChainId
        );
        return reconstructedHandle;
      }

      console.log(`❌ No session found for chain ${targetChainId}`);
      return null;
    },
    [sessionHandles, sessions, reconstructSessionHandle]
  );

  // Check if session exists and is valid for a chain
  const hasSession = useCallback(
    (chainId: number): boolean => {
      const session = sessions[chainId];
      console.log(`🔍 Checking session for chain ${chainId}:`, session);

      if (!session) {
        console.log(`❌ No session found for chain ${chainId}`);
        return false;
      }

      if (!session.isEnabled) {
        console.log(`❌ Session exists but not enabled for chain ${chainId}`);
        return false;
      }

      // Check if session is still valid (not expired)
      if (session.expiresAt && !isSessionValid(session.expiresAt)) {
        console.warn(`❌ Session for chain ${chainId} has expired`);
        // TODO: Auto-cleanup expired session from store
        return false;
      }

      console.log(`✅ Valid session found for chain ${chainId}`);
      return true;
    },
    [sessions]
  );

  // Update addresses when account changes - avoid infinite loop by not depending on addresses array
  useEffect(() => {
    const currentAddresses = useAppStore.getState().addresses;

    if (isConnected && address && chainId) {
      // Validate that we're connected to MetaMask and not another wallet
      const connectedConnector = connectors.find(
        (connector) =>
          connector.id === 'metaMask' || connector.id === 'injected'
      );

      if (!connectedConnector) {
        console.warn(
          '⚠️ Connected but MetaMask connector not found. This might be another wallet.'
        );
        setError('Connected to non-MetaMask wallet. Please use MetaMask only.');
        return;
      }

      console.log('✅ Confirmed MetaMask connection:', {
        address,
        chainId,
        connector: connectedConnector.id,
      });

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
  }, [isConnected, address, chainId, updateAddress, connectors, setError]);

  return {
    connect,
    disconnect,
    initializeSession,
    getSession,
    hasSession,
    cleanupExpiredSessions,
    isConnecting,
    isConnected,
    address,
    chainId,
    error,
    // MetaMask validation functions
    isMetaMaskAvailable,
    validateMetaMask,
    // Add additional Wagmi-specific properties
    switchChain: (chainId: SupportedChainId) => switchChainAsync({ chainId }),
  };
}
