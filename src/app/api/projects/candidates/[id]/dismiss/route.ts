import { NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    return NextResponse.json(
      await fetchHermes(
        `/api/projects/candidates/${encodeURIComponent(id)}/dismiss`,
        {
          method: 'POST',
        },
      ),
    );
  } catch {
    return NextResponse.json(
      { error: 'Project dismissal failed' },
      { status: 502 },
    );
  }
}
