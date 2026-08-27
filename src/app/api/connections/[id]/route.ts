import { NextRequest, NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function proxyConnectionRequest(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = await context.params;
  const action = request.nextUrl.searchParams.get('action');

  const suffix = action ? `/${action}` : '';
  const upstreamPath = `/api/connections/${encodeURIComponent(id)}${suffix}`;

  try {
    const body =
      request.method === 'GET'
        ? undefined
        : await request.arrayBuffer();

    const response = await fetchHermes(upstreamPath, {
      method: request.method,
      headers:
        request.method === 'GET'
          ? undefined
          : {
              'Content-Type':
                request.headers.get('content-type') ||
                'application/json',
            },
      body,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `Connection request failed for ${id}:`,
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Connection request failed',
      },
      {
        status: 502,
      },
    );
  }
}

export const GET = proxyConnectionRequest;
export const POST = proxyConnectionRequest;
