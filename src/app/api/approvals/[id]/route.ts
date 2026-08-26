import { NextRequest, NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

/**
 * Same-origin approval update proxy.
 * The Hermes Bearer token stays server-side.
 */
export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
    const body = await request.arrayBuffer();

    const data = await fetchHermes(
      `/api/approvals/${encodeURIComponent(id)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      }
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating approval:', error);

    return NextResponse.json(
      {
        error: 'Failed to update approval in Hermes',
      },
      { status: 502 }
    );
  }
}
