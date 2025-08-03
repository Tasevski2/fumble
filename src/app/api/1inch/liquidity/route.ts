import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { chainId, tokenAddress, targetAddress, amount } = await request.json();

    if (!chainId || !tokenAddress || !targetAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Use 1inch Limit Order Protocol API to check available liquidity
    const oneInchApiUrl = `https://api.1inch.dev/orderbook/v4.0/${chainId}/orderbook`;
    
    const response = await fetch(oneInchApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('1inch API error:', response.status, response.statusText);
      return NextResponse.json(
        { 
          hasLiquidity: false,
          error: '1inch API unavailable',
        },
        { status: 200 } // Return 200 with error info instead of failing
      );
    }

    const orderbook = await response.json();
    
    // Analyze orderbook for available liquidity
    // This is a simplified check - in production you'd analyze bid/ask spreads
    const hasOrders = orderbook?.orders && orderbook.orders.length > 0;
    
    // Look for relevant orders
    let hasLiquidity = false;
    let availableAmount = '0';
    
    if (hasOrders) {
      const relevantOrders = orderbook.orders.filter((order: any) => 
        order.makerAsset?.toLowerCase() === tokenAddress.toLowerCase() ||
        order.takerAsset?.toLowerCase() === tokenAddress.toLowerCase()
      );
      
      hasLiquidity = relevantOrders.length > 0;
      
      if (hasLiquidity) {
        // Calculate available liquidity (simplified)
        const totalLiquidity = relevantOrders.reduce((sum: number, order: any) => {
          return sum + parseFloat(order.makerAmount || '0');
        }, 0);
        
        availableAmount = totalLiquidity.toString();
      }
    }

    return NextResponse.json({
      hasLiquidity,
      availableAmount,
      minimumAmount: '1000000', // 1 USDC minimum
    });

  } catch (error) {
    console.error('Liquidity check error:', error);
    return NextResponse.json(
      { 
        hasLiquidity: false,
        error: 'Failed to check liquidity',
      },
      { status: 200 } // Return success with error info for graceful handling
    );
  }
}