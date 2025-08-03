import { NextRequest, NextResponse } from 'next/server';
import type { SessionMetadata } from '@/lib/session';

// In-memory storage for MVP (replace with Vercel KV or database)
const sessionMetadata = new Map<string, SessionMetadata>();

export async function POST(req: NextRequest) {
  try {
    const metadata: SessionMetadata = await req.json();

    // Validate required fields
    if (!metadata.delegationId || !metadata.smartAccountAddress || !metadata.userHash) {
      return NextResponse.json(
        { error: 'Missing required metadata fields' },
        { status: 400 }
      );
    }

    // Store metadata with delegation ID as key
    sessionMetadata.set(metadata.delegationId, {
      ...metadata,
      createdAt: Math.floor(Date.now() / 1000),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Session metadata storage error:', error);
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
    const userHash = searchParams.get('userHash');

    if (sessionId) {
      // Get specific session metadata
      const metadata = sessionMetadata.get(sessionId);
      if (!metadata) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(metadata);
    }

    if (userHash) {
      // Get all sessions for a user
      const userSessions = Array.from(sessionMetadata.values())
        .filter(session => session.userHash === userHash);
      
      return NextResponse.json({ sessions: userSessions });
    }

    return NextResponse.json(
      { error: 'sessionId or userHash parameter required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Session metadata retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter required' },
        { status: 400 }
      );
    }

    const deleted = sessionMetadata.delete(sessionId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Session metadata deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}