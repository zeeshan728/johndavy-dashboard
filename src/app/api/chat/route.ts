import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationHistory = Array.isArray(body.conversation_history)
      ? body.conversation_history.slice(-10)
      : [];

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const base = process.env.HERMES_API_BASE;
    const token = process.env.HERMES_API_TOKEN;

    if (!base) {
      return NextResponse.json(
        { success: false, error: 'HERMES_API_BASE is not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${base.replace(/\/$/, '')}/api/ask`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        question: message,
        conversation_history: conversationHistory,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.detail || 'Chief of Staff request failed',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      response: data.response || '',
      timestamp: data.timestamp,
      sources: {
        vaultMatches: data.vault_matches ?? 0,
        dashboardOverview: data.system_status?.dashboard_overview ?? null,
      },
    });
  } catch (error) {
    console.error('Chief of Staff chat error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'The Chief of Staff service is unavailable',
      },
      { status: 502 }
    );
  }
}