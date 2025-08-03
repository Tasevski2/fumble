import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import axios from 'axios';

const orderSubmitSchema = z.object({
  chainId: z.number(),
  order: z.object({
    salt: z.string(),
    maker: z.string(),
    receiver: z.string(),
    makerAsset: z.string(),
    takerAsset: z.string(),
    makingAmount: z.string(),
    takingAmount: z.string(),
    offsets: z.string(),
    interactions: z.string(),
  }),
  signature: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, order, signature } = orderSubmitSchema.parse(body);

    // Submit to 1inch Limit Order API (using orderbook key for submissions)
    const response = await axios.post(
      `https://limit-orders.1inch.io/v4.0/${chainId}/order`,
      {
        order,
        signature,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_ORDERBOOK_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Log for telemetry
    console.log('Order submitted:', {
      chainId,
      orderHash: response.data.orderHash,
      maker: order.maker,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      orderHash: response.data.orderHash,
      status: 'submitted',
    });
  } catch (error) {
    console.error('Order submit error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid order data', details: error.errors },
        { status: 400 }
      );
    }

    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        { error: error.response.data.description || 'Order submission failed' },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit order' },
      { status: 500 }
    );
  }
}