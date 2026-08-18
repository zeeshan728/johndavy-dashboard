import { NextRequest, NextResponse } from 'next/server';
import { getFlowly } from '@/lib/hermesClient';
import { mapCRO } from '@/lib/dataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get('days')) || undefined;
  try {
    const flowly = await getFlowly(days);
    return NextResponse.json({
      cro: mapCRO(flowly.cro, { fromCache: flowly.from_cache, timestamp: flowly.timestamp }),
    });
  } catch (error) {
    console.error('Error fetching CRO data:', error);
    return NextResponse.json({ error: 'Failed to fetch CRO data' }, { status: 502 });
  }
}
