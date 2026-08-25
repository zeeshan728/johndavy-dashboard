import { NextResponse } from 'next/server';

const HERMES_API_BASE =
  process.env.HERMES_API_BASE ||
  'https://exposed-port-8766-740d855c66ee47a9fe74-k7lg5zdmjg.h48.openclaw.agent37.com';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(`${HERMES_API_BASE}/api/meetings`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${process.env.HERMES_API_TOKEN || ''}`,
      },
    });

    const body = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Hermes meetings request failed',
          detail: body,
        },
        { status: response.status }
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Could not connect to Hermes',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}