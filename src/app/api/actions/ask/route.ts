import { NextResponse } from 'next/server';
import { askHermes } from '@/lib/hermesClient';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const DASHBOARD_ENDPOINTS: { path: string; label: string }[] = [
  { path: '/api/dashboard/cache', label: 'DASHBOARD SNAPSHOT' },
  { path: '/api/revenue', label: 'REVENUE' },
  { path: '/api/strategic', label: 'STRATEGIC PRIORITIES' },
  { path: '/api/decisions', label: 'DECISION LOG' },
  { path: '/api/flowly', label: 'FLOWLY OS' },
  { path: '/api/team/pulse', label: 'TEAM PULSE' },
  { path: '/api/cro', label: 'CRO / MARKETING' },
];

function getApiBase(): string {
  const base =
    process.env.HERMES_API_BASE ||
    'https://exposed-port-8766-75e25f2cf7732394f831-k7lg5zdmjg.h48.openclaw.agent37.com';

  return base.replace(/\/$/, '');
}

function getApiToken(): string | undefined {
  return process.env.HERMES_API_TOKEN;
}

async function fetchEndpoint(
  base: string,
  token: string | undefined,
  path: string,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${base}${path}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(token
          ? {
              Authorization: 'Bearer ' + token,
            }
          : {}),
      },
    });

    if (!response.ok) {
      console.warn(
        `Dashboard context endpoint failed: ${path} ${response.status}`,
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`Dashboard context endpoint unavailable: ${path}`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchMeetingTranscripts(
  base: string,
  token: string | undefined,
  question: string,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const query = encodeURIComponent(question.trim());

    const response = await fetch(
      `${base}/api/vault/search?q=${query}`,
      {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(token
            ? {
                Authorization: 'Bearer ' + token,
              }
            : {}),
        },
      },
    );

    if (!response.ok) {
      console.warn(
        `Meeting transcript search failed: ${response.status}`,
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Meeting transcript search unavailable:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildLiveDashboardContext(
  question: string,
): Promise<string> {
  const base = getApiBase();
  const token = getApiToken();

  const transcriptResults = await searchMeetingTranscripts(
    base,
    token,
    question,
  );

  const results = await Promise.all(
    DASHBOARD_ENDPOINTS.map(async ({ path, label }) => {
      const data = await fetchEndpoint(base, token, path);

      if (data === null) {
        return null;
      }

      let text: string;

      try {
        text = JSON.stringify(data);
      } catch {
        text = String(data);
      }

      if (text.length > 1500) {
        text = text.slice(0, 1500) + '...[truncated]';
      }

      return `### ${label} (live)\n${text}`;
    }),
  );

  const sections = results.filter(
    (section): section is string => section !== null,
  );

  if (transcriptResults !== null) {
  let transcriptText: string;

  try {
    transcriptText = JSON.stringify(transcriptResults);
  } catch {
    transcriptText = String(transcriptResults);
  }

  if (transcriptText.length > 6000) {
    transcriptText =
      transcriptText.slice(0, 6000) + '...[truncated]';
  }

  sections.unshift(
    `### MEETING TRANSCRIPTS AND NOTES (live)\n${transcriptText}`,
  );
}

  if (sections.length === 0) {
    return '';
  }

  return [
    '[CURRENT LIVE DASHBOARD STATE - authoritative backend data fetched just now.]',
    'Ground answers about revenue, strategy, decisions, team, Flowly, or CRO in this data.',
    'If a number is not present here or in the vault results, say so plainly. Never invent numbers.',
    '',
    sections.join('\n\n'),
  ].join('\n');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question = body?.question;
    const conversationHistory = body?.conversation_history;

    if (typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'question is required' },
        { status: 400 },
      );
    }

    const history: ConversationMessage[] = Array.isArray(conversationHistory)
      ? conversationHistory.filter(
          (message): message is ConversationMessage =>
            message &&
            (message.role === 'user' || message.role === 'assistant') &&
            typeof message.content === 'string',
        )
      : [];

    const liveContext = await buildLiveDashboardContext(
      question.trim(),
    );

    const enrichedHistory: ConversationMessage[] = liveContext
      ? [
          {
            role: 'user',
            content: liveContext,
          },
          ...history,
        ]
      : history;

    const result = await askHermes(question.trim(), enrichedHistory);

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

    const message =
      error instanceof Error ? error.message : 'Failed to reach Hermes';

    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}