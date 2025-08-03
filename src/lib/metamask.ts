// DEPRECATED: This file has been replaced by Wagmi integration
// 
// New MetaMask integration uses:
// - Wagmi configuration: src/config/wagmi.ts  
// - Wagmi providers: src/components/providers/WagmiProvider.tsx
// - Updated useWallet hook: src/hooks/useWallet.ts
// - MDT smart accounts: src/lib/mdt.ts
//
// Please use the useWallet hook from '@/hooks/useWallet' instead

console.warn('DEPRECATED: metamask.ts has been replaced by Wagmi integration. Use useWallet hook instead.');

// Stub exports for backward compatibility during migration
export const isMetaMaskInstalled = () => {
  throw new Error('Use Wagmi useAccount hook instead');
};

export const connectMetaMask = () => {
  throw new Error('Use Wagmi useConnect hook instead');
};

export const getConnectedAccounts = () => {
  throw new Error('Use Wagmi useAccount hook instead');
};

export const switchChain = () => {
  throw new Error('Use Wagmi useSwitchChain hook instead');
};

export const getCurrentChainId = () => {
  throw new Error('Use Wagmi useAccount hook instead');
};

export const setupMetaMaskListeners = () => {
  throw new Error('Wagmi handles events automatically');
};

export const removeMetaMaskListeners = () => {
  throw new Error('Wagmi handles events automatically');
};

// Legacy exports
export const ethereum = null;
export const getEthereum = () => null;
export const initMetaMaskSDK = () => null;