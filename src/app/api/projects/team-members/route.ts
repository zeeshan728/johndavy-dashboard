import { NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await fetchHermes('/api/projects/team-members');
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Project team-members upstream error:', error);

    return NextResponse.json(
      {
        error: 'Hermes team-member API unavailable',
        detail:
          error instanceof Error
            ? error.message
            : 'Unknown upstream error',
      },
      { status: 502 },
    );
  }
}
