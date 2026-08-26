// Client for the Hermes agent's own REST API (exposed via an Agent37 public port).
// Read-only endpoints backed by real Gmail/Asana/Calendar/cron data.
// Sends a bearer token if HERMES_API_TOKEN is set (the port has no auth until that's configured).

const FALLBACK_API_BASE = 'https://4d3583af5a829456c4f9.agent37.app';

// Hermes API client.
//
// This module is used by Next.js server-side routes and data services.
// Authentication stays server-side. Never use NEXT_PUBLIC_HERMES_API_TOKEN.

function getApiBase(): string {
    // NEXT_PUBLIC_* is inlined into the browser bundle; non-prefixed env vars are
    // only available server-side. Server routes must prefer the private value so a
    // stale public deployment variable cannot override the current server config.
  const base =
    typeof window === 'undefined'
      ? process.env.HERMES_API_BASE ||
        process.env.NEXT_PUBLIC_HERMES_API_BASE ||
        FALLBACK_API_BASE
      : process.env.NEXT_PUBLIC_HERMES_API_BASE || FALLBACK_API_BASE;

  if (!base) {
    if (typeof window !== 'undefined') {
      console.warn('HERMES_API_BASE not set, using fallback URL');
    }

    return FALLBACK_API_BASE;
  }

  return base.replace(/\/$/, '');
}

export async function fetchHermes<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const base = getApiBase();
  const token = process.env.HERMES_API_TOKEN;

  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Hermes API ${path} failed: ${response.status} ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

export interface HermesOverview {
  total_inbox: number;
  active_tasks: number;
  upcoming_events: number;
  team_count: number;
  today_events: number;
  unread_inbox: number;
  overdue_tasks: number;
  today: string;
  high_priority_tasks: number;
}

export interface HermesTask {
  name: string;
  due_on: string | null;
  completed: boolean;
  assignee: string | null;
  priority: string;
  project: string | null;
  url?: string;
  section?: string;
}

export interface HermesEmail {
  from: string;
  subject: string;
  snippet: string;
  date: string;
  id: string;
  label: string[];
}

export interface HermesDashboardCache {
  overview: HermesOverview;
  tasks: { tasks: HermesTask[] };
  emails: { messages: HermesEmail[] };
  calendar: { events: unknown[] };
  source?: string;
  fetched_at?: string;
  from_cache?: boolean;
}

export interface HermesConnection {
  name: string;
  status: 'connected' | 'not_connected' | 'blocked' | 'low_credits' | 'unavailable' | string;
  account?: string;
  note?: string;
  reason?: string;
  source?: string;
  fetched_at?: string;
  from_cache?: boolean;
}

export function getDashboardCache() {
  return fetchHermes<{ data: HermesDashboardCache }>('/api/dashboard/cache').then((r) => r.data);
}

export function getConnections() {
  return fetchHermes<{ connections: HermesConnection[] }>('/api/connections').then((r) => r.connections);
}

export function searchVault(query: string) {
  return fetchHermes<{ query: string; results: { brain: string; path: string; snippet: string }[]; total: number }>(
    `/api/vault/search?q=${encodeURIComponent(query)}`
  );
}

export interface HermesTeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  workspace?: string;
  source?: string;
}

export function getTeamMembers() {
  return fetchHermes<{ members: HermesTeamMember[]; total: number }>('/api/team/members');
}

export interface HermesTeamPulseMember {
  id: string;
  name: string;
  role: string;
  status: 'on_track' | 'warning' | 'critical' | 'inactive' | string;
  overdue_tasks: number;
  pending_tasks?: number;
  task_count: number;
  notes: string[];
  email?: string;
  days_since_last_activity?: number | null;
  // Whether this person appears in Asana at all. Distinguishes "had work and closed it"
  // from "we have no signal on them", which zero task counts alone cannot.
  tracked_in_asana?: boolean;
  completed_tasks_7d?: number;
}

export function getTeamPulse() {
  return fetchHermes<{ members: HermesTeamPulseMember[]; source?: string; fetched_at?: string; from_cache?: boolean }>(
    '/api/team/pulse'
  );
}

export interface HermesStrategicPriority {
  id: number;
  name: string;
  current: number | string;
  target: number | string;
  unit?: string;
  pct: number;
  trend: 'up' | 'down' | 'flat' | string;
  trend_pct?: number;
  status: 'on_track' | 'behind' | 'warning' | 'critical' | string;
  note?: string;
  revenue?: number;
  avg_price?: number;
  milestones?: { name: string; status: string; due?: string; value?: string }[];
  owner?: string;
  related_project?: string;
}

export function getStrategic() {
  return fetchHermes<{ priorities: HermesStrategicPriority[]; source?: string; fetched_at?: string; from_cache?: boolean }>(
    '/api/strategic'
  );
}

