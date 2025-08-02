import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/state/useAppStore';
import { 
  connectMetaMask, 
  getConnectedAccounts, 
  getCurrentChainId,
  setupMetaMaskListeners,
  removeMetaMaskListeners,
  switchChain
} from '@/lib/metamask';
import { initMDT, type SessionHandle } from '@/lib/mdt';
import { isChainSupported } from '@/config/chains';

export function useWallet() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionHandles, setSessionHandles] = useState<Record<number, SessionHandle>>({});
  
  const { 
    addresses, 
    updateAddress, 
    sessions, 
    updateSession 
  } = useAppStore();

  // Connect wallet
  const connect = useCallback(async (addressId: string) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const accounts = await connectMetaMask();
      if (accounts.length > 0) {
        const chainId = await getCurrentChainId();
        updateAddress(addressId, { 
          isConnected: true,
          address: accounts[0],
          chainId: chainId || undefined,
        });
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [updateAddress]);

  // Initialize session for a chain
  const initializeSession = useCallback(async (chainId: number) => {
    setError(null);
    
    try {
      // Check if chain is supported
      if (!isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} is not supported`);
      }

      // Switch to the correct chain if needed
      const currentChainId = await getCurrentChainId();
      if (currentChainId !== chainId) {
        await switchChain(chainId);
      }

      // Initialize MDT session
      const sessionHandle = await initMDT(chainId);
      
      // Store session handle
      setSessionHandles(prev => ({
        ...prev,
        [chainId]: sessionHandle,
      }));

      // Update store
      updateSession(chainId, {
        chainId,
        accountAddress: sessionHandle.accountAddress,
        isEnabled: true,
        expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
      });

      return sessionHandle;
    } catch (err: any) {
      setError(err.message);
      console.error('Session initialization error:', err);
      throw err;
    }
  }, [updateSession]);

  // Get session for a chain
  const getSession = useCallback((chainId: number): SessionHandle | null => {
    return sessionHandles[chainId] || null;
  }, [sessionHandles]);

  // Check if session exists for a chain
  const hasSession = useCallback((chainId: number): boolean => {
    const session = sessions[chainId];
    return session?.isEnabled || false;
  }, [sessions]);

  // Setup MetaMask event listeners
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      // Update connected addresses
      addresses.forEach((addr) => {
        if (addr.isConnected) {
          updateAddress(addr.id, {
            address: accounts[0] || addr.address,
            isConnected: accounts.length > 0,
          });
        }
      });
    };

    const handleChainChanged = (chainId: number) => {
      // Update chain ID for connected addresses
      addresses.forEach((addr) => {
        if (addr.isConnected) {
          updateAddress(addr.id, { chainId });
        }
      });
    };

    setupMetaMaskListeners(handleAccountsChanged, handleChainChanged);

    return () => {
      removeMetaMaskListeners();
    };
  }, [addresses, updateAddress]);

  // Check initial connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const accounts = await getConnectedAccounts();
      const chainId = await getCurrentChainId();
      
      if (accounts.length > 0 && chainId) {
        // Update any matching addresses
        addresses.forEach((addr) => {
          if (addr.address.toLowerCase() === accounts[0].toLowerCase()) {
            updateAddress(addr.id, { 
              isConnected: true,
              chainId,
            });
          }
        });
      }
    };

    checkConnection();
  }, [addresses, updateAddress]);

  return {
    connect,
    initializeSession,
    getSession,
    hasSession,
    isConnecting,
    error,
  };
}