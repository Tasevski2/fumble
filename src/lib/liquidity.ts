import { USDC_BY_CHAIN } from '@/config/chains';

export interface LiquidityCheck {
  hasLiquidity: boolean;
  availableAmount?: string;
  minimumAmount?: string;
  error?: string;
}

/**
 * Check if there's sufficient liquidity for a token swap
 */
export async function checkOrderbookLiquidity(
  chainId: number,
  tokenAddress: string,
  amount: string
): Promise<LiquidityCheck> {
  try {
    const usdcAddress = USDC_BY_CHAIN[chainId];
    if (!usdcAddress) {
      return {
        hasLiquidity: false,
        error: `USDC not supported on chain ${chainId}`,
      };
    }

    // Call 1inch API to check available liquidity
    const response = await fetch(`/api/1inch/liquidity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chainId,
        tokenAddress,
        targetAddress: usdcAddress,
        amount,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        hasLiquidity: false,
        error: errorData?.error || 'Failed to check liquidity',
      };
    }

    const data = await response.json();
    
    return {
      hasLiquidity: data.hasLiquidity,
      availableAmount: data.availableAmount,
      minimumAmount: data.minimumAmount,
      error: data.error,
    };
  } catch (error) {
    console.error('Liquidity check failed:', error);
    return {
      hasLiquidity: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Validate multiple tokens for liquidity before batch execution
 */
export async function validateBatchLiquidity(
  tokens: Array<{ chainId: number; address: string; amount: string; symbol: string }>
): Promise<Array<{ tokenSymbol: string; liquidity: LiquidityCheck }>> {
  const checks = await Promise.allSettled(
    tokens.map(async (token) => ({
      tokenSymbol: token.symbol,
      liquidity: await checkOrderbookLiquidity(token.chainId, token.address, token.amount),
    }))
  );

  return checks.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        tokenSymbol: tokens[index].symbol,
        liquidity: {
          hasLiquidity: false,
          error: 'Validation failed',
        },
      };
    }
  });
}