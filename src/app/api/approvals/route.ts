import { NextRequest, NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

/**
 * Same-origin approvals proxy.
 * Keeps the Hermes Bearer token server-side while forwarding
 * the selected date and status filters.
 */
export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams();

    const date = request.nextUrl.searchParams.get('date');
    const status = request.nextUrl.searchParams.get('status');

    if (date) {
      params.set('date', date);
    }

    if (status) {
      params.set('status', status);
    }

    const query = params.toString()
      ? `?${params.toString()}`
      : '';

    return NextResponse.json(
      await fetchHermes(`/api/approvals${query}`)
    );
  } catch (error) {
    console.error('Error fetching approvals:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch approvals from Hermes',
      },
      {
        status: 502,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.arrayBuffer();

    return NextResponse.json(
      await fetchHermes('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })
    );
  } catch (error) {
    console.error('Error creating approval:', error);

    return NextResponse.json(
      {
        error: 'Failed to create approval in Hermes',
      },
      {
        status: 502,
      }
    );
  }
}
