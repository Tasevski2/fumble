import { useAppStore } from '@/state/useAppStore';
import { getQuote, buildSwapParams, submitGaslessSwap } from './oneinch';
import { getChainConfig } from '@/config/chains';
import { validateBatchLiquidity } from './liquidity';
import { logger } from './logger';
import type { SessionHandle } from './mdt';
import type { Token, OrderIntent } from '@/types';

// Execute purge orders for all selected tokens
export async function executePurgeOrders(
  sessionHandles: Record<number, SessionHandle>,
  dumpTokens: Token[],
  addOrder: (order: OrderIntent) => void,
  updateOrder: (orderId: string, updates: Partial<OrderIntent>) => void
): Promise<void> {
  // Pre-validate liquidity for all tokens
  console.log('Validating liquidity for batch execution...');
  const liquidityValidation = await validateBatchLiquidity(
    dumpTokens.map((token) => ({
      chainId: token.chainId,
      address: token.address,
      amount: token.balance,
      symbol: token.symbol,
    }))
  );

  // Log liquidity warnings
  const tokensWithLowLiquidity = liquidityValidation.filter(
    (v) => !v.liquidity.hasLiquidity
  );

  if (tokensWithLowLiquidity.length > 0) {
    console.warn(
      'Tokens with low/no liquidity:',
      tokensWithLowLiquidity.map((t) => t.tokenSymbol)
    );
  }
  // Group tokens by chain
  const tokensByChain = dumpTokens.reduce((acc, token) => {
    if (!acc[token.chainId]) {
      acc[token.chainId] = [];
    }
    acc[token.chainId].push(token);
    return acc;
  }, {} as Record<number, Token[]>);

  // Process each chain
  for (const [chainId, tokens] of Object.entries(tokensByChain)) {
    const chainIdNum = parseInt(chainId);
    const sessionHandle = sessionHandles[chainIdNum];

    if (!sessionHandle) {
      console.error(`No session handle for chain ${chainId}`);
      continue;
    }

    const chainConfig = getChainConfig(chainIdNum);
    if (!chainConfig) {
      console.error(`No chain config for chain ${chainId}`);
      continue;
    }

    // Process each token on this chain
    for (const token of tokens) {
      const orderId = `order_${Date.now()}_${token.id}`;

      // Create initial order intent
      const orderIntent: OrderIntent = {
        id: orderId,
        chainId: chainIdNum,
        tokenAddress: token.address,
        tokenSymbol: token.symbol,
        tokenAmount: token.balance,
        estimatedUSDC: token.balanceUsd.toFixed(2),
        status: 'pending',
        timestamp: Date.now(),
      };

      addOrder(orderIntent);
      logger.orderCreated(orderId, token.symbol, chainIdNum);

      // Check if this token had liquidity issues
      const liquidityCheck = liquidityValidation.find(
        (v) => v.tokenSymbol === token.symbol
      );

      if (liquidityCheck && !liquidityCheck.liquidity.hasLiquidity) {
        console.warn(
          `Low liquidity for ${token.symbol}, proceeding with caution...`
        );
      }

      // Retry logic with exponential backoff
      let retryCount = 0;
      const maxRetries = 3;
      let lastError: Error | null = null;

      while (retryCount <= maxRetries) {
        try {
          // Update status to signing
          updateOrder(orderId, { status: 'signing' });

          // Get quote from 1inch
          const quote = await getQuote({
            chainId: chainIdNum,
            fromToken: token.address,
            amount: token.balance,
          });

          // Build swap parameters for Intent Swap API
          const swapParams = buildSwapParams({
            chainId: chainIdNum,
            fromTokenAddress: token.address as `0x${string}`,
            amount: token.balance,
            fromAddress: sessionHandle.accountAddress,
            slippage: 1, // 1% slippage
          });

          // Submit gasless swap
          updateOrder(orderId, { status: 'submitted' });
          console.log('submitGaslessSwap', sessionHandle, swapParams);
          
          const swapResult = await submitGaslessSwap(sessionHandle, swapParams);

          // Swap successfully submitted
          updateOrder(orderId, {
            status: 'executed',
            orderHash: swapResult.transaction?.hash || 'gasless-swap-' + Date.now(),
            estimatedUSDC: swapResult.toAmount ? (parseFloat(swapResult.toAmount) / 1e6).toFixed(2) : (parseFloat(quote.toAmountMin || '0') / 1e6).toFixed(2),
          });

          logger.orderStatusChanged(orderId, 'submitted', 'executed');
          logger.info('Gasless swap execution successful', {
            orderId,
            tokenSymbol: token.symbol,
            chainId: chainIdNum,
            transactionHash: swapResult.transaction?.hash,
            estimatedUSDC: swapResult.toAmount ? (parseFloat(swapResult.toAmount) / 1e6).toFixed(2) : (parseFloat(quote.toAmountMin || '0') / 1e6).toFixed(2),
          });

          // Success - break retry loop
          break;
        } catch (error) {
          console.log(error);
          lastError =
            error instanceof Error ? error : new Error('Unknown error');
          retryCount++;

          console.error(
            `Attempt ${retryCount} failed for ${token.symbol}:`,
            lastError.message
          );

          if (retryCount <= maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, retryCount - 1) * 1000;
            console.log(`Retrying ${token.symbol} in ${delay}ms...`);

            updateOrder(orderId, {
              status: 'pending',
              error: `Retry ${retryCount}/${maxRetries}: ${lastError.message}`,
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            // All retries exhausted
            console.error(`All retries exhausted for ${token.symbol}`);
            updateOrder(orderId, {
              status: 'failed',
              error: `Failed after ${maxRetries} retries: ${lastError.message}`,
            });

            logger.orderExecutionFailed(orderId, lastError, maxRetries);
            logger.orderStatusChanged(orderId, 'pending', 'failed');
          }
        }
      }
    }
  }
}

// Hook to execute purge orders
export function useOrderExecutor() {
  const { dumpTokens, addOrder, updateOrder } = useAppStore();

  const executePurge = async (
    sessionHandles: Record<number, SessionHandle>
  ) => {
    await executePurgeOrders(sessionHandles, dumpTokens, addOrder, updateOrder);
  };

  return { executePurge };
}
