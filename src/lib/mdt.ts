import { 
  toMetaMaskSmartAccount,
  createDelegation,
  signDelegation,
  createCaveat,
  Implementation,
  createExecution,
} from '@metamask/delegation-toolkit';
import { 
  createPublicClient, 
  http, 
  type Chain, 
  type WalletClient,
  parseEther,
  zeroAddress,
} from 'viem';
import { arbitrum, base } from 'viem/chains';
import { getChainConfig } from '@/config/chains';

export interface SessionHandle {
  accountAddress: `0x${string}`;
  smartAccount: any; // MetaMask Smart Account instance
  delegateAccount: any; // Delegate smart account for gasless transactions
  signTypedData: (typedData: any) => Promise<`0x${string}`>;
  executeUserOperation: (to: `0x${string}`, data: `0x${string}`, value?: bigint) => Promise<any>;
}

// Map chain IDs to viem chains
const chainMap: Record<number, Chain> = {
  42161: arbitrum,
  8453: base,
};

// Initialize MDT Smart Account with delegation (session)
export async function initMDT(chainId: number, walletClient?: WalletClient): Promise<SessionHandle> {
  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) {
    throw new Error('Chain not supported');
  }

  const viemChain = chainMap[chainId];
  if (!viemChain) {
    throw new Error('Chain not configured for viem');
  }

  if (!walletClient) {
    throw new Error('Wallet client not available');
  }

  // Create public client for blockchain interactions
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(),
  });

  try {
    // Get the EOA address from wallet client
    const eoaAddress = walletClient.account?.address;
    if (!eoaAddress) {
      throw new Error('No account address available');
    }

    console.log('Creating MetaMask Smart Account for:', eoaAddress);

    // Create delegator (main) smart account
    const delegatorSmartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [eoaAddress, [], [], []],
      deploySalt: '0x0000000000000000000000000000000000000000000000000000000000000000',
      signatory: { 
        account: { address: eoaAddress, type: 'json-rpc' } as any,
      },
    });

    // Create delegate smart account for gasless transactions
    const delegateSmartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [eoaAddress, [], [], []],
      deploySalt: '0x0000000000000000000000000000000000000000000000000000000000000001',
      signatory: { 
        account: { address: eoaAddress, type: 'json-rpc' } as any,
      },
    });

    // Create basic delegation without complex caveats for now
    const delegation = createDelegation({
      to: delegateSmartAccount.address,
      from: delegatorSmartAccount.address,
      caveats: [], // Simplified - no caveats for initial implementation
    });

    // Sign the delegation
    const signedDelegation = await delegatorSmartAccount.signDelegation({ delegation });

    console.log('MDT session created successfully:', {
      delegator: delegatorSmartAccount.address,
      delegate: delegateSmartAccount.address,
      caveats: delegation.caveats.length,
    });

    // Return session handle with smart account capabilities
    return {
      accountAddress: delegatorSmartAccount.address,
      smartAccount: delegatorSmartAccount,
      delegateAccount: delegateSmartAccount,
      
      signTypedData: async (typedData: any) => {
        // Use smart account to sign with EIP-1271 support
        return await delegatorSmartAccount.signTypedData(typedData);
      },

      executeUserOperation: async (to: `0x${string}`, callData: `0x${string}`, value?: bigint) => {
        // Create execution for the user operation
        const execution = createExecution({
          target: to,
          callData,
          value: value || BigInt(0),
        });

        // For now, return mock execution
        // TODO: Integrate with bundler for actual user operation submission
        console.log('Mock user operation execution:', {
          to,
          callData,
          value,
          execution,
        });

        return { 
          hash: '0x' + Math.random().toString(16).slice(2),
          success: true,
        };
      },
    };

  } catch (error) {
    console.error('MDT initialization error:', error);
    
    // Fallback to EOA mode if smart account creation fails
    console.warn('Falling back to EOA mode');
    
    const eoaAddress = walletClient.account?.address;
    if (!eoaAddress) {
      throw new Error('No account available');
    }

    return {
      accountAddress: eoaAddress,
      smartAccount: null,
      delegateAccount: null,
      
      signTypedData: async (typedData: any) => {
        return await walletClient.signTypedData(typedData);
      },

      executeUserOperation: async (to: `0x${string}`, callData: `0x${string}`, value?: bigint) => {
        console.log('EOA fallback execution:', { to, callData, value });
        return { 
          hash: '0x' + Math.random().toString(16).slice(2),
          success: true,
        };
      },
    };
  }
}

// Helper to check if a session is still valid
export function isSessionValid(expiresAt: number): boolean {
  return Date.now() / 1000 < expiresAt;
}

// Helper to create a bundler client for user operations
export async function createBundlerClient(chainId: number) {
  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) {
    throw new Error('Chain not supported');
  }

  const viemChain = chainMap[chainId];
  if (!viemChain) {
    throw new Error('Chain not configured for viem');
  }

  // TODO: Replace with actual bundler endpoint
  // For now, return a mock bundler client
  return {
    sendUserOperation: async (userOp: any) => {
      console.log('Mock bundler execution:', userOp);
      return { 
        hash: '0x' + Math.random().toString(16).slice(2),
        success: true,
      };
    },
  };
}