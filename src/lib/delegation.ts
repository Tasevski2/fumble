// Note: Delegation imports commented out due to API compatibility issues
// Will be re-enabled once the correct API is determined
// import {
//   createDelegation,
//   createExecution,
// } from '@metamask/delegation-toolkit';
import { getOneInchVerifyingContract } from '@/config/chains';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { zeroAddress } from 'viem';
import type { PrivateKeyAccount } from 'viem';

// Generate a new session key pair
export function generateSessionKey(): {
  privateKey: `0x${string}`;
  account: PrivateKeyAccount;
} {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  return {
    privateKey,
    account,
  };
}

// Build session delegation with time bounds and allowed targets
export function buildSessionDelegation({
  chainId,
  smartAccountAddress,
  sessionKeyAddress,
  expiryDays = 7,
}: {
  chainId: number;
  smartAccountAddress: `0x${string}`;
  sessionKeyAddress: `0x${string}`;
  expiryDays?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expires = now + expiryDays * 24 * 60 * 60; // Default 7 days
  
  // Get 1inch verifying contract for this chain
  const verifyingContract = getOneInchVerifyingContract(chainId);
  if (!verifyingContract || verifyingContract === zeroAddress) {
    throw new Error(`Missing 1inch verifying contract for chain ${chainId}`);
  }

  console.log('🔑 Building session delegation:', {
    chainId,
    smartAccount: smartAccountAddress,
    sessionKey: sessionKeyAddress,
    verifyingContract,
    expires: new Date(expires * 1000).toISOString(),
  });

  // For now, return a simplified delegation object
  // This will be properly implemented once we have the correct MDT API
  const delegation = {
    from: smartAccountAddress,
    to: sessionKeyAddress,
    verifyingContract,
    expires,
    type: 'session-delegation',
  };

  console.log('✅ Session delegation placeholder created:', delegation);

  return delegation;
}

// Sign delegation with smart account and encode redeem calldata
export async function signAndEncodeRedeem({
  smartAccount,
  delegation,
}: {
  smartAccount: any; // MetaMaskSmartAccount from toolkit
  delegation: any;
}) {
  console.log('🔑 Signing delegation with smart account...');
  
  try {
    console.log('🔑 Preparing delegation signing (simplified implementation)...');
    
    // For now, return a placeholder implementation
    // This will be properly implemented once we have the correct MDT API
    const signedDelegation = {
      ...delegation,
      signature: '0x' + '0'.repeat(128), // Placeholder signature
      signedAt: Math.floor(Date.now() / 1000),
    };
    
    console.log('✅ Delegation prepared:', signedDelegation);

    return {
      signedDelegation,
      calldata: '0x' as `0x${string}`, // Placeholder calldata
      target: zeroAddress, // Placeholder target
    };
  } catch (error) {
    console.error('❌ Failed to prepare delegation:', error);
    throw error;
  }
}

// Validate delegation is properly configured
export function validateDelegation(delegation: any): boolean {
  try {
    // Basic validation checks
    if (!delegation.from || !delegation.to) {
      console.error('❌ Delegation missing from/to addresses');
      return false;
    }

    if (!delegation.caveats || delegation.caveats.length === 0) {
      console.error('❌ Delegation missing caveats');
      return false;
    }

    // Check for timestamp caveat
    const timestampCaveat = delegation.caveats.find((c: any) => c.enforcer === 'timestamp');
    if (!timestampCaveat) {
      console.error('❌ Delegation missing timestamp caveat');
      return false;
    }

    // Check for allowed targets caveat
    const allowedTargetsCaveat = delegation.caveats.find((c: any) => c.enforcer === 'allowedTargets');
    if (!allowedTargetsCaveat) {
      console.error('❌ Delegation missing allowedTargets caveat');
      return false;
    }

    console.log('✅ Delegation validation passed');
    return true;
  } catch (error) {
    console.error('❌ Delegation validation error:', error);
    return false;
  }
}