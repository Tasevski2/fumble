import { getChainConfig, getUSDCAddress } from '@/config/chains';
import type { SessionHandle } from './mdt';
import axios from 'axios';

// Build 1inch swap parameters for Intent-based gasless swaps
export function buildSwapParams({
  chainId,
  fromTokenAddress,
  amount,
  fromAddress,
  slippage = 1,
}: {
  chainId: number;
  fromTokenAddress: `0x${string}`;
  amount: string;
  fromAddress: `0x${string}`;
  slippage?: number;
}) {
  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) {
    throw new Error('Chain not supported');
  }

  // For Fumble, we always swap to USDC
  const toTokenAddress = getUSDCAddress(chainId);
  if (!toTokenAddress) {
    throw new Error('USDC address not found for chain');
  }

  // Build swap parameters for 1inch v6.0 Intent Swap API
  const swapParams = {
    chainId,
    fromTokenAddress,
    toTokenAddress, // Always USDC for Fumble
    amount,
    fromAddress, // Smart account address
    slippage,
    disableEstimate: true, // For gasless swaps
    allowPartialFill: false, // Don't allow partial fills
  };

  console.log('🔄 Swap parameters prepared:', swapParams);
  return swapParams;
}

// Submit gasless swap through 1inch Intent Swap API
export async function submitGaslessSwap(
  session: SessionHandle,
  swapParams: {
    chainId: number;
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    fromAddress: string;
    slippage?: number;
  }
) {
  try {
    console.log('🚀 Submitting gasless swap:', swapParams);

    // Submit through our backend proxy to 1inch Intent Swap API
    const response = await fetch('/api/oneinch/order/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(swapParams),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Swap submission failed');
    }

    const result = await response.json();
    console.log('✅ Gasless swap submitted:', result);

    return {
      transaction: result.transaction,
      toAmount: result.toAmount,
      status: result.status,
    };
  } catch (error) {
    console.error('Gasless swap submission error:', error);
    throw error;
  }
}

// Get quote for token swap to USDC
export async function getQuote({
  chainId,
  fromToken,
  amount,
}: {
  chainId: number;
  fromToken: string;
  amount: string;
}) {
  try {
    const toToken = getUSDCAddress(chainId);
    if (!toToken) {
      throw new Error('USDC address not found for chain');
    }

    const response = await fetch('/api/oneinch/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId,
        fromToken,
        toToken, // Always USDC for Fumble
        amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Quote failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Quote error:', error);
    throw error;
  }
}

// Get order status
export async function getOrderStatus(orderHash: string, chainId: number) {
  try {
    const response = await fetch(`/api/orders/${orderHash}?chainId=${chainId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get order status');
    }

    return await response.json();
  } catch (error) {
    console.error('Order status error:', error);
    throw error;
  }
}

// Helper to format token amount for display
export function formatTokenAmount(amount: string, decimals: number): string {
  // Use Math.pow instead of BigInt exponentiation for compatibility
  const divisor = Math.pow(10, decimals);
  const amountNum = Number(amount);
  const wholePart = Math.floor(amountNum / divisor);
  const fractionalPart = amountNum % divisor;

  if (fractionalPart === 0) {
    return wholePart.toString();
  }

  const fractionalStr = (fractionalPart / divisor).toFixed(decimals).slice(2);
  const trimmedFractional = fractionalStr.slice(0, 6).replace(/0+$/, '');

  if (trimmedFractional) {
    return `${wholePart}.${trimmedFractional}`;
  }

  return wholePart.toString();
}