export interface HermesRevenueDepartment {
  name: string;
  monthly: number;
  month_target: number;
  pct_target: number;
  trend_pct?: number;
  source?: string;
}

export interface HermesRevenue {
  daily: number;
  month_to_date: number;
  month_target: number;
  month_pct: number;
  departments: HermesRevenueDepartment[];
  daily_trend: { date: string; revenue: number; source?: string }[];
  daily_source?: { source: string; fetched_at: string; from_cache: boolean };
  month_source?: string;
  month_fetched_at?: string;
  month_from_cache?: boolean;
  source?: string;
  fetched_at?: string;
  from_cache?: boolean;
}

export function getRevenue(days?: number) {
  return fetchHermes<HermesRevenue>(`/api/revenue${days ? `?days=${days}` : ''}`);
}

export interface HermesRefreshResult {
  refreshed: boolean;
  note?: string;
  source?: string;
  from_cache?: boolean;
  fetched_at?: string;
}

// Forces Hermes to regenerate its tasks/revenue caches on demand instead of waiting
// for the next cron tick. Both block for up to ~90s and are rate-limited server-side
// (429 if triggered again within 60s) — callers should treat failures as non-fatal
// and fall back to whatever's already cached.
export function refreshTasksOnHermes() {
  return fetchHermes<HermesRefreshResult>('/api/tasks/refresh', { method: 'POST' });
}

export function refreshRevenueOnHermes() {
  return fetchHermes<HermesRefreshResult>('/api/revenue/refresh', { method: 'POST' });
}

export interface HermesBriefingRefreshResult {
  refreshed: boolean;
  message?: string;
  cron_job_id?: string;
  timestamp?: string;
}

// Dedicated endpoint (replaces relying on /api/revenue/refresh's undocumented
// side effect of also triggering the briefing cron). Rate-limited server-side
// like the other refresh endpoints — treat failures as non-fatal.
export function refreshBriefingOnHermes() {
  return fetchHermes<HermesBriefingRefreshResult>('/api/briefing/refresh', { method: 'POST' });
}

export interface HermesDecision {
  date: string;
  description: string;
  source: string;
  confidence: string;
  source_ref?: string;
}

export function getDecisions() {
  return fetchHermes<{ decisions: HermesDecision[]; source?: string; fetched_at?: string; from_cache?: boolean }>(
    '/api/decisions'
  );
}

export interface HermesFlowly {
  mcp_connection: 'connected' | 'disconnected' | string;
  funnels: {
    total: number;
    published: number;
    draft: number;
    total_steps_across_funnels: number;
    created_24h: number;
    leads_captured_total: number;
    source?: string;
    fetched_at?: string;
    from_cache?: boolean;
  };
  sessions?: {
    "24h": {
      total: number;
      unique_visitors: number;
      leads_captured: number;
      completions: number;
      conversion_rate_pct: number;
      source?: string;
      fetched_at?: string;
      from_cache?: boolean;
    };
    all_time: {
      total: number;
      unique_visitors: number;
      leads_captured: number;
      completions: number;
      conversion_rate_pct: number;
    };
    daily_trend?: { date: string; leads_captured: number; sessions_total: number; source?: string }[];
  };
  recent_activity: Record<string, string | number>;
  dev_activity: Record<string, string | number>;
  task_backlog: { pending: number; stale: number; source?: string; fetched_at?: string; from_cache?: boolean };
  // Hermes used to return a plain string array; it now wraps it with source metadata.
  blockers: string[] | { items: string[]; source?: string; fetched_at?: string; from_cache?: boolean };
  cro?: HermesCRO;
  from_cache?: boolean;
  timestamp?: string;
}

export interface HermesCROTotals {
  revenue: number;
  sales: number;
  aov: number;
  leads: number;
  conv_rate_pct: number;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpl: number;
  cpa: number;
  roas: number;
  currency: string;
}

export interface HermesCROFunnel {
  funnel_id: string;
  funnel_name: string;
  days_running: number;
  revenue: number;
  sales: number;
  aov: number;
  leads: number;
  conv_rate_pct: number;
  spend: number;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
}

export interface HermesCRO {
  range: string;
  // Present on the payload but NOT authoritative — it stayed "GBP" while totals.currency
  // reported the converted "usd". Prefer totals.currency; this is only a fallback.
  currency?: string;
  totals: HermesCROTotals;
  prev_totals: { revenue: number; sales: number; leads: number; spend: number; roas: number };
  by_funnel: HermesCROFunnel[];
  meta_campaigns: unknown[];
  filtered_totals: { revenue: number; sales: number; leads: number; spend: number };
  fetched_at?: string;
}

