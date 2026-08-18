import { NextResponse } from 'next/server';
import { getConnections } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const connections = await getConnections();
    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection status from Hermes' },
      { status: 500 }
    );
  }
}
