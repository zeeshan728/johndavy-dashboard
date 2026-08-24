export interface LegalSource {
  id: string;
  title: string;
  path: string;
  brain: string;
  category: string;
  terms: string[];
  dates_found: string[];
  evidence: string;
  source: string;
  fetched_at?: string;
  confidence?: string;
}

export interface LegalDeadline {
  date: string;
  days_until: number;
  urgency: 'overdue' | 'urgent' | 'upcoming' | 'future';
  fact: string;
  source: {
    path: string;
    brain: string;
  };
  evidence: string;
  status: string;
  recommendation: string;
  counsel_review_recommended: boolean;
}

export interface LegalRisk {
  id: string;
  severity: 'high' | 'medium' | 'low' | string;
  what_was_detected: string;
  source: {
    path: string;
    brain: string;
  };
  evidence: string;
  why_it_may_matter: string;
  urgency: string;
  recommended_next_step: string;
  counsel_review_recommended: boolean;
  status: string;
  owner?: string;
}

export interface LegalEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  category: string;
  source: string;
  evidence: string;
}

export interface LegalOverview {
  generated_at: string;
  notice: string;
  summary: {
    urgent_matters: number;
    upcoming_deadlines: number;
    open_matters: number;
    contracts_requiring_attention: number;
  };
  urgent_matters: LegalRisk[];
  upcoming_deadlines: LegalDeadline[];
  open_matters: LegalRisk[];
  contracts: LegalSource[];
  recent_activity: {
    type: string;
    title: string;
    source: string;
    date: string | null;
  }[];
  unavailable_sources: {
    source: string;
    status: string;
    note: string;
  }[];
  source: string;
  from_cache: boolean;
}

export interface LegalSearchResult {
  query: string;
  documents: LegalSource[];
  emails: LegalEmail[];
  total: number;
  unavailable_sources: LegalOverview['unavailable_sources'];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Legal API request failed: ${response.status}`);
  }

  return response.json();
}

export function getLegalOverview() {
  return request<LegalOverview>('/api/legal/overview');
}

export function searchLegal(query: string, source: 'all' | 'documents' | 'email' = 'all') {
  const params = new URLSearchParams({
    q: query,
    source,
  });

  return request<LegalSearchResult>(`/api/legal/search?${params.toString()}`);
}

export function getLegalDeadlines() {
  return request<{ deadlines: LegalDeadline[]; total: number }>(
    '/api/legal/deadlines',
  );
}

export function askLegalAssistant(
  question: string,
  conversationHistory: { role: string; content: string }[] = [],
) {
  return request<{
    question: string;
    response: string;
    evidence: LegalSource[];
    notice: string;
  }>('/api/legal/ask', {
    method: 'POST',
    body: JSON.stringify({
      question,
      conversation_history: conversationHistory,
    }),
  });
}

export function createLegalBriefing(company: string) {
  return request<{
    company: string | null;
    background: string;
    current_issue: string;
    relevant_documents: LegalSource[];
    relevant_emails: LegalEmail[];
    timeline: LegalDeadline[];
    important_facts: string[];
    open_questions: string[];
    questions_for_counsel: string[];
    recommended_next_steps: string[];
    notice: string;
  }>('/api/legal/briefing', {
    method: 'POST',
    body: JSON.stringify({ company }),
  });
}

export function createLegalDraft(purpose: string, context: string) {
  return request<{
    draft: string;
    requires_approval: boolean;
    sent: boolean;
    audit: {
      action: string;
      timestamp: string;
    };
    notice: string;
  }>('/api/legal/draft', {
    method: 'POST',
    body: JSON.stringify({ purpose, context }),
  });
}