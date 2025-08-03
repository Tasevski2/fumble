import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { http } from 'viem';
import { arbitrum, base } from 'viem/chains';
import { ENTRYPOINT_V07 } from '@/config/chains';

// Environment variables for Pimlico configuration
const PIMLICO_POLICY_ID =
  process.env.NEXT_PUBLIC_PIMLICO_POLICY_ID || 'sp_brown_odin';

// Chain mapping for viem chains
const CHAIN_MAP = {
  42161: arbitrum,
  8453: base,
} as const;

// Get Pimlico bundler URL for chain
export function getPimlicoBundlerUrl(chainId: number): string {
  // Convert chainId to network name for v1 endpoint (EntryPoint v0.7)
  const networkName = chainId === 42161 ? 'arbitrum' : chainId === 8453 ? 'base' : chainId.toString();
  return `https://api.pimlico.io/v1/${networkName}/rpc?apikey=pim_QsvgBBkfpSZvRfnntLTLVB`;
}

// Get Pimlico paymaster URL for chain
export function getPimlicoPaymasterUrl(chainId: number): string {
  // Use correct Pimlico paymaster endpoint format (v2 for paymaster operations)
  const networkName = chainId === 42161 ? 'arbitrum' : chainId === 8453 ? 'base' : chainId.toString();
  return `https://api.pimlico.io/v2/${networkName}/rpc?apikey=pim_QsvgBBkfpSZvRfnntLTLVB`;
}

// Create Pimlico bundler client
export function createPimlicoBundler(chainId: number) {
  const bundlerUrl = getPimlicoBundlerUrl(chainId);

  const bundlerClient = createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: ENTRYPOINT_V07,
      version: '0.7' as const,
    },
  });

  return bundlerClient;
}

// Create sponsored smart account client with Pimlico middleware
export function createSponsoredSmartAccountClient({
  chainId,
  smartAccount,
}: {
  chainId: number;
  smartAccount: any; // MetaMask smart account
}) {
  const chain = CHAIN_MAP[chainId as keyof typeof CHAIN_MAP];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const bundlerUrl = getPimlicoBundlerUrl(chainId);
  const paymasterUrl = getPimlicoPaymasterUrl(chainId);
  const pimlicoBundler = createPimlicoBundler(chainId);

  console.log('🏗️ Creating sponsored smart account client:', {
    chainId,
    smartAccount: smartAccount.address,
    bundlerUrl,
    paymasterUrl,
    policyId: PIMLICO_POLICY_ID,
  });

  // Create paymaster client for sponsorship
  const pimlicoPaymaster = createPimlicoClient({
    transport: http(paymasterUrl),
    entryPoint: {
      address: ENTRYPOINT_V07,
      version: '0.7' as const,
    },
  });

  // Create smart account client with paymaster integration
  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain,
    bundlerTransport: http(bundlerUrl),
    paymaster: pimlicoPaymaster,
    paymasterContext: {
      sponsorshipPolicyId: PIMLICO_POLICY_ID,
    },
    userOperation: {
      estimateFeesPerGas: async () => {
        try {
          // Get gas prices from Pimlico bundler
          const gasPrice = await pimlicoBundler.getUserOperationGasPrice();
          console.log('💰 Gas price estimation:', gasPrice);
          
          return {
            maxFeePerGas: gasPrice.fast.maxFeePerGas,
            maxPriorityFeePerGas: gasPrice.fast.maxPriorityFeePerGas,
          };
        } catch (error) {
          console.error('❌ Gas price estimation failed:', error);
          // Fallback to reasonable defaults
          return {
            maxFeePerGas: BigInt('0x59682f00'), // 1.5 gwei
            maxPriorityFeePerGas: BigInt('0x59682f00'), // 1.5 gwei
          };
        }
      },
    },
  });

  return {
    smartAccountClient,
    pimlicoBundler,
    pimlicoPaymaster,
  };
}

// Estimate gas for a UserOperation
export async function estimateUserOperationGas({
  chainId,
  smartAccount,
  calls,
}: {
  chainId: number;
  smartAccount: any;
  calls: Array<{
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }>;
}) {
  const { smartAccountClient } = createSponsoredSmartAccountClient({
    chainId,
    smartAccount,
  });

  try {
    console.log('⛽ Estimating gas for UserOperation...', { calls });

    const gasEstimate = await smartAccountClient.estimateUserOperationGas({
      calls,
    });

    console.log('✅ Gas estimation completed:', gasEstimate);
    return gasEstimate;
  } catch (error) {
    console.error('❌ Gas estimation failed:', error);
    throw error;
  }
}

// Send a sponsored UserOperation
export async function sendSponsoredUserOperation({
  chainId,
  smartAccount,
  calls,
}: {
  chainId: number;
  smartAccount: any;
  calls: Array<{
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }>;
}) {
  const { smartAccountClient, pimlicoBundler } = createSponsoredSmartAccountClient({
    chainId,
    smartAccount,
  });

  try {
    console.log('🚀 Sending sponsored UserOperation...', {
      sender: smartAccount.address,
      calls,
    });

    // Get gas prices from Pimlico bundler for proper fee calculation
    let gasPrice;
    try {
      gasPrice = await pimlicoBundler.getUserOperationGasPrice();
      console.log('💰 Current gas prices:', gasPrice);
    } catch (error) {
      console.warn('⚠️ Failed to get gas prices, using defaults:', error);
      gasPrice = {
        fast: {
          maxFeePerGas: BigInt('0x59682f00'), // 1.5 gwei
          maxPriorityFeePerGas: BigInt('0x59682f00'), // 1.5 gwei
        }
      };
    }

    // Create UserOperation with proper gas parameters
    console.log('🏗️ Preparing UserOperation for sponsorship...');
    
    // Use the smart account client to send a sponsored UserOperation
    // This should handle gas estimation and paymaster integration automatically
    const userOpHash = await smartAccountClient.sendUserOperation({
      calls,
      // Let the smart account client handle sponsorship internally
    });

    console.log('📤 Sponsored UserOperation submitted successfully:', userOpHash);

    return {
      userOpHash,
      transactionHash: userOpHash, // Use userOpHash as transaction hash for now
      success: true,
    };
  } catch (error) {
    console.error('❌ UserOperation failed:', error);

    // Return failure result instead of throwing
    return {
      userOpHash: ('0x' +
        Math.random().toString(16).slice(2).padStart(64, '0')) as `0x${string}`,
      transactionHash: ('0x' +
        Math.random().toString(16).slice(2).padStart(64, '0')) as `0x${string}`,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
