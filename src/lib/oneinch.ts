import { 
  LimitOrder,
  buildOrderTypedData as buildTypedData,
  getLimitOrderContract,
  Address,
  Uint256,
} from '@1inch/limit-order-sdk';
import { getChainConfig, getUSDCAddress } from '@/config/chains';
import type { SessionHandle } from './mdt';
import axios from 'axios';

// Build 1inch limit order typed data
export function buildOrderTypedData({
  chainId,
  maker,
  makerAsset,
  makerAmount,
  takerAmountMin,
}: {
  chainId: number;
  maker: `0x${string}`;
  makerAsset: `0x${string}`;
  makerAmount: string;
  takerAmountMin: string;
}) {
  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) {
    throw new Error('Chain not supported');
  }

  const contractAddress = chainConfig.oneInch.verifyingContract ?? "0x7F069df72b7A39bCE9806e3AfaF579E54D8CF2b9";
  const takerAsset = getUSDCAddress(chainId);
  
  if (!takerAsset) {
    throw new Error('USDC address not found for chain');
  }

  // Create limit order using the new SDK structure - targeting USDC as taker asset
  const order = new LimitOrder({
    makerAsset: new Address(makerAsset),
    takerAsset: new Address(takerAsset), // Always USDC for Fumble
    makingAmount: BigInt(makerAmount),
    takingAmount: BigInt(takerAmountMin), // Minimum USDC to receive
    maker: new Address(maker), // Smart account address
    receiver: new Address('0x0000000000000000000000000000000000000000'), // No specific receiver
  });

  // Build typed data for EIP-1271 signing
  const typedData = order.getTypedData(chainId);

  return { order, typedData };
}

// Sign and submit order through our backend with EIP-1271 signature
export async function signAndSubmitOrder(
  session: SessionHandle,
  typedData: any,
  order: any,
  chainId: number
) {
  try {
    // Sign with MDT smart account (EIP-1271 signature for contract wallets)
    // This creates a signature that can be verified on-chain by the smart account
    const signature = await session.signTypedData(typedData);

    // Submit through our backend proxy to 1inch orderbook
    const response = await fetch('/api/oneinch/order/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chainId,
        order,
        signature, // EIP-1271 signature from smart account
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Order submission failed');
    }

    const result = await response.json();
    return result.orderHash;
  } catch (error) {
    console.error('Order submission error:', error);
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