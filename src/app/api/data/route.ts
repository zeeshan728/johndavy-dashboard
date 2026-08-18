import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
