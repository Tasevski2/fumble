export const CHAINS = {
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    symbol: "ETH",
    oneInch: {
      orderbookApiBase: "https://limit-orders.1inch.io/v4.0/42161/",
      verifyingContract: "0x7F069df72b7A39bCE9806e3AfaF579E54D8CF2b9" as const,
    },
    blockExplorer: "https://arbiscan.io",
  },
  base: {
    chainId: 8453,
    name: "Base",
    symbol: "ETH",
    oneInch: {
      orderbookApiBase: "https://limit-orders.1inch.io/v4.0/8453/",
      verifyingContract: "0x7F069df72b7A39bCE9806e3AfaF579E54D8CF2b9" as const, // Using same contract for now - update when Base contract is known
    },
    blockExplorer: "https://basescan.org",
  },
} as const;

// EntryPoint v0.6 address for ERC-4337 (more widely supported)
export const ENTRYPOINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as const;

// EntryPoint v0.7 address (future use)
export const ENTRYPOINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

export type ChainKey = keyof typeof CHAINS;
export type ChainConfig = typeof CHAINS[ChainKey];

// Active chain IDs for the application
export const ACTIVE_CHAIN_IDS = [42161, 8453] as const;

// USDC addresses by chain (native USDC, not bridged versions)
export const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum USDC (native)
  8453:  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC (native)
};

// Helper to get chain config by ID
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find(chain => chain.chainId === chainId);
}

// Helper to get USDC address by chain ID
export function getUSDCAddress(chainId: number): `0x${string}` | undefined {
  return USDC_BY_CHAIN[chainId];
}

// Helper to validate if a chain is supported
export function isChainSupported(chainId: number): boolean {
  return ACTIVE_CHAIN_IDS.includes(chainId as 42161 | 8453);
}

// Helper to get 1inch verifying contract for delegation allowed targets
export function getOneInchVerifyingContract(chainId: number): `0x${string}` | undefined {
  const config = getChainConfig(chainId);
  return config?.oneInch.verifyingContract;
}