import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { chainId, userOp } = await req.json();

    // Validate chain ID
    if (![42161, 8453].includes(chainId)) {
      return NextResponse.json(
        { error: 'Unsupported chain ID' },
        { status: 400 }
      );
    }

    // Get the appropriate bundler endpoint based on chain
    const bundlerUrl =
      chainId === 42161
        ? process.env.PIMLICO_BUNDLER_RPC_ARBITRUM
        : process.env.PIMLICO_BUNDLER_RPC_BASE;

    if (!bundlerUrl) {
      return NextResponse.json(
        { error: 'Bundler endpoint not configured' },
        { status: 500 }
      );
    }

    // Submit UserOp to Pimlico bundler
    const body = {
      method: 'eth_sendUserOperation',
      params: [
        userOp,
        process.env.ENTRY_POINT_ADDRESS ||
          '0x0000000071727De22E5E9d8BAf0edAc6f37da032', // EntryPoint v0.7
      ],
      id: 1,
      jsonrpc: '2.0',
    };

    const response = await fetch(bundlerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Bundler submission error:', data.error);
      return NextResponse.json(
        {
          error: data.error.message || 'UserOp submission failed',
          code: data.error.code,
        },
        { status: 400 }
      );
    }

    if (!data.result) {
      return NextResponse.json(
        { error: 'Invalid response from bundler' },
        { status: 500 }
      );
    }

    // Return the UserOp hash for tracking
    return NextResponse.json({
      userOpHash: data.result,
      status: 'submitted',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Bundler API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check UserOp status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userOpHash = searchParams.get('userOpHash');
    const chainId = parseInt(searchParams.get('chainId') || '0');

    if (!userOpHash) {
      return NextResponse.json(
        { error: 'userOpHash parameter required' },
        { status: 400 }
      );
    }

    if (![42161, 8453].includes(chainId)) {
      return NextResponse.json(
        { error: 'Unsupported chain ID' },
        { status: 400 }
      );
    }

    // Get the appropriate bundler endpoint based on chain
    const bundlerUrl =
      chainId === 42161
        ? process.env.PIMLICO_BUNDLER_RPC_ARBITRUM
        : process.env.PIMLICO_BUNDLER_RPC_BASE;

    if (!bundlerUrl) {
      return NextResponse.json(
        { error: 'Bundler endpoint not configured' },
        { status: 500 }
      );
    }

    // Check UserOp receipt
    const body = {
      method: 'eth_getUserOperationReceipt',
      params: [userOpHash],
      id: 1,
      jsonrpc: '2.0',
    };

    const response = await fetch(bundlerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      // UserOp might still be pending
      return NextResponse.json({
        status: 'pending',
        userOpHash,
      });
    }

    if (!data.result) {
      return NextResponse.json({
        status: 'pending',
        userOpHash,
      });
    }

    const receipt = data.result;

    return NextResponse.json({
      status: receipt.success ? 'success' : 'failed',
      userOpHash,
      receipt,
      transactionHash: receipt.receipt?.transactionHash,
      blockNumber: receipt.receipt?.blockNumber,
      gasUsed: receipt.receipt?.gasUsed,
    });
  } catch (error) {
    console.error('UserOp status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
