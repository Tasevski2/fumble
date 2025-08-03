import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface RouteParams {
  params: Promise<{
    orderHash: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderHash } = await params;
    
    // Extract chainId from query params
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');
    
    if (!chainId) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      );
    }

    // Get order status from 1inch Limit Orders API
    const response = await axios.get(
      `https://limit-orders.1inch.io/v4.0/${chainId}/order/${orderHash}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_ORDERBOOK_KEY}`,
        },
      }
    );

    const orderData = response.data;
    
    // Map 1inch status to our status
    let status: string = 'pending';
    if (orderData.fills && orderData.fills.length > 0) {
      status = 'executed';
    } else if (orderData.cancelled) {
      status = 'expired';
    }

    return NextResponse.json({
      orderHash,
      status,
      fills: orderData.fills || [],
      remainingAmount: orderData.remainingMakingAmount,
      createdAt: orderData.createDateTime,
    });
  } catch (error) {
    console.error('Order status error:', error);

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
  }
}