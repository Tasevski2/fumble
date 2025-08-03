import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { chainId, tokens } = await req.json();

    // Validate parameters
    if (![42161, 8453].includes(chainId)) {
      return NextResponse.json(
        { error: 'Unsupported chain ID' },
        { status: 400 }
      );
    }

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tokens array' },
        { status: 400 }
      );
    }

    // Validate token addresses
    const invalidTokens = tokens.filter(
      (token) => !/^0x[a-fA-F0-9]{40}$/.test(token)
    );
    if (invalidTokens.length > 0) {
      return NextResponse.json(
        { error: `Invalid token addresses: ${invalidTokens.join(', ')}` },
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

    // Use 1inch Spot Price API batch endpoint for USD prices
    const url = `${baseUrl}price/v1.1/${chainId}`;

    // Prepare batch request payload
    const requestBody = {
      tokens: tokens,
      currency: 'USD',
    };

    console.log(
      `Fetching batch prices for ${tokens.length} tokens on chain ${chainId}`
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `1inch Spot Price API error (${response.status}):`,
        errorText
      );

      // Fallback to individual requests if batch fails
      console.warn(
        'Batch request failed, falling back to individual requests...'
      );
      return await fallbackToIndividualRequests(
        chainId,
        tokens,
        apiKey,
        baseUrl
      );
    }

    const data = await response.json();
    console.log(
      `Successfully fetched batch prices:`,
      Object.keys(data).length,
      'tokens'
    );

    // Transform response to match expected format
    const prices: Record<string, number | null> = {};
    for (const token of tokens) {
      prices[token] = data[token] || null;
    }

    return NextResponse.json({
      chainId,
      prices,
      currency: 'USD',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('1inch batch price error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Fallback function for individual price requests
async function fallbackToIndividualRequests(
  chainId: number,
  tokens: string[],
  apiKey: string,
  baseUrl: string
) {
  console.log('Using fallback individual price requests...');

  const pricePromises = tokens.map(async (token) => {
    try {
      const url = `${baseUrl}price/v1.1/${chainId}`;
      const params = new URLSearchParams({
        tokens: token,
        currencies: 'USD',
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to get price for token ${token}:`,
          response.status
        );
        return { [token]: null };
      }

      const data = await response.json();
      return { [token]: data[token]?.USD || null };
    } catch (error) {
      console.warn(`Error getting price for token ${token}:`, error);
      return { [token]: null };
    }
  });

  const priceResults = await Promise.all(pricePromises);

  // Merge all price results
  const prices = priceResults.reduce((acc, result) => {
    return { ...acc, ...result };
  }, {});

  return NextResponse.json({
    chainId,
    prices,
    currency: 'USD',
    timestamp: Date.now(),
  });
}
