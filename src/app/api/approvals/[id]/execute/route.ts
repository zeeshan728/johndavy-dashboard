import { NextRequest, NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
    const body = await request.arrayBuffer();

    const result = await fetchHermes(
      `/api/approvals/${encodeURIComponent(id)}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing approval:', error);

    return NextResponse.json(
      {
        error: 'Failed to execute approval in Hermes',
      },
      { status: 502 }
    );
  }
}
