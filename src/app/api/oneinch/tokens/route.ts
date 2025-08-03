import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';

const tokensRequestSchema = z.object({
  chainId: z.number(),
  addresses: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, addresses } = tokensRequestSchema.parse(body);

    // Get all tokens for this chain from 1inch
    const response = await axios.get(
      `https://api.1inch.dev/token/v1.2/${chainId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
        },
      }
    );

    const allTokens = response.data;
    const relevantTokens: any[] = [];

    // Filter to only the addresses we care about
    for (const address of addresses) {
      const tokenAddress = address.toLowerCase();
      const tokenData = allTokens[tokenAddress];
      
      if (tokenData) {
        relevantTokens.push({
          address: tokenAddress,
          symbol: tokenData.symbol,
          name: tokenData.name,
          decimals: tokenData.decimals,
          logoUrl: tokenData.logoURI,
          tags: tokenData.tags || [],
        });
      }
    }

    return NextResponse.json({ tokens: relevantTokens });
  } catch (error) {
    console.error('Tokens fetch error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        { error: error.response.data.description || 'Failed to fetch tokens' },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch token data' },
      { status: 500 }
    );
  }
}