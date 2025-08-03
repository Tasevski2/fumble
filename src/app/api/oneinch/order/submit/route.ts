import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import axios from 'axios';

// Schema for 1inch v6.0 Swap API (Intent-based gasless swaps)
const swapRequestSchema = z.object({
  chainId: z.number(),
  fromTokenAddress: z.string(), // Source token address
  toTokenAddress: z.string(),   // Destination token address (USDC for Fumble)
  amount: z.string(),           // Amount to swap in smallest units
  fromAddress: z.string(),      // Smart account address
  slippage: z.number().optional().default(1), // Slippage percentage (default 1%)
  disableEstimate: z.boolean().optional().default(true), // Disable gas estimation for gasless
  allowPartialFill: z.boolean().optional().default(false), // Don't allow partial fills
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Received swap request:', {
      chainId: body.chainId,
      fromTokenAddress: body.fromTokenAddress,
      toTokenAddress: body.toTokenAddress,
      amount: body.amount,
      fromAddress: body.fromAddress,
    });

    const { 
      chainId, 
      fromTokenAddress, 
      toTokenAddress, 
      amount, 
      fromAddress, 
      slippage,
      disableEstimate,
      allowPartialFill 
    } = swapRequestSchema.parse(body);

    // Build query parameters for 1inch v6.0 Swap API
    const params = new URLSearchParams({
      fromTokenAddress,
      toTokenAddress,
      amount,
      fromAddress,
      slippage: slippage.toString(),
      disableEstimate: disableEstimate.toString(),
      allowPartialFill: allowPartialFill.toString(),
    });

    // Use 1inch v6.0 Swap API (Intent-based gasless swaps)
    const swapUrl = `https://api.1inch.dev/swap/v6.0/${chainId}/swap?${params.toString()}`;
    
    console.log('🔄 Calling 1inch Swap API:', swapUrl);

    const response = await axios.get(swapUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    // Log for telemetry
    console.log('✅ Swap response received:', {
      chainId,
      fromTokenAddress,
      toTokenAddress,
      fromAddress,
      txHash: response.data.tx?.hash,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      transaction: response.data.tx,
      toAmount: response.data.toAmount,
      status: 'success',
    });
  } catch (error) {
    console.error('Swap request error:', error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Validation errors:', error.errors);
      return NextResponse.json(
        { 
          error: 'Invalid swap parameters', 
          details: error.errors,
          received: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    if (axios.isAxiosError(error) && error.response) {
      console.error('❌ 1inch Swap API error:', error.response.data);
      return NextResponse.json(
        { 
          error: error.response.data.description || error.response.data.error || 'Swap request failed',
          details: error.response.data,
        },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process swap', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}