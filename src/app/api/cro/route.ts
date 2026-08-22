import { NextRequest, NextResponse } from 'next/server';
import { getFlowly } from '@/lib/hermesClient';
import { mapCRO } from '@/lib/dataService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get('days')) || 30;

  try {
    const flowly = await getFlowly(days);

    return NextResponse.json(
      {
        cro: mapCRO(flowly.cro, {
          fromCache: flowly.from_cache,
          timestamp: flowly.timestamp,
        }),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching CRO data:', error);

    return NextResponse.json(
      { error: 'Failed to fetch CRO data' },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}