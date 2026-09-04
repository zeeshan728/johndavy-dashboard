import { NextResponse } from 'next/server';
import { getRelationships } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = new URLSearchParams();

    ['period', 'q', 'company', 'filter'].forEach((key) => {
      const value = url.searchParams.get(key);

      if (value) {
        params.set(key, value);
      }
    });

    return NextResponse.json(
      await getRelationships(Object.fromEntries(params.entries())),
    );
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'Unknown Hermes error';

    console.error('Error fetching relationships:', detail);

    return NextResponse.json(
      {
        error: 'Failed to fetch relationships from Hermes',
        detail,
      },
      { status: 502 },
    );
  }
}
