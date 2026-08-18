import { NextResponse } from 'next/server';
import { getRevenueFromSupabase } from '@/lib/supabaseDashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const revenue = await getRevenueFromSupabase();
    return NextResponse.json(revenue);
  } catch (error) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 502 });
  }
}