// /api/flowly is unlike Hermes' other endpoints: it's only cache-warmed once a day
// (06:00, via the warm-dashboard-cache cron) rather than every 10 minutes like
// revenue, and Hermes' own cron job documents this endpoint taking ~40s on a cold
// live pull ("Run with curl --max-time 120 since flowly takes ~40s") — confirmed
// directly against Hermes at 57s on one live cold pull. The 12s default timeout in
// fetchHermes was cutting this call off before a normal cold response could ever
// complete — give it a longer, still-bounded allowance (with margin above the
// observed 57s) instead of the generic default so it actually gets a chance to succeed.
export function getFlowly(days?: number) {
  const path = `/api/flowly${days ? `?days=${days}` : ''}`;

  return fetchHermes<HermesFlowly>(path, {
    signal: AbortSignal.timeout(75000),
  });
}

export interface HermesBriefJohnResult {
  status: 'sent' | 'briefing_ready' | string;
  briefing: string;
  whatsapp_response?: { success: boolean; messageId?: string };
  delivered_to?: string;
  char_count: number;
  timestamp?: string;
}

export function briefJohn() {
  return fetchHermes<HermesBriefJohnResult>('/api/actions/brief-john', {
    method: 'POST',
  });
}

export interface HermesBriefingSection {
  heading: string;
  body: string;
}

export interface HermesBriefingHighlights {
  headline?: string;
  revenue?: string;
  decisions?: number;
  blockers?: string[];
  opportunities?: string[];
}

export interface HermesBriefing {
  available: boolean;
  generated_at: string;
  fresh: boolean;
  age_hours: number;
  sections: HermesBriefingSection[];
  highlights: HermesBriefingHighlights;
  raw_text: string;
  source?: string;
  fetched_at?: string;
  from_cache?: boolean;
}

export function getBriefing() {
  return fetchHermes<HermesBriefing>('/api/briefing');
}

// Hermes' /api/ask now returns its fields flat (no "answer" wrapper) since it
// implements real LLM synthesis — confirmed live 2026-07-21. `response` is the
// actual synthesized answer; the rest is the retrieval context it was grounded in.
export interface HermesAskResult {
  question: string;
  response?: string;
  vault_matches: number;
  vault_results: { brain: string; path: string; snippet: string }[];
  system_status: {
    cron_jobs: { id: string; name?: string; status?: string }[] | null;
    dashboard_overview?: Record<string, unknown>;
  };
  llm_model?: string;
  timestamp?: string;
}

export function askHermes(question: string, conversationHistory?: { role: 'user' | 'assistant'; content: string }[]) {
  return fetchHermes<HermesAskResult>('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, conversation_history: conversationHistory }),
  });
}

export interface FinanceSource {
  source: string;
  status: string;
  note?: string;
  type?: string;
  id?: string;
  path?: string;
}

export interface FinanceInvoice {
  id: string;
  invoice_number: string | null;
  amount: number | null;
  currency: string | null;
  invoice_date: string | null;
  due_date: string | null;
  vendor: string | null;
  customer: string | null;
  po_reference: string | null;
  tax_vat: boolean;
  status: string;
  approval_status: string;
  paid: boolean | null;
  overdue: boolean | null;
  duplicate?: string;
  confidence: string;
  recommendation: string;
  source: FinanceSource;
  evidence: string;
}

export interface FinanceMetric {
  value: number | null;
  status: string;
  confidence: string;
  recommendation?: string;
  source?: FinanceSource;
}

export interface FinanceCalendarItem {
  title?: string;
  date: string;
  status: string;
  confidence: string;
  recommendation?: string;
  source?: FinanceSource;
}

export interface FinanceOverview {
  urgent_actions: FinanceInvoice[];
  approvals: FinanceInvoice[];
  payables: unknown[];
  receivables: unknown[];
  cash_liquidity: FinanceMetric;
  expenses: unknown[];
  recurring_expenses: unknown[];
  risks: unknown[];
  recommended_actions: {
    action: string;
    status: string;
    confidence: string;
    source?: FinanceSource;
  }[];
  calendar: {
    today: FinanceCalendarItem[];
    next_7_days: FinanceCalendarItem[];
    next_30_days: FinanceCalendarItem[];
  };
  recent_invoices: FinanceInvoice[];
  sources: FinanceSource[];
  data_availability: FinanceSource[];
  updated: string;
  source?: string;
  fetched_at?: string;
  from_cache?: boolean;
}

export interface FinanceAskResponse {
  question: string;
  answer: string;
  evidence: FinanceInvoice[];
  sources: FinanceSource[];
  requires_approval: boolean;
  updated: string;
}

export function getFinanceOverview() {
  return fetchHermes<FinanceOverview>('/api/finance/overview');
}

export function askFinance(question: string) {
  return fetchHermes<FinanceAskResponse>('/api/finance/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });
}
