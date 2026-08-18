import { NextResponse } from 'next/server';
import { refreshAllData } from '@/lib/dataService';

export const dynamic = 'force-dynamic';
// refreshAllData() enqueues tasks/revenue refresh_jobs rows and polls Supabase for
// completion (REFRESH_JOB_TIMEOUT_MS = 90s, both jobs in parallel) rather than
// blocking on a direct Hermes REST call — worst case is ~90s plus a few seconds for
// the rest of the data pull, well under Vercel's 300s default function ceiling.
export const maxDuration = 120;

export async function POST() {
  try {
    const data = await refreshAllData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error refreshing dashboard data from Hermes:', error);
    const message = error instanceof Error ? error.message : 'Failed to refresh dashboard data';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
