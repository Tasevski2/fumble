import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainId = parseInt(searchParams.get('chainId') || '0');
    const address = searchParams.get('address');

    // Validate parameters
    if (![42161, 8453].includes(chainId)) {
      return NextResponse.json(
        { error: 'Unsupported chain ID' },
        { status: 400 }
      );
    }

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ONEINCH_API_KEY;
    const baseUrl = process.env.ONEINCH_BASE_URL;

    if (!apiKey || !baseUrl) {
      return NextResponse.json(
        { error: '1inch API not configured' },
        { status: 500 }
      );
    }

    // Call 1inch Balance API
    const url = `${baseUrl}balance/v1.2/${chainId}/balances/${address}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      return NextResponse.json(
        { error: error.description || error.error || 'Failed to get balances' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Filter out zero balances and format response
    const balances = Object.entries(data)
      .filter(([_, balance]) => balance && balance !== '0')
      .reduce((acc, [tokenAddress, balance]) => {
        acc[tokenAddress] = balance as string;
        return acc;
      }, {} as Record<string, string>);

    return NextResponse.json({
      address,
      chainId,
      balances,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('1inch balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}