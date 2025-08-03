import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getChainConfig } from '@/config/chains';

// Request validation schema
const sessionRequestSchema = z.object({
  chainId: z.number(),
  eoa: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, eoa } = sessionRequestSchema.parse(body);

    // Validate chain is supported
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json(
        { error: 'Unsupported chain' },
        { status: 400 }
      );
    }

    // TODO: This will be implemented when we integrate MDT
    // For now, return a mock response
    const mockSessionData = {
      sessionId: `session_${chainId}_${Date.now()}`,
      account: `0x${Array(40).fill('0').join('')}`, // Mock smart account address
      chainId,
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    };

    return NextResponse.json(mockSessionData);
  } catch (error) {
    console.error('Session initialization error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initialize session' },
      { status: 500 }
    );
  }
}