import { NextResponse } from 'next/server';
import { briefJohn } from '@/lib/hermesClient';

export async function POST() {
  try {
    const result = await briefJohn();
    const delivered = result.status === 'sent' && result.whatsapp_response?.success;
    const confirmation = delivered
      ? `✅ Sent to ${result.delivered_to ?? 'WhatsApp'}\n\n${result.briefing}`
      : `⚠️ Generated but not confirmed delivered (status: ${result.status})\n\n${result.briefing}`;
    return NextResponse.json({ message: confirmation });
  } catch (error) {
    console.error('Error sending brief via Hermes:', error);
    const message = error instanceof Error ? error.message : 'Failed to send briefing';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
