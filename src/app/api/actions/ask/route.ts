import { NextResponse } from 'next/server';
import { askHermes } from '@/lib/hermesClient';

export async function POST(request: Request) {
  try {
    const { question, conversation_history } = await request.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const result = await askHermes(question, Array.isArray(conversation_history) ? conversation_history : undefined);
    // Hermes returns its fields flat — reshape into { answer: {...} } so the
    // frontend's existing contract doesn't need to change.
    return NextResponse.json({
      answer: {
        response: result.response,
        vault_matches: result.vault_matches,
        vault_results: result.vault_results,
        system_status: result.system_status,
      },
    });
  } catch (error) {
    console.error('Error asking Hermes:', error);
    const message = error instanceof Error ? error.message : 'Failed to reach Hermes';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
