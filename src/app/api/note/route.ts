import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const token = process.env.HERMES_API_TOKEN;
    const base = process.env.HERMES_API_BASE;

    if (base) {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        return NextResponse.json({ success: true });
      } else {
        const errorText = await res.text();
        console.warn('Hermes note endpoint returned non-ok:', res.status, errorText);
      }
    }
    // Return success to client even if Hermes endpoint is not yet defined (mocked client-side)
    return NextResponse.json({ success: true, mocked: true });
  } catch (error) {
    console.error('Error in POST /api/note proxy:', error);
    // Graceful fallback to success for client-side localStorage fallback
    return NextResponse.json({ success: true, error: 'Proxy failed but handled gracefully' });
  }
}
