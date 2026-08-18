// Reads for the dashboard's data layer, now backed by Supabase instead of Hermes'
// own REST API. Every function here returns the same shapes hermesClient.ts used to
// (HermesTask, HermesStrategicPriority, etc.) so dataService.ts's existing mapping
// functions (mapTasks, mapStrategic, mapRevenue, mapTeamPulse, ...) don't need to
// change — only where the raw data comes from.
import { getSupabase } from './supabaseServer';
import { dubaiDayKey } from './text';
import type {
  HermesOverview,
  HermesTask,
  HermesEmail,
  HermesDashboardCache,
  HermesConnection,
  HermesTeamPulseMember,
  HermesStrategicPriority,
  HermesRevenue,
  HermesDecision,
  HermesFlowly,
} from './hermesClient';

// Hermes' write path has repeatedly double-encoded jsonb columns (json.dumps()
// called before handing the value to a client that also JSON-encodes it) — seen
// recurring across different tables on different days, most recently in
// flowly_snapshots after the last round was confirmed fixed for the other 4 tables.
// Guard every jsonb read against landing as a raw JSON string instead of a parsed
// object/array, so one more occurrence of that bug degrades a single field instead
// of breaking the whole section.
function parseJsonbColumn<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

async function latestSnapshot<T>(table: string): Promise<{ data: T | null; fetchedAt?: string }> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(table)
    .select('data, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return { data: null };
  return { data: parseJsonbColumn<T | null>(data.data, null), fetchedAt: data.fetched_at as string };
}

export async function getDashboardCacheFromSupabase(): Promise<HermesDashboardCache> {
  const [overview, tasks, emails, calendar] = await Promise.all([
    latestSnapshot<Record<string, unknown>>('overview_snapshots'),
    latestSnapshot<{ tasks?: HermesTask[] }>('tasks_snapshots'),
    latestSnapshot<{ messages?: HermesEmail[] }>('emails_snapshots'),
    latestSnapshot<{ events?: unknown[] }>('calendar_snapshots'),
  ]);

  const ov = overview.data ?? {};
  const mappedOverview: HermesOverview = {
    total_inbox: (ov.total_inbox as number) ?? (ov.unread as number) ?? 0,
    active_tasks: (ov.active_tasks as number) ?? 0,
    upcoming_events: (ov.upcoming_events as number) ?? 0,
    team_count: (ov.team_count as number) ?? 0,
    // Hermes has written this field under both "today_events" and "todays_events"
    // across different versions — accept either.
    today_events: (ov.today_events as number) ?? (ov.todays_events as number) ?? 0,
    unread_inbox: (ov.unread as number) ?? (ov.total_inbox as number) ?? 0,
    overdue_tasks: (ov.overdue_tasks as number) ?? 0,
    today: dubaiDayKey(),
    high_priority_tasks: 0,
  };

  return {
    overview: mappedOverview,
    tasks: { tasks: tasks.data?.tasks ?? [] },
    emails: { messages: emails.data?.messages ?? [] },
    calendar: { events: calendar.data?.events ?? [] },
    source: overview.data ? 'supabase' : 'unavailable',
    fetched_at: overview.fetchedAt,
    from_cache: true,
  };
}

export async function getConnectionsFromSupabase(): Promise<HermesConnection[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('connections_status').select('*');
  if (error || !data) return [];
  return data.map((row) => ({
    name: row.name,
    status: row.status,
    note: row.note ?? undefined,
    reason: row.reason ?? undefined,
    source: 'supabase',
    fetched_at: row.updated_at,
    from_cache: true,
  }));
}

export async function getTeamPulseFromSupabase(): Promise<{
  members: HermesTeamPulseMember[];
  source: string;
  fetched_at?: string;
  from_cache: boolean;
}> {
  const sb = getSupabase();
  const { data, error } = await sb.from('team_members').select('*');
  if (error || !data || data.length === 0) {
    return { members: [], source: 'unavailable', from_cache: false };
  }
  const members: HermesTeamPulseMember[] = data.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role ?? 'Team Member',
    status: row.status ?? 'on_track',
    overdue_tasks: row.overdue_tasks ?? 0,
    pending_tasks: row.pending_tasks ?? 0,
    task_count: row.pending_tasks ?? 0,
    notes: [],
    email: row.email ?? undefined,
    days_since_last_activity: row.days_since_last_activity ?? null,
    tracked_in_asana: row.tracked_in_asana ?? false,
    completed_tasks_7d: row.completed_tasks_7d ?? 0,
  }));
  const latest = data.reduce((a, b) => (a.updated_at > b.updated_at ? a : b));
  return { members, source: 'supabase', fetched_at: latest.updated_at, from_cache: true };
}

function unwrapValue(v: unknown): number | string {
  const parsed = parseJsonbColumn<unknown>(v, v);
  if (parsed && typeof parsed === 'object' && 'value' in (parsed as Record<string, unknown>)) {
    return (parsed as Record<string, unknown>).value as number | string;
  }
  return parsed as number | string;
}

function unwrapUnit(v: unknown): string | undefined {
  const parsed = parseJsonbColumn<unknown>(v, v);
  if (parsed && typeof parsed === 'object' && 'unit' in (parsed as Record<string, unknown>)) {
    return (parsed as Record<string, unknown>).unit as string;
  }
  return undefined;
}

