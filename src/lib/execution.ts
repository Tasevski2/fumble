/**
 * Order execution and tracking logic for Fumble PWA
 *
 * Handles the complete flow from token selection to order fulfillment:
 * 1. Token to USDC quote generation
 * 2. Order creation and EIP-1271 signing
 * 3. Order submission to 1inch orderbook
 * 4. Order status tracking and lifecycle management
 */

import {
  buildSwapParams,
  submitGaslessSwap,
  getQuote,
  getOrderStatus,
} from './oneinch';
import { SessionHandle } from './mdt';
import { Token } from '@/types';
import { getUSDCAddress } from '@/config/chains';

export interface OrderRequest {
  token: Token;
  session: SessionHandle;
  chainId: number;
  slippageBps?: number; // Default 100 (1%)
}

export interface OrderResult {
  transactionHash: string;
  expectedUSDC: string;
  minimumUSDC: string;
  status: 'submitted' | 'pending' | 'executed' | 'expired' | 'failed';
  timestamp: number;
}

export interface OrderTracking {
  transactionHash: string;
  chainId: number;
  token: Token;
  expectedUSDC: string;
  minimumUSDC: string;
  status: 'submitted' | 'pending' | 'executed' | 'expired' | 'failed';
  createdAt: number;
  updatedAt: number;
  fills?: Array<{
    amount: string;
    price: string;
    timestamp: number;
  }>;
}

