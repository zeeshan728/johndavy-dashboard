import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dataService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getDashboardData();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);

    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}