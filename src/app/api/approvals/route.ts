import { NextRequest, NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

/**
 * Same-origin approvals proxy.
 * The Hermes Bearer token stays server-side.
 */
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status');
    const query = status
      ? `?status=${encodeURIComponent(status)}`
      : '';

    const data = await fetchHermes(
      `/api/approvals${query}`
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching approvals:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch approvals from Hermes',
      },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.arrayBuffer();

    const data = await fetchHermes('/api/approvals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating approval:', error);

    return NextResponse.json(
      {
        error: 'Failed to create approval in Hermes',
      },
      { status: 502 }
    );
  }
}
