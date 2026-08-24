import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_API_BASE =
  'https://exposed-port-8766-1ed4d0741f5accca4edf-k7lg5zdmjg.h48.openclaw.agent37.com';

function getHermesBase() {
  return (
    process.env.HERMES_API_BASE ||
    process.env.NEXT_PUBLIC_HERMES_API_BASE ||
    FALLBACK_API_BASE
  ).replace(/\/$/, '');
}

async function proxy(request: NextRequest, path: string[]) {
  const target = `${getHermesBase()}/api/legal/${path.join('/')}${request.nextUrl.search}`;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  const token =
    process.env.HERMES_API_TOKEN ||
    process.env.NEXT_PUBLIC_HERMES_API_TOKEN;

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();

  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
  });

  const responseBody = await response.text();

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('content-type') || 'application/json',
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}