import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HERMES_API_BASE =
  process.env.HERMES_API_BASE || 'http://127.0.0.1:8766';

const HERMES_API_TOKEN = process.env.HERMES_API_TOKEN;

async function proxy(
  request: NextRequest,
  context: {
    params: Promise<{ path: string[] }>;
  },
) {
  const { path } = await context.params;

  const upstream = new URL(
    `${HERMES_API_BASE.replace(/\/$/, '')}/api/logistics/${path.join('/')}`,
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

  const isBodyMethod = !['GET', 'HEAD'].includes(request.method);

  if (isBodyMethod) {
    headers.set(
      'Content-Type',
      request.headers.get('content-type') || 'application/json',
    );
  }

  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: isBodyMethod ? await request.text() : undefined,
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
export const PATCH = proxy;

export const OPTIONS = () =>
  new NextResponse(null, {
    status: 204,
  });