export async function getStrategicFromSupabase(): Promise<{
  priorities: HermesStrategicPriority[];
  source: string;
  fetched_at?: string;
  from_cache: boolean;
}> {
  const sb = getSupabase();
  const { data, error } = await sb.from('strategic_priorities').select('*').order('id');
  if (error || !data || data.length === 0) {
    return { priorities: [], source: 'unavailable', from_cache: false };
  }
  const priorities: HermesStrategicPriority[] = data.map((row) => ({
    id: row.id,
    name: row.name,
    current: unwrapValue(row.current),
    target: unwrapValue(row.target),
    unit: unwrapUnit(row.current) ?? unwrapUnit(row.target),
    pct: row.pct != null ? Number(row.pct) : (null as unknown as number),
    trend: row.trend ?? 'flat',
    trend_pct: row.trend_pct != null ? Number(row.trend_pct) : undefined,
    status: row.status ?? 'warning',
    note: row.note ?? undefined,
    owner: row.owner ?? undefined,
    related_project: row.related_project ?? undefined,
    // Milestone breakdowns aren't captured in the Supabase schema yet — the note
    // field still carries a human-readable summary, so additionalInfo degrades
    // gracefully to that instead of a structured milestone list.
    milestones: undefined,
  }));
  const latest = data.reduce((a, b) => (a.updated_at > b.updated_at ? a : b));
  return { priorities, source: 'supabase', fetched_at: latest.updated_at, from_cache: true };
}

export async function getRevenueFromSupabase(days = 30): Promise<HermesRevenue> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('revenue_daily')
    .select('*')
    .order('date', { ascending: false })
    .limit(days);
  if (error || !data || data.length === 0) {
    return {
      daily: 0,
      daily_trend: [],
      month_to_date: 0,
      month_target: 400000,
      month_pct: 0,
      departments: [],
      daily_source: { source: 'unavailable', fetched_at: new Date().toISOString(), from_cache: false },
      month_source: 'unavailable',
      source: 'unavailable',
      from_cache: false,
    };
  }
  const ascending = [...data].reverse();
  const monthPrefix = dubaiDayKey().slice(0, 7);
  const monthRows = data.filter((r) => (r.date as string).startsWith(monthPrefix));
  const monthToDate = monthRows.reduce((sum, r) => sum + Number(r.revenue), 0);
  const todayRow = data.find((r) => r.date === dubaiDayKey()) ?? ascending[ascending.length - 1];
  const monthTarget = 400000;

  return {
    daily: Number(todayRow.revenue),
    daily_trend: ascending.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      source: r.source ?? 'emirates_nbd_gmail',
      fetched_at: r.fetched_at,
    })),
    month_to_date: Math.round(monthToDate * 100) / 100,
    month_target: monthTarget,
    month_pct: Math.round((monthToDate / monthTarget) * 100),
    departments: [],
    daily_source: { source: todayRow.source ?? 'emirates_nbd_gmail', fetched_at: todayRow.fetched_at, from_cache: true },
    month_source: 'supabase',
    month_fetched_at: todayRow.fetched_at,
    month_from_cache: true,
    source: 'supabase',
    fetched_at: todayRow.fetched_at,
    from_cache: true,
  };
}

export async function getDecisionsFromSupabase(): Promise<{
  decisions: HermesDecision[];
  source: string;
  fetched_at?: string;
  from_cache: boolean;
}> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('decisions')
    .select('*')
    .order('date', { ascending: false })
    .limit(50);
  if (error || !data || data.length === 0) {
    return { decisions: [], source: 'unavailable', from_cache: false };
  }
  const decisions: HermesDecision[] = data.map((row) => ({
    date: row.date,
    description: row.description,
    source: row.source ?? 'Email archive',
    confidence: row.confidence ?? undefined,
    source_ref: row.source_ref ?? undefined,
  }));
  return { decisions, source: 'supabase', fetched_at: data[0].created_at, from_cache: true };
}

export async function getFlowlyFromSupabase(): Promise<HermesFlowly> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('flowly_snapshots')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    return {
      mcp_connection: 'disconnected',
      funnels: { total: 0, published: 0, draft: 0, total_steps_across_funnels: 0, created_24h: 0, leads_captured_total: 0, source: 'unavailable' },
      recent_activity: {},
      dev_activity: {},
      task_backlog: { pending: 0, stale: 0, source: 'unavailable' },
      blockers: [],
    };
  }
  return {
    mcp_connection: 'connected',
    funnels: parseJsonbColumn(data.funnels, { total: 0, published: 0, draft: 0, total_steps_across_funnels: 0, created_24h: 0, leads_captured_total: 0 }),
    sessions: parseJsonbColumn(data.sessions, undefined),
    // Not captured as a distinct column in the Supabase schema — funnels/sessions
    // above already carry the real per-24h numbers dataService derives a summary
    // line from, so this degrades to an empty object rather than fabricated text.
    recent_activity: {},
    dev_activity: parseJsonbColumn(data.dev_activity, {}),
    task_backlog: parseJsonbColumn(data.task_backlog, { pending: 0, stale: 0 }),
    blockers: parseJsonbColumn(data.blockers, []),
    cro: parseJsonbColumn(data.cro, undefined),
    from_cache: true,
    timestamp: data.fetched_at,
  };
}
