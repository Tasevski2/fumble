import { NextRequest, NextResponse } from 'next/server';

// Track revoked sessions (replace with KV/database)
const revokedSessions = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId required' },
        { status: 400 }
      );
    }

    // Mark session as revoked
    revokedSessions.add(sessionId);

    // TODO: If using a real database, also mark the session metadata as revoked
    // and potentially send revocation notification to the blockchain if needed

    return NextResponse.json({ 
      success: true,
      revokedAt: Math.floor(Date.now() / 1000),
    });

  } catch (error) {
    console.error('Session revocation error:', error);
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

    const isRevoked = revokedSessions.has(sessionId);
    
    return NextResponse.json({ 
      isRevoked,
      sessionId,
    });

  } catch (error) {
    console.error('Session revocation check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}