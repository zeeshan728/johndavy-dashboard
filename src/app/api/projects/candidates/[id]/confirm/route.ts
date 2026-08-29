import { NextRequest, NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const body = await request.arrayBuffer();

    return NextResponse.json(
      await fetchHermes(
        `/api/projects/candidates/${encodeURIComponent(id)}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        },
      ),
    );
  } catch {
    return NextResponse.json(
      { error: 'Project confirmation failed' },
      { status: 502 },
    );
  }
}
