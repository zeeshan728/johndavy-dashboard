import { NextResponse } from 'next/server';
import { searchVault } from '@/lib/hermesClient';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const { results } = await searchVault(query);
    return NextResponse.json({
      results: results.map((r) => ({ brain: r.brain, path: r.path, snippet: r.snippet })),
    });
  } catch (error) {
    console.error('Error searching vault via Hermes:', error);
    const message = error instanceof Error ? error.message : 'Failed to search vault';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
