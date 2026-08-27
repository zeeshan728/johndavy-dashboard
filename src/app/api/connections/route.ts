import { NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetchHermes('/api/connections');

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      'Error fetching connection health:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to fetch connection health from Hermes',
      },
      {
        status: 502,
      },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Use a connection-specific action endpoint',
    },
    {
      status: 405,
    },
  );
}