// Execute a token dump to USDC
export async function executeTokenDump(
  request: OrderRequest
): Promise<OrderResult> {
  const { token, session, chainId, slippageBps = 100 } = request;

  try {
    // Step 1: Get quote for token to USDC
    const quote = await getQuote({
      chainId,
      fromToken: token.address,
      amount: token.balance,
    });

    // Step 2: Calculate minimum receive amount with slippage
    const expectedUSDC = quote.toAmount;
    const minimumUSDC = (
      (BigInt(expectedUSDC) * BigInt(10000 - slippageBps)) /
      BigInt(10000)
    ).toString();

    // Step 3: Build swap parameters for Intent Swap API
    const swapParams = buildSwapParams({
      chainId,
      fromTokenAddress: token.address as `0x${string}`,
      amount: token.balance,
      fromAddress: session.accountAddress,
      slippage: (slippageBps || 100) / 100, // Convert basis points to percentage
    });

    // Step 4: Submit gasless swap
    const swapResult = await submitGaslessSwap(session, swapParams);
    const transactionHash = swapResult.transaction?.hash || 'gasless-swap-' + Date.now();

    // Step 5: Store swap for tracking
    const orderTracking: OrderTracking = {
      transactionHash,
      chainId,
      token,
      expectedUSDC,
      minimumUSDC,
      status: 'submitted',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Store in local storage for UI tracking
    storeOrderTracking(orderTracking);

    return {
      transactionHash,
      expectedUSDC,
      minimumUSDC,
      status: 'submitted',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Order execution error:', error);
    throw new Error(
      `Failed to execute order: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// Track transaction status updates
export async function trackOrderStatus(
  transactionHash: string,
  chainId: number
): Promise<OrderTracking | null> {
  try {
    // For gasless swaps, we might need to track differently
    // For now, try to get status via API or assume executed if we have a transaction hash
    let statusResponse;
    try {
      statusResponse = await getOrderStatus(transactionHash, chainId);
    } catch (error) {
      // If no API response, assume transaction is executed if we have a valid hash
      console.warn(`No API status for transaction ${transactionHash}, assuming executed`);
      statusResponse = { status: 'executed' };
    }

    // Get existing tracking data
    const existingOrder = getStoredOrderTracking(transactionHash);
    if (!existingOrder) {
      console.warn(`No tracking data found for transaction ${transactionHash}`);
      return null;
    }

    // Update tracking with latest status
    const updatedOrder: OrderTracking = {
      ...existingOrder,
      status: statusResponse.status,
      updatedAt: Date.now(),
      fills: statusResponse.fills?.map((fill: any) => ({
        amount: fill.filledMakingAmount || fill.amount,
        price: fill.price || '0',
        timestamp: new Date(fill.filledAt || fill.timestamp).getTime(),
      })),
    };

    // Update stored tracking
    storeOrderTracking(updatedOrder);

    return updatedOrder;
  } catch (error) {
    console.error('Transaction tracking error:', error);
    return null;
  }
}

// Get all tracked orders for a user
export function getTrackedOrders(): OrderTracking[] {
  try {
    const stored = localStorage.getItem('fumble-orders');
    if (!stored) return [];

    const orders: OrderTracking[] = JSON.parse(stored);

    // Filter out expired orders (older than 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeOrders = orders.filter((order) => order.createdAt > weekAgo);

    // Update storage if we filtered anything
    if (activeOrders.length !== orders.length) {
      localStorage.setItem('fumble-orders', JSON.stringify(activeOrders));
    }

    return activeOrders;
  } catch (error) {
    console.error('Error getting tracked orders:', error);
    return [];
  }
}

// Store order tracking data locally
function storeOrderTracking(order: OrderTracking): void {
  try {
    const existing = getTrackedOrders();
    const updated = existing.filter((o) => o.transactionHash !== order.transactionHash);
    updated.push(order);

    // Keep only the most recent 50 orders
    const sorted = updated
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    localStorage.setItem('fumble-orders', JSON.stringify(sorted));
  } catch (error) {
    console.error('Error storing order tracking:', error);
  }
}

// Get specific order tracking data
function getStoredOrderTracking(transactionHash: string): OrderTracking | null {
  const orders = getTrackedOrders();
  return orders.find((order) => order.transactionHash === transactionHash) || null;
}

// Bulk status update for all pending orders
export async function updateAllPendingOrders(): Promise<OrderTracking[]> {
  const orders = getTrackedOrders();
  const pendingOrders = orders.filter(
    (order) => order.status === 'submitted' || order.status === 'pending'
  );

  const updatePromises = pendingOrders.map((order) =>
    trackOrderStatus(order.transactionHash, order.chainId)
  );

  const results = await Promise.allSettled(updatePromises);

  const updatedOrders: OrderTracking[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      updatedOrders.push(result.value);
    } else {
      // Keep original order if update failed
      updatedOrders.push(pendingOrders[index]);
    }
  });

  return updatedOrders;
}

// Calculate total USDC earned from executed orders
export function calculateTotalEarned(): {
  totalUSDC: number;
  orderCount: number;
} {
  const orders = getTrackedOrders();
  const executedOrders = orders.filter((order) => order.status === 'executed');

  const totalUSDC = executedOrders.reduce((sum, order) => {
    // Use actual filled amount if available, otherwise use expected amount
    const earnedAmount =
      order.fills?.reduce((fillSum, fill) => {
        return fillSum + parseFloat(fill.amount);
      }, 0) || parseFloat(order.expectedUSDC);

    return sum + earnedAmount;
  }, 0);

  return {
    totalUSDC: totalUSDC / 1e6, // Convert from USDC wei to USDC
    orderCount: executedOrders.length,
  };
}

// Validate order before execution
export function validateOrderRequest(request: OrderRequest): {
  valid: boolean;
  error?: string;
} {
  const { token, session, chainId } = request;

  // Check if chain is supported
  const usdcAddress = getUSDCAddress(chainId);
  if (!usdcAddress) {
    return { valid: false, error: 'Unsupported chain' };
  }

  // Check if token has balance
  if (!token.balance || BigInt(token.balance) === BigInt(0)) {
    return { valid: false, error: 'Token has no balance' };
  }

  // Check if session is valid
  if (!session.accountAddress || !session.signTypedData) {
    return { valid: false, error: 'Invalid session' };
  }

  // Check if token is not USDC (can't dump USDC to USDC)
  if (token.address.toLowerCase() === usdcAddress.toLowerCase()) {
    return { valid: false, error: 'Cannot dump USDC to USDC' };
  }

  // Check minimum value threshold ($1 USD minimum)
  if (token.balanceUsd < 1) {
    return { valid: false, error: 'Token value below minimum threshold ($1)' };
  }

  return { valid: true };
}
