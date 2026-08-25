import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function proxyFinance(
  request: NextRequest,
  upstreamPath: string
) {
  const base = (
    process.env.HERMES_API_BASE ||
    process.env.NEXT_PUBLIC_HERMES_API_BASE ||
    ''
  ).replace(/\/$/, '');

  const token = process.env.HERMES_API_TOKEN;

  if (!base || !token) {
    return NextResponse.json(
      { error: 'Hermes API is not configured on the server.' },
      { status: 503 }
    );
  }

  try {
    const upstream = await fetch(
      `${base}${upstreamPath}${request.nextUrl.search}`,
      {
        method: request.method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    );

    const text = await upstream.text();

    let payload: unknown;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        error: text || 'Invalid upstream response',
      };
    }

    return NextResponse.json(payload, {
      status: upstream.status,
    });
  } catch (error) {
    console.error('Finance proxy failed:', error);

    return NextResponse.json(
      { error: 'Unable to reach Hermes finance service.' },
      { status: 502 }
    );
  }
}