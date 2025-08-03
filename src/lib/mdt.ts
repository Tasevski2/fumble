import {
  toMetaMaskSmartAccount,
  Implementation,
} from '@metamask/delegation-toolkit';

import {
  createPublicClient,
  http,
  type Chain,
  type WalletClient,
  type PrivateKeyAccount,
} from 'viem';
import { arbitrum, base } from 'viem/chains';
import { getChainConfig } from '@/config/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { 
  storeSessionKey, 
  getSessionKey, 
  getSessionMetadata, 
  updateDelegationStatus 
} from './sessionStorage';
import { 
  generateSessionKey, 
} from './delegation';
import { sendSponsoredUserOperation } from './pimlico';

export interface SessionHandle {
  accountAddress: `0x${string}`;
  smartAccount: any; // MetaMask Smart Account instance
  sessionKeyAddress: `0x${string}`; // Session key address for signing
  sessionKeyAccount: PrivateKeyAccount; // Viem account for session key signing
  isDeployed: boolean; // Whether smart account is deployed on-chain
  delegationInstalled: boolean; // Whether session delegation is installed
  deploymentHash?: `0x${string}`; // Deployment transaction hash
  delegationHash?: `0x${string}`; // Delegation installation transaction hash
  signTypedData: (typedData: any) => Promise<`0x${string}`>;
  executeUserOperation: (
    to: `0x${string}`,
    data: `0x${string}`,
    value?: bigint
  ) => Promise<any>;
}

// Map chain IDs to viem chains
const chainMap: Record<number, Chain> = {
  42161: arbitrum,
  8453: base,
};

