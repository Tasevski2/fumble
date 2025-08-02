import { Token, OrderIntent } from '@/types';

export type OrderStatus = 'pending' | 'signing' | 'submitted' | 'executed' | 'failed' | 'expired' | 'none';

export interface TokenOrderStatus {
  status: OrderStatus;
  order?: OrderIntent;
  hasMultipleOrders: boolean;
}

/**
 * Find the most recent order for a given token
 */
export function getTokenOrderStatus(
  token: Token, 
  orders: OrderIntent[]
): TokenOrderStatus {
  // Find all orders for this token (match by address and chainId)
  const tokenOrders = orders.filter(order => 
    order.tokenAddress.toLowerCase() === token.address.toLowerCase() &&
    order.chainId === token.chainId
  );

  if (tokenOrders.length === 0) {
    return {
      status: 'none',
      hasMultipleOrders: false,
    };
  }

  // Sort by timestamp to get most recent
  const sortedOrders = tokenOrders.sort((a, b) => b.timestamp - a.timestamp);
  const mostRecentOrder = sortedOrders[0];

  return {
    status: mostRecentOrder.status,
    order: mostRecentOrder,
    hasMultipleOrders: tokenOrders.length > 1,
  };
}

/**
 * Get display info for order status
 */
export function getOrderStatusDisplay(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50 border-orange-200',
        icon: '🟡',
      };
    case 'signing':
      return {
        label: 'Signing',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50 border-blue-200',
        icon: '🔵',
      };
    case 'submitted':
      return {
        label: 'Submitted',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50 border-blue-200',
        icon: '🔵',
      };
    case 'executed':
      return {
        label: 'Completed',
        color: 'text-green-700',
        bgColor: 'bg-green-50 border-green-200',
        icon: '✅',
      };
    case 'failed':
      return {
        label: 'Failed',
        color: 'text-red-700',
        bgColor: 'bg-red-50 border-red-200',
        icon: '❌',
      };
    case 'expired':
      return {
        label: 'Expired',
        color: 'text-gray-700',
        bgColor: 'bg-gray-50 border-gray-200',
        icon: '⚫',
      };
    case 'none':
    default:
      return null;
  }
}

/**
 * Check if an order is in a final state (completed, failed, or expired)
 */
export function isOrderFinal(status: OrderStatus): boolean {
  return ['executed', 'failed', 'expired'].includes(status);
}

/**
 * Check if an order is in progress
 */
export function isOrderInProgress(status: OrderStatus): boolean {
  return ['pending', 'signing', 'submitted'].includes(status);
}