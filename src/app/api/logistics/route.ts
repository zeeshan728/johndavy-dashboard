import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HERMES_API_BASE =
  process.env.HERMES_API_BASE || 'http://127.0.0.1:8766';

const HERMES_API_TOKEN = process.env.HERMES_API_TOKEN;

async function proxy(request: NextRequest) {
  const upstream = new URL(
    `${HERMES_API_BASE.replace(/\/$/, '')}/api/logistics`,
  );

  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  const headers = new Headers({
    Accept: 'application/json',
  });

  if (HERMES_API_TOKEN) {
    headers.set('Authorization', `Bearer ${HERMES_API_TOKEN}`);
  }

  if (request.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === 'GET' ? undefined : await request.text(),
    cache: 'no-store',
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export const GET = proxy;
export const POST = proxy;

export const OPTIONS = () =>
  new NextResponse(null, {
    status: 204,
  });

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Use POST to stage a logistics action.',
    },
    { status: 405 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        'Cancellations are staged through POST and require approval.',
    },
    { status: 405 },
  );
}
