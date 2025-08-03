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

    // Get the appropriate paymaster endpoint based on chain
    const paymasterUrl = chainId === 42161
      ? process.env.PIMLICO_PAYMASTER_RPC_ARBITRUM
      : process.env.PIMLICO_PAYMASTER_RPC_BASE;

    if (!paymasterUrl) {
      return NextResponse.json(
        { error: 'Paymaster endpoint not configured' },
        { status: 500 }
      );
    }

    const policyId = process.env.PIMLICO_POLICY_ID;
    if (!policyId) {
      return NextResponse.json(
        { error: 'Pimlico policy ID not configured' },
        { status: 500 }
      );
    }

    // Call Pimlico paymaster to sponsor the UserOp
    const body = {
      method: 'pm_sponsorUserOperation',
      params: [
        userOp,
        {
          policyId,
          // Optional: add additional sponsorship context
          metadata: {
            source: 'fumble-pwa',
            timestamp: Date.now(),
          },
        },
      ],
      id: 1,
      jsonrpc: '2.0',
    };

    const response = await fetch(paymasterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Pimlico sponsorship error:', data.error);
      return NextResponse.json(
        { 
          error: data.error.message || 'Sponsorship failed',
          code: data.error.code,
        },
        { status: 400 }
      );
    }

    if (!data.result) {
      return NextResponse.json(
        { error: 'Invalid response from paymaster' },
        { status: 500 }
      );
    }

    // Return the paymaster data to be included in the UserOp
    return NextResponse.json({
      paymasterAndData: data.result.paymasterAndData,
      // Optional: include gas estimates if provided
      ...(data.result.callGasLimit && { callGasLimit: data.result.callGasLimit }),
      ...(data.result.verificationGasLimit && { verificationGasLimit: data.result.verificationGasLimit }),
      ...(data.result.preVerificationGas && { preVerificationGas: data.result.preVerificationGas }),
    });

  } catch (error) {
    console.error('Sponsorship API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}