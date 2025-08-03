import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import axios from 'axios';
import { getChainConfig } from '@/config/chains';

const quoteRequestSchema = z.object({
  chainId: z.number(),
  fromToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  toToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(),
});

const SLIPPAGE_BPS = 100; // 1% slippage

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, fromToken, toToken, amount } = quoteRequestSchema.parse(body);

    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json(
        { error: 'Unsupported chain' },
        { status: 400 }
      );
    }

    // Call 1inch quote API
    const response = await axios.get(
      `https://api.1inch.dev/swap/v6.0/${chainId}/quote`,
      {
        params: {
          src: fromToken,
          dst: toToken,
          amount,
          includeTokensInfo: true,
        },
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
        },
      }
    );

    const { dstAmount } = response.data;
    
    // Apply slippage to get minimum receive amount
    const minReceiveAmount = BigInt(dstAmount) * BigInt(10000 - SLIPPAGE_BPS) / BigInt(10000);

    return NextResponse.json({
      toAmount: dstAmount,
      toAmountMin: minReceiveAmount.toString(),
      estimatedGas: response.data.gas || '0',
      protocolAddress: chainConfig.oneInch.verifyingContract,
      expiresAt: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    });
  } catch (error) {
    console.error('Quote error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        { error: error.response.data.description || 'Quote failed' },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}