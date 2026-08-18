import { NextResponse } from 'next/server';
import { refreshBriefingOnHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await refreshBriefingOnHermes();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error triggering briefing refresh:', error);
    const message = error instanceof Error ? error.message : 'Failed to trigger briefing refresh';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
