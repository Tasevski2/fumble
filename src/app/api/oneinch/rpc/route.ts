// app/api/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const URLS: Record<number, string> = {
  42161: 'https://api.1inch.dev/web3/rpc/v1/arbitrum',
  8453: 'https://api.1inch.dev/web3/rpc/v1/base',
};

export async function POST(req: NextRequest) {
  const chainIdStr = req.nextUrl.searchParams.get('chainId');
  const chainId = Number(chainIdStr);
  const upstream = URLS[chainId];

  if (!upstream) {
    return NextResponse.json({ error: 'Unsupported chainId' }, { status: 400 });
  }

  const body = await req.text(); // raw JSON-RPC body from viem
  const resp = await fetch(`https://api.1inch.dev/web3/${chainId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${process.env.ONEINCH_API_KEY!}`,
    },
    body,
  });

  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: { 'content-type': 'application/json' },
  });
}