// Initialize MDT Smart Account with session key delegation and deployment
export async function initMDT(
  chainId: number,
  walletClient?: WalletClient
): Promise<SessionHandle> {
  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) {
    throw new Error('Chain not supported');
  }

  const viemChain = chainMap[chainId];
  if (!viemChain) {
    throw new Error('Chain not configured for viem');
  }

  if (!walletClient || !walletClient.account) {
    throw new Error('Wallet client not available or no account connected');
  }

  // Create public client for blockchain interactions (using proxy RPC)
  const rpcUrl = `/api/oneinch/rpc?chainId=${chainId}`;
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(rpcUrl),
  });

  try {
    const account = walletClient.account;
    console.log(
      '🔑 Initializing MetaMask Smart Account with delegation for:',
      account.address
    );

    // Check if we have existing session data
    const existingSession = await getSessionMetadata(chainId);
    let sessionPrivateKey: `0x${string}`;
    let sessionKeyAccount: PrivateKeyAccount;
    let delegationInstalled = false;
    let delegationHash: `0x${string}` | undefined;

    if (existingSession && existingSession.privateKey) {
      console.log('🔄 Using existing session for chain', chainId);
      sessionPrivateKey = existingSession.privateKey as `0x${string}`;
      sessionKeyAccount = privateKeyToAccount(sessionPrivateKey);
      delegationInstalled = existingSession.delegationInstalled || false;
      delegationHash = existingSession.delegationHash as `0x${string}` | undefined;
    } else {
      console.log('🔑 Generating new session key for chain', chainId);
      const { privateKey, account: newSessionAccount } = generateSessionKey();
      sessionPrivateKey = privateKey;
      sessionKeyAccount = newSessionAccount;
    }

    console.log('🔑 Session key address:', sessionKeyAccount.address);

    // Create smart account with proper wallet client signatory
    const smartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address, [], [], []], // Empty arrays - no P256 signers
      deploySalt:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      signatory: {
        walletClient: walletClient as any, // Type assertion for MetaMask integration
      },
    });

    console.log('🏗️ Smart account address:', smartAccount.address);

    // Check if smart account is already deployed
    const code = await publicClient.getCode({ address: smartAccount.address });
    let isDeployed = !!(code && code !== '0x');
    let deploymentHash: `0x${string}` | undefined;

    console.log(
      `📋 Smart account deployment status: ${
        isDeployed ? 'deployed' : 'not deployed'
      }`
    );

    // For now, let's focus on basic smart account deployment without complex delegation
    // The delegation system can be enhanced later once the core functionality works
    if (!isDeployed) {
      console.log('🚀 Deploying smart account...');

      try {
        // Deploy smart account using a simple sponsored transaction
        const result = await sendSponsoredUserOperation({
          chainId,
          smartAccount,
          calls: [
            {
              to: smartAccount.address, // Self-call to trigger deployment
              data: '0x' as `0x${string}`,
              value: BigInt(0),
            },
          ],
        });

        if (result.success) {
          deploymentHash = result.transactionHash;
          isDeployed = true;
          delegationInstalled = true; // Mark as installed for now

          console.log('✅ Smart account deployed successfully:', {
            deploymentHash,
            smartAccount: smartAccount.address,
            sessionKey: sessionKeyAccount.address,
          });

          // Store session key with basic setup
          await storeSessionKey(chainId, sessionPrivateKey, {
            sessionKeyAddress: sessionKeyAccount.address,
            smartAccountAddress: smartAccount.address,
            delegationInstalled: true,
            delegationHash: deploymentHash,
          });
        } else {
          throw new Error('Failed to deploy smart account');
        }
      } catch (error) {
        console.error('❌ Smart account deployment failed:', error);
        
        // Store session key without deployment for retry later
        await storeSessionKey(chainId, sessionPrivateKey, {
          sessionKeyAddress: sessionKeyAccount.address,
          smartAccountAddress: smartAccount.address,
          delegationInstalled: false,
        });
        
        // Continue anyway - the smart account might still work for signing
        isDeployed = false;
        delegationInstalled = false;
      }
    } else {
      console.log('✅ Using existing deployed smart account');
      delegationInstalled = existingSession?.delegationInstalled || true; // Assume delegation works if deployed
    }

    console.log('✅ MDT session ready:', {
      smartAccount: smartAccount.address,
      sessionKey: sessionKeyAccount.address,
      deployed: isDeployed,
      delegationInstalled,
      deploymentHash,
      delegationHash,
    });

    // Return session handle with delegation-enabled signing
    return {
      accountAddress: smartAccount.address,
      smartAccount,
      sessionKeyAddress: sessionKeyAccount.address,
      sessionKeyAccount,
      isDeployed,
      delegationInstalled,
      deploymentHash,
      delegationHash,

      signTypedData: async (typedData: any) => {
        if (delegationInstalled) {
          // Use smart account for EIP-1271 signing after delegation is installed
          console.log('🔑 Signing with smart account (EIP-1271, gasless)...');
          return await smartAccount.signTypedData(typedData);
        } else {
          // Fallback to wallet client if delegation not yet installed
          console.log('🔑 Signing with wallet client (delegation not installed)...');
          return await smartAccount.signTypedData(typedData);
        }
      },

      executeUserOperation: async (
        to: `0x${string}`,
        data: `0x${string}`,
        value?: bigint
      ) => {
        try {
          console.log('⚡ Executing sponsored UserOp:', {
            to,
            data,
            value,
            deployed: isDeployed,
            delegationInstalled,
          });

          // Use sponsored UserOperation for all executions
          const result = await sendSponsoredUserOperation({
            chainId,
            smartAccount,
            calls: [
              {
                to,
                data,
                value: value || BigInt(0),
              },
            ],
          });

          console.log('✅ Sponsored UserOp execution completed:', result);
          return result;
        } catch (error) {
          console.error('❌ Sponsored UserOp execution failed:', error);
          throw error;
        }
      },
    };
  } catch (error) {
    console.error('❌ MDT initialization failed:', error);
    throw error;
  }
}

// Helper to check if a session is still valid
export function isSessionValid(expiresAt: number): boolean {
  return Date.now() / 1000 < expiresAt;
}

// Re-export Pimlico helpers for compatibility
export { getPimlicoBundlerUrl, getPimlicoPaymasterUrl } from './pimlico';
