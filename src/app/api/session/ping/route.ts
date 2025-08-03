import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory tracking for session usage (replace with KV/database)
const sessionUsage = new Map<string, { lastUsedAt: number; usageCount: number }>();

export async function POST(req: NextRequest) {
  try {
    const { sessionId, timestamp } = await req.json();

    if (!sessionId || !timestamp) {
      return NextResponse.json(
        { error: 'sessionId and timestamp required' },
        { status: 400 }
      );
    }

    // Update session usage tracking
    const current = sessionUsage.get(sessionId) || { lastUsedAt: 0, usageCount: 0 };
    sessionUsage.set(sessionId, {
      lastUsedAt: timestamp,
      usageCount: current.usageCount + 1,
    });

    return NextResponse.json({ 
      success: true,
      lastUsedAt: timestamp,
      usageCount: current.usageCount + 1,
    });

  } catch (error) {
    console.error('Session ping error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter required' },
        { status: 400 }
      );
    }

    const usage = sessionUsage.get(sessionId);
    if (!usage) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(usage);

  } catch (error) {
    console.error('Session usage retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}