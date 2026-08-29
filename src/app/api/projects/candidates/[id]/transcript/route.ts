import { NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      await fetchHermes(
        `/api/projects/candidates/${encodeURIComponent(id)}/transcript`,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcript unavailable' },
      { status: 502 },
    );
  }
}
