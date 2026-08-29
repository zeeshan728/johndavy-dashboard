import { NextRequest, NextResponse } from 'next/server';
import { fetchHermes } from '@/lib/hermesClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const selectedDate = request.nextUrl.searchParams.get('selected_date');
    const query = selectedDate
      ? `?selected_date=${encodeURIComponent(selectedDate)}`
      : '';

    return NextResponse.json(
      await fetchHermes(`/api/projects${query}`),
    );
  } catch (error) {
    console.error('Projects upstream error:', error);
    return NextResponse.json(
      {
        error: 'Hermes project API unavailable',
        detail: error instanceof Error ? error.message : 'Unknown upstream error',
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.arrayBuffer();
    return NextResponse.json(
      await fetchHermes('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
    );
  } catch (error) {
    console.error('Projects upstream error:', error);
    return NextResponse.json(
      { error: 'Project request failed', detail: error instanceof Error ? error.message : 'Unknown upstream error' },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('project_id');
    if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    return NextResponse.json(await fetchHermes(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: await request.arrayBuffer(),
    }));
  } catch (error) {
    console.error('Project removal error:', error);
    return NextResponse.json({ error: 'Project removal failed', detail: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 });
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Use candidate confirmation endpoints' },
    { status: 405 },
  );
}
