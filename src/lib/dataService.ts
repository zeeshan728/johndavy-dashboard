import {
  getBriefing,
  HermesTask,
  HermesConnection,
  HermesTeamMember,
  HermesTeamPulseMember,
  HermesStrategicPriority,
  HermesRevenue,
  HermesDecision,
  HermesFlowly,
  HermesCRO,
  HermesCROFunnel,
  HermesBriefing,
  HermesBriefingSection,
  HermesBriefingHighlights,
  HermesDashboardCache,
} from './hermesClient';
import {
  getDashboardCacheFromSupabase,
  getConnectionsFromSupabase,
  getTeamPulseFromSupabase,
  getStrategicFromSupabase,
  getRevenueFromSupabase,
  getDecisionsFromSupabase,
  getFlowlyFromSupabase,
} from './supabaseDashboard';
import { enqueueRefreshJob, waitForRefreshJob } from './refreshJobs';
import { currencySymbol, dubaiDayKey, formatClock, formatDate } from './text';

// Provenance metadata Hermes now attaches to every data point — lets the UI show
// where a number actually came from and how fresh it is.
export interface DataSource {
  source: string;
  fetchedAt?: string;
  fromCache?: boolean;
}

export interface ConnectionStatus {
  gmail: 'connected' | 'disconnected' | 'blocked' | 'low_credits' | 'unavailable';
  asana: 'connected' | 'disconnected' | 'blocked' | 'low_credits' | 'unavailable';
  calendar: 'connected' | 'disconnected' | 'blocked' | 'low_credits' | 'unavailable';
  slack: 'connected' | 'disconnected' | 'blocked' | 'low_credits' | 'unavailable';
  metaAds: 'connected' | 'disconnected' | 'blocked' | 'low_credits' | 'unavailable';
  recallAi: 'connected' | 'disconnected' | 'blocked' | 'low_credits' | 'unavailable';
}

export interface OverviewData {
  inboxUnread: number;
  overdueTasks: number;
  todayEvents: number;
  monthRevenue: number;
  monthTarget: number;
  lastUpdated: string;
  dailyBriefStatus: string;
  connections: ConnectionStatus;
  calendarReason?: string;
  connectionSources?: Record<string, DataSource>;
}

export interface StrategicPriority {
  id: number;
  name: string;
  target: number;
  current: number;
  percentage: number;
  trend: 'up' | 'down' | 'flat' | 'none';
  trendText: string;
  status: 'on_track' | 'behind' | 'warning' | 'critical';
  statusText: string;
  metricLabel: string;
  additionalInfo: string;
  deadline?: string;
  owner?: string;
  relatedProject?: string;
}

export interface TaskItem {
  name: string;
  due: string;
  assignee: string;
  project: string;
  permalink: string;
  daysOverdue?: number;
}

export interface TasksData {
  overdue: TaskItem[];
  dueToday: TaskItem[];
  pending: number;
  noDueDate: number;
  byAssignee: Record<string, number>;
  bySection: Record<string, number>;
  dataSource?: DataSource;
}

export interface ProjectSummary {
  name: string;
  totalTasks: number;
  doneTasks: number;
  completionPct: number;
  overdueTasks: TaskItem[];
  owner: string | null;
  // Most recent due date seen among the project's tasks (in the ~100-task window
  // Hermes' cache returns) — a proxy for activity since Asana tasks carry no
  // modified-at timestamp here, not a true "last touched" signal.
  latestDue: string | null;
}

export interface RevenueDepartment {
  name: string;
  monthly: number;
  pctTarget: number;
  trend: number;
  dataSource?: DataSource;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

export interface RevenueData {
  daily: number;
  dailyTrend: number;
  monthToDate: number;
  monthTarget: number;
  monthPct: number;
  departments: RevenueDepartment[];
  daily7Day: number[];
  daily7DayLabels: string[];
  dailyTrendAll: RevenueTrendPoint[];
  dailySource?: DataSource;
  monthSource?: DataSource;
  overallSource?: DataSource;
  // True when today's revenue is the 4s timeout placeholder (dataService.ts's race
  // against Hermes' slow cold-cache revenue call) rather than a real AED 0 reading —
  // callers should treat this as "not yet known", not as a red/critical signal.
  dailyPending?: boolean;
}

export interface TeamMember {
  name: string;
  role: string;
  // 'unknown' = we have no Asana signal on this person at all, which is distinct from
  // 'on_track' (they had work and closed it) and must not be styled as a positive.
  status: 'on_track' | 'warning' | 'critical' | 'inactive' | 'unknown';
  statusLabel: string;
  notes: string[];
  overdueCount: number;
  pendingCount?: number;
  pending_tasks?: number;
  overdue_tasks?: number;
  daysSinceLastActivity?: number | null;
}

export interface TeamPulseData {
  team: TeamMember[];
  dataSource?: DataSource;
}

export interface LeadsTrendPoint {
  date: string;
  leadsCaptured: number;
  sessionsTotal: number;
  // The Flowly MCP integration only exposes real numbers for "today" — every other
  // day in the trend array is a zero-filled placeholder (see hermes-api/server.py's
  // _build_flowly_response). isReal marks which points are actual measurements so
  // the chart can distinguish "zero leads" from "we have no data for this day".
  isReal: boolean;
}

export interface FlowlyOSData {
  funnelsActive: number;
  leadsCaptured: number;
  leadsCapturedAllTime: number;
  conversionRatePct: number;
  recentActivity: string[];
  devActivity: string[];
  taskBacklog: number;
  taskStale: number;
  blockers: string[];
  leadsDailyTrend: LeadsTrendPoint[];
  funnelsCreated24h?: number;
  devActivityRaw?: {
    commits_48h?: number;
    prs_open?: number;
    last_codebase_snapshot?: string;
  };
  sources: {
    funnels?: DataSource;
    sessions?: DataSource;
    recentActivity?: DataSource;
    devActivity?: DataSource;
    taskBacklog?: DataSource;
    blockers?: DataSource;
  };
  cro?: CROData | null;
}

export interface CROTotals {
  revenue30d: number;
  sales30d: number;
  aov: number;
  leads30d: number;
  convRatePct: number;
  spend30d: number;
  roas: number;
  cpl: number;
  cpa: number;
}

export interface CROFunnel {
  name: string;
  revenue: number;
  sales: number;
  aov: number;
  leads: number;
  convRatePct: number;
  spend: number;
  roas: number | null;
}

export interface CROData {
  range: string;
  // Lowercase ISO code for every money field in this block. Read from totals.currency,
  // not the payload's top-level `currency` — those disagree once Hermes converts spend
  // across multi-currency ad accounts (top level kept saying "GBP" while the converted
  // totals were USD).
  currency: string;
  totals: CROTotals;
  prevTotals: { revenue: number; sales: number; leads: number; roas: number };
  byFunnel: CROFunnel[];
  filteredTotals: { revenue: number; sales: number; leads: number };
  fetchedAt?: string;
  fromCache?: boolean;
}

export function mapCRO(
  raw: HermesCRO | undefined,
  meta?: { fromCache?: boolean; timestamp?: string }
): CROData | null {
  // When Flowly MCP has no CRO data, Hermes writes `totals: {}` rather than omitting
  // the key — a truthy object whose every field is undefined. A plain `!raw.totals`
  // check sails past that and hands callers a CROData full of undefined numbers, which
  // then throws the moment one of them is formatted (observed live: mapFlowlyLeadsPriority
  // calling leads.toLocaleString()). Require an actual reading before claiming CRO data.
  if (!raw || typeof raw.totals?.revenue !== 'number') return null;
  const t = raw.totals;
  const pt = raw.prev_totals;
  const ft = raw.filtered_totals;

  return {
    range: raw.range,
    currency: (t.currency ?? raw.currency ?? 'gbp').toLowerCase(),
    fetchedAt: raw.fetched_at ?? meta?.timestamp,
    fromCache: meta?.fromCache,
    totals: {
      revenue30d: t.revenue,
      sales30d: t.sales,
      aov: t.aov,
      leads30d: t.leads,
      convRatePct: t.conv_rate_pct,
      spend30d: t.spend,
      roas: t.roas,
      cpl: t.cpl,
      cpa: t.cpa,
    },
    prevTotals: {
      revenue: pt?.revenue ?? 0,
      sales: pt?.sales ?? 0,
      leads: pt?.leads ?? 0,
      roas: pt?.roas ?? 0,
    },
    byFunnel: (raw.by_funnel || [])
      .filter((f): f is HermesCROFunnel => f != null)
      .map((f) => ({
        name: f.funnel_name,
        revenue: f.revenue,
        sales: f.sales,
        aov: f.aov,
        leads: f.leads,
        convRatePct: f.conv_rate_pct,
        spend: f.spend,
        roas: f.roas,
      })),
    filteredTotals: {
      revenue: ft?.revenue ?? 0,
      sales: ft?.sales ?? 0,
      leads: ft?.leads ?? 0,
    },
  };
}

export interface DecisionItem {
  date: string;
  displayText: string;
  source: string;
  sourceType: 'gmail' | 'whatsapp' | 'recall' | 'calendar' | 'general';
  confidence?: 'high' | 'medium' | 'low';
  sourceRef?: string;
}

export interface DecisionsData {
  decisions: DecisionItem[];
  allDecisions: DecisionItem[];
  dataSource?: DataSource;
}

// A percentage change measured off a tiny base is vanity, not signal: "+2,026%" is
// computed from a £130 prior period and tells John nothing that "£130 → £2,764" doesn't
// tell him better. Return null when the prior period is immaterial next to the current
// one, so callers can show the absolute movement instead of a meaningless ratio.
export function materialChangePct(current: number, prev: number): number | null {
  if (prev <= 0) return null;
  if (prev < current * 0.2) return null;
  return ((current - prev) / prev) * 100;
}

export interface CalendarEvent {
  time: string;
  title: string;
  duration: string;
  attendees: string[];
  // Absolute instants of a timed event, for overlap checks. Empty for all-day entries.
  startsAt: string;
  endsAt: string;
}

// MITIGATION for an upstream duplication bug — remove once Hermes stops emitting the
// same calendar twice (see docs/hermes-backend-fix-spec-addendum-2026-07-21.md).
//
// Hermes merges two calendar feeds that resolve the same event against different UTC
// offsets (observed live: "09:00+01:00" and "11:00+03:00" — the *same* instant, 08:00Z).
// They only ever looked like separate meetings 2h apart because the old code sliced the
// clock characters out of the ISO string and ignored the offset. Now that times are
// parsed properly, the duplicates collapse onto an identical instant, so title + instant
// is an exact key rather than a fuzzy guess.
//
// Deliberately NOT keyed on attendees: Hermes' raw events carry only summary/start/end/
// location, so every event's attendee list is empty and would contribute nothing.
function dedupeCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.title.trim().toLowerCase().replace(/\s+/g, ' ')}|${e.startsAt || e.time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface CalendarData {
  events: CalendarEvent[];
  synced: boolean;
  dataSource?: DataSource;
}

export interface EmailItem {
  from: string;
  subject: string;
  date: string;
  snippet: string;
  flagged: boolean;
}

export interface EmailsData {
  importantUnread: EmailItem[];
  unreadCount: number;
  dataSource?: DataSource;
}

export interface MetaData {
  lastRefreshed: string;
  activeIntegrationsCount: number;
  alertsDismissed: string[];
  isMockData: boolean;
  // Set when a manual refresh partially failed (e.g. the on-demand Hermes cron
  // trigger for tasks/revenue timed out) — the rest of the data is still whatever
  // was last cached, not stale-and-silent.
  refreshWarnings?: string[];
  // True when most of the independent Hermes calls behind this payload failed (see
  // degradedCoreSections in getDashboardData). Distinct from isMockData: this is a
  // real, non-fabricated payload, but most sections in it are empty "unavailable"
  // placeholders rather than live data, so the client should treat it the same as
  // mock data for caching purposes (prefer the last real cached payload over
  // silently overwriting it with mostly-empty data).
  hermesLargelyUnreachable?: boolean;
}

export interface BriefingSection {
  heading: string;
  body: string;
}

export interface BriefingHighlights {
  headline?: string;
  revenue?: string;
  decisions?: number;
  blockers?: string[];
  opportunities?: string[];
}

export interface BriefingData {
  available: boolean;
  generated_at: string;
  fresh: boolean;
  age_hours: number;
  sections: BriefingSection[];
  highlights: BriefingHighlights;
  raw_text: string;
  dataSource?: DataSource;
}

export interface StrategicData {
  priorities: StrategicPriority[];
  dataSource?: DataSource;
}

export interface DashboardPayload {
  overview: OverviewData;
  strategic: StrategicData;
  tasks: TasksData;
  projects: ProjectSummary[];
  revenue: RevenueData;
  teamPulse: TeamPulseData;
  flowly: FlowlyOSData;
  decisions: DecisionsData;
  calendar: CalendarData;
  emails: EmailsData;
  meta: MetaData;
  briefing: BriefingData;
}

// Last-resort payload for an unexpected failure in getDashboardData's mapping layer
// (the Supabase reads themselves each degrade individually — see the .catch()es below).
//
// This deliberately fabricates nothing. It previously returned a hand-written sample
// payload — AED 12,450 revenue, a full invented team roster — which meant a single
// null-deref anywhere in the mapping code silently replaced every section with
// plausible-looking fiction. A CEO glancing at the dashboard had no way to tell.
//
// Instead we return a real, honest, empty payload flagged hermesLargelyUnreachable, the
// same signal the degraded-sections path already uses: the client prefers its last known
// good cache, and failing that each card renders its own "Data unavailable" state.
function getUnavailableDashboardPayload(): DashboardPayload {
  const now = new Date().toISOString();
  const unavailable: DataSource = { source: 'unavailable', fetchedAt: now, fromCache: false };

  return {
    overview: {
      inboxUnread: 0,
      overdueTasks: 0,
      todayEvents: 0,
      monthRevenue: 0,
      monthTarget: 400000,
      lastUpdated: now,
      dailyBriefStatus: 'unavailable',
      connections: {
        gmail: 'unavailable',
        asana: 'unavailable',
        calendar: 'unavailable',
        slack: 'unavailable',
        metaAds: 'unavailable',
        recallAi: 'unavailable',
      },
    },
    strategic: { priorities: [], dataSource: unavailable },
    tasks: {
      overdue: [],
      dueToday: [],
      pending: 0,
      noDueDate: 0,
      byAssignee: {},
      bySection: {},
      dataSource: unavailable,
    },
    projects: [],
    revenue: {
      daily: 0,
      dailyTrend: 0,
      monthToDate: 0,
      monthTarget: 400000,
      monthPct: 0,
      departments: [],
      daily7Day: [],
      daily7DayLabels: [],
      dailyTrendAll: [],
      dailySource: unavailable,
      monthSource: unavailable,
      overallSource: unavailable,
      // Not a real AED 0 reading — nothing was fetched at all.
      dailyPending: true,
    },
    teamPulse: { team: [], dataSource: unavailable },
    flowly: {
      funnelsActive: 0,
      leadsCaptured: 0,
      leadsCapturedAllTime: 0,
      conversionRatePct: 0,
      recentActivity: [],
      devActivity: [],
      taskBacklog: 0,
      taskStale: 0,
      blockers: [],
      leadsDailyTrend: [],
      sources: {
        funnels: unavailable,
        sessions: unavailable,
        recentActivity: unavailable,
        devActivity: unavailable,
        taskBacklog: unavailable,
        blockers: unavailable,
      },
      cro: null,
    },
    decisions: { decisions: [], allDecisions: [], dataSource: unavailable },
    calendar: { events: [], synced: false, dataSource: unavailable },
    emails: { importantUnread: [], unreadCount: 0, dataSource: unavailable },
    meta: {
      lastRefreshed: now,
      activeIntegrationsCount: 0,
      alertsDismissed: [],
      isMockData: false,
      hermesLargelyUnreachable: true,
    },
    briefing: {
      available: false,
      generated_at: now,
      fresh: false,
      age_hours: 0,
      sections: [],
      highlights: {},
      raw_text: '',
      dataSource: unavailable,
    },
  };
}

export async function getDashboardData(): Promise<DashboardPayload> {
  try {
    // Every call below is caught individually so one bad Supabase read degrades only
    // its own section — not the whole dashboard. Each fallback is tagged
    // source: 'unavailable' so the UI's existing SourceBadge handling shows it as
    // degraded rather than silently rendering as if it were real.
    //
    // These now read from Supabase (populated by Hermes' own cron/refresh jobs)
    // instead of calling Hermes' REST API directly — plain Postgres reads, so they're
    // fast and don't depend on Hermes' host being up or idle. The one exception is
    // the briefing: Hermes currently writes briefing_snapshots.highlights as a flat
    // string array, not the {headline, blockers[], opportunities[]} shape the "What
    // Needs You Today" section needs, so that stays on Hermes' own /api/briefing
    // until the write shape is reconciled.
    const [cache, connections, teamPulse, strategic, revenue, decisions, flowly, briefing] =
      await Promise.all([
        getDashboardCacheFromSupabase().catch((e) => {
          console.warn('Supabase dashboard cache fetch failed, using empty fallback:', e);
          return {
            overview: { total_inbox: 0, active_tasks: 0, upcoming_events: 0, team_count: 0, today_events: 0, unread_inbox: 0, overdue_tasks: 0, today: '', high_priority_tasks: 0 },
            tasks: { tasks: [] },
            emails: { messages: [] },
            calendar: { events: [] },
            source: 'unavailable',
            from_cache: false,
          } as HermesDashboardCache;
        }),
        getConnectionsFromSupabase().catch((e) => {
          console.warn('Supabase connections fetch failed, using empty fallback:', e);
          return [] as HermesConnection[];
        }),
        getTeamPulseFromSupabase().catch((e) => {
          console.warn('Supabase team pulse fetch failed, using empty fallback:', e);
          return { members: [] as HermesTeamPulseMember[], source: 'unavailable', fetched_at: undefined, from_cache: false };
        }),
        getStrategicFromSupabase().catch((e) => {
          console.warn('Supabase strategic fetch failed, using empty fallback:', e);
          return { priorities: [] as HermesStrategicPriority[], source: 'unavailable', fetched_at: undefined, from_cache: false };
        }),
        getRevenueFromSupabase(30).catch((e) => {
          console.warn('Supabase revenue fetch failed, using empty fallback:', e);
          return {
            daily: 0, daily_trend: [], month_to_date: 0,
            month_target: 400000, month_pct: 0, departments: [],
            daily_source: { source: 'unavailable', fetched_at: new Date().toISOString(), from_cache: false },
            month_source: 'unavailable', source: 'unavailable',
            fetched_at: new Date().toISOString(), from_cache: false
          } as HermesRevenue;
        }),
        getDecisionsFromSupabase().catch((e) => {
          console.warn('Supabase decisions fetch failed, using empty fallback:', e);
          return { decisions: [] as HermesDecision[], source: 'unavailable', fetched_at: undefined, from_cache: false };
        }),
        getFlowlyFromSupabase().catch((e) => {
          console.warn('Supabase flowly fetch failed, using empty fallback:', e);
          return {
            mcp_connection: 'disconnected',
            funnels: { total: 0, published: 0, draft: 0, total_steps_across_funnels: 0, created_24h: 0, leads_captured_total: 0, source: 'unavailable' },
            recent_activity: {},
            dev_activity: {},
            task_backlog: { pending: 0, stale: 0, source: 'unavailable' },
            blockers: [] as string[],
          } as HermesFlowly;
        }),
        getBriefing().catch((e) => {
          console.warn('Briefing API failed, using fallback:', e);
          return {
            available: false,
            generated_at: new Date().toISOString(),
            fresh: false,
            age_hours: 0,
            sections: [],
            highlights: {},
            raw_text: ""
          } as HermesBriefing;
        }),
      ]);

    // Assignee resolution no longer needs a numeric-Asana-gid lookup: Hermes now
    // writes tasks_snapshots with `assignee` already resolved to a display name
    // (or "Unassigned"), so assigneeLabel()'s plain-string fallback handles it directly.
    const knownAssignees: Record<string, string> = {};
    const mappedConnections = mapConnections(connections);
    const connectionSources = mapConnectionSources(connections);
    const cacheSource = toDataSource(cache.source, cache.fetched_at, cache.from_cache);
    const tasks = mapTasks(cache.tasks.tasks, knownAssignees, cacheSource);
    const projects = mapProjects(cache.tasks.tasks, knownAssignees);

    const emails = mapEmails(
      cache.emails.messages,
      cache.overview.total_inbox ?? cache.emails.messages?.length ?? 0,
      cacheSource
    );
    const mappedTeamPulse = mapTeamPulse(
      teamPulse.members,
      cache.tasks.tasks,
      knownAssignees,
      toDataSource(teamPulse.source, teamPulse.fetched_at, teamPulse.from_cache),
      // rawMembers only ever fed a dead-code lookup inside mapTeamPulse (the result
      // was never read) — team_members rows already carry everything mapTeamPulse
      // needs (overdue_tasks, pending_tasks, tracked_in_asana, etc.) directly.
      []
    );
    const mappedFlowly = mapFlowly(flowly);
    const mappedStrategic = mapStrategic(
      strategic.priorities,
      toDataSource(strategic.source, strategic.fetched_at, strategic.from_cache),
      mappedFlowly.cro
    );
    const mappedRevenue = mapRevenue(revenue);
    const mappedDecisions = mapDecisions(
      decisions.decisions,
      toDataSource(decisions.source, decisions.fetched_at, decisions.from_cache)
    );

    // Hermes occasionally leaks the model's own generation preamble (e.g. "Now let me
    // compose the full briefing...") into the headline field instead of an actual summary.
    const isMetaCommentary = (text?: string): boolean =>
      !!text && /^(now\s+)?(let me|i'll|i will|here'?s?\b|ok(ay)?,)/i.test(text.trim());

    const cleanBriefingList = (list: string[] | undefined): string[] => {
      if (!list) return [];
      const instructionsPatterns = [
        /always surface/i,
        /then include/i,
        /as written in the file/i,
        /first in this section/i,
        /decisions\/asks pending/i,
        /what changed/i
      ];
      // Hermes splits the brief's prose into bullets without checking whether a bullet
      // is a negation, so "Blocked: None visible." arrives as blocker #2 and gets both
      // rendered and counted. An item that says there is nothing to report is not an
      // item — drop it before anything slices or counts the list.
      const negationPattern = /^(blocked|blockers?|risks?|issues?|concerns?)\s*:?\s*(none|no\b|nothing|n\/?a)/i;
      return list
        .map(item => item.replace(/^-\s*/, '').trim())
        .filter(item => {
          if (!item) return false;
          if (negationPattern.test(item)) return false;
          // Filter out prompt instructions
          return !instructionsPatterns.some(pat => pat.test(item));
        });
    };

    const cleanBriefingText = (text: string): string => {
      if (!text) return '';
      const lines = text.split('\n');
      const cleanedLines: string[] = [];
      let insidePrompt = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('## Prompt')) {
          insidePrompt = true;
          continue;
        }
        if (trimmed.startsWith('## Response')) {
          insidePrompt = false;
          continue;
        }
        if (insidePrompt) {
          continue;
        }

        if (trimmed.startsWith('[IMPORTANT:')) continue;
        if (line.includes('Always surface Deadlines/blockers first in this section')) continue;
        if (line.includes('include What changed and Decisions/asks pending John')) continue;

        cleanedLines.push(line);
      }

      return cleanedLines.join('\n');
    };

    const mappedBriefing: BriefingData = {
      available: briefing.available,
      generated_at: briefing.generated_at,
      fresh: briefing.fresh,
      age_hours: briefing.age_hours,
      sections: (briefing.sections || []).map((sec) => ({
        heading: sec.heading,
        body: cleanBriefingText(sec.body),
      })).filter((sec) => sec.heading.trim() !== '' && sec.body.trim() !== ''),
      highlights: {
        headline: isMetaCommentary(briefing.highlights?.headline) ? undefined : briefing.highlights?.headline,
        revenue: briefing.highlights?.revenue,
        decisions: briefing.highlights?.decisions,
        blockers: cleanBriefingList(briefing.highlights?.blockers),
        opportunities: cleanBriefingList(briefing.highlights?.opportunities),
      },
      raw_text: cleanBriefingText(briefing.raw_text || ""),
      dataSource: toDataSource(briefing.source, briefing.fetched_at, briefing.from_cache),
    };

    // Hermes now reports Calendar's own status explicitly (e.g. 'unavailable' with a
    // reason like "Calendar OAuth expired") rather than us having to infer it from
    // whether the cache happens to carry a `calendar` key.
    const calendarConnection = connections.find((c) => c.name.toLowerCase() === 'calendar');

    // Dynamic overview fields computed from sub-payloads when the direct keys are absent in cache.overview
    const overview: OverviewData = {
      inboxUnread: cache.overview.total_inbox ?? cache.overview.unread_inbox ?? cache.emails.messages?.length ?? 0,
      overdueTasks: tasks.overdue.length,
      todayEvents: cache.overview.today_events ?? 0,
      monthRevenue: mappedRevenue.monthToDate,
      monthTarget: mappedRevenue.monthTarget,
      lastUpdated: new Date().toISOString(),
      dailyBriefStatus: 'sent',
      connections: mappedConnections,
      calendarReason: calendarConnection?.reason,
      connectionSources,
    };

    // Hermes only populates `calendar.events` once Google Calendar OAuth is complete;
    // if the key is absent entirely, or the connections endpoint explicitly flags it
    // unavailable, treat it as not synced.
    const rawCalendar = cache.calendar as { events?: unknown[] } | undefined;
    // Hermes' cache holds events spanning many days (John's whole synced calendar
    // range), not just today — the dashboard shows Dubai time, so "today" is scoped
    // to that timezone rather than the server's local date.
    const todayDubai = dubaiDayKey();
    const calendar: CalendarData = {
      // Hermes' raw calendar events use summary/start/end/location, not title/time/duration —
      // drop anything without a summary (Hermes' cache carries blank placeholder entries too).
      //
      // Timed events carry a real UTC offset (observed live: a mix of +01:00 and +03:00,
      // never Dubai's +04:00), so both the day bucket and the displayed time are derived
      // from the parsed instant. Slicing characters out of the ISO string instead — the
      // previous approach — ignored the offset entirely and rendered whatever zone Hermes
      // happened to emit while labelling it Dubai time. All-day events have no offset to
      // resolve, so their date-only string is already the calendar day.
      events: dedupeCalendarEvents(
        (rawCalendar?.events || [])
          .filter((e: any) => {
            if (!e?.summary || typeof e.start !== 'string') return false;
            return e.start.includes('T')
              ? dubaiDayKey(e.start) === todayDubai
              : e.start.slice(0, 10) === todayDubai;
          })
          .map((e: any) => {
            const start: string = e.start || '';
            const end: string = e.end || '';
            const hasTime = start.includes('T');
            let duration = '';
            if (hasTime && end.includes('T')) {
              const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
              duration = mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`;
            }
            return {
              time: hasTime ? formatClock(start) : '',
              title: e.summary || '',
              duration,
              attendees: e.attendees || [],
              startsAt: hasTime ? new Date(start).toISOString() : '',
              endsAt: hasTime && end.includes('T') ? new Date(end).toISOString() : '',
            };
          })
      ).sort((a, b) => a.time.localeCompare(b.time)),
      synced: rawCalendar !== undefined && calendarConnection?.status !== 'unavailable',
      dataSource: cacheSource,
    };

    // Each of these independently reflects one of the .catch() fallbacks added above —
    // count how many *core* sections actually degraded rather than keying off a single
    // endpoint (connections can fail on its own while tasks/emails/calendar, which come
    // from a separate Hermes call, are perfectly fine — as observed live: a request that
    // had 57 real pending tasks and 5 real flagged emails still had an empty connections
    // list). Only treat the whole payload as cache-unworthy when most of these agree.
    const degradedCoreSections = [
      cache.source === 'unavailable',
      connections.length === 0,
      teamPulse.source === 'unavailable',
      strategic.source === 'unavailable',
      decisions.source === 'unavailable',
      flowly.funnels?.source === 'unavailable',
      mappedRevenue.dailyPending === true,
    ].filter(Boolean).length;

    return {
      overview,
      strategic: mappedStrategic,
      tasks,
      projects,
      revenue: mappedRevenue,
      teamPulse: mappedTeamPulse,
      flowly: mappedFlowly,
      decisions: mappedDecisions,
      calendar,
      emails,
      meta: {
        lastRefreshed: overview.lastUpdated,
        activeIntegrationsCount: connections.filter((c) => c.status === 'connected').length,
        alertsDismissed: [],
        isMockData: false,
        hermesLargelyUnreachable: degradedCoreSections >= 4,
      },
      briefing: mappedBriefing
    };
  } catch (err) {
    console.error('Dashboard data assembly failed; returning an empty unavailable payload:', err);
    return getUnavailableDashboardPayload();
  }
}

function assigneeLabel(gid: string | null, knownAssignees: Record<string, string>): string {
  if (!gid) return 'Unassigned';
  if (knownAssignees[gid]) return knownAssignees[gid];
  // Hermes doesn't always return a numeric Asana gid here — sometimes it's already
  // the assignee's name or team as plain text. Truncating that to its last 6
  // characters (the opaque-gid fallback) mangles real names, e.g. "Laura Gort" -> "a Gort".
  // Only fall back to the truncated form when the value actually looks like an opaque id.
  if (!/^\d+$/.test(gid)) {
    const trimmed = gid.trim();
    return /^unassigned$/i.test(trimmed) ? 'Unassigned' : trimmed;
  }
  return `gid-${gid.slice(-6)}`;
}

function toDataSource(source?: string, fetchedAt?: string, fromCache?: boolean): DataSource | undefined {
  if (!source) return undefined;
  return { source, fetchedAt, fromCache };
}

function mapConnectionSources(connections: HermesConnection[]): Record<string, DataSource> {
  const byName = (name: string) => connections.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const entries: [string, HermesConnection | undefined][] = [
    ['gmail', byName('Gmail')],
    ['asana', byName('Asana')],
    ['calendar', byName('Calendar')],
    ['slack', byName('Slack')],
    ['metaAds', byName('Meta Ads')],
    ['recallAi', byName('Recall.ai')],
  ];
  const sources: Record<string, DataSource> = {};
  for (const [key, conn] of entries) {
    const ds = toDataSource(conn?.source, conn?.fetched_at, conn?.from_cache);
    if (ds) sources[key] = ds;
  }
  return sources;
}

function mapConnections(connections: HermesConnection[]): ConnectionStatus {
  const byName = (name: string) => connections.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const status = (c: HermesConnection | undefined): ConnectionStatus['gmail'] => {
    if (!c) return 'disconnected';
    if (c.status === 'not_connected') return 'disconnected';
    return c.status as ConnectionStatus['gmail'];
  };
  return {
    gmail: status(byName('Gmail')),
    asana: status(byName('Asana')),
    calendar: status(byName('Calendar')),
    slack: status(byName('Slack')),
    metaAds: status(byName('Meta Ads')),
    recallAi: status(byName('Recall.ai')),
  };
}

function taskToItem(t: HermesTask, knownAssignees: Record<string, string>, today: string): TaskItem {
  return {
    name: t.name || '(untitled task)',
    due: t.due_on ?? '',
    assignee: assigneeLabel(t.assignee, knownAssignees),
    project: t.project ?? '',
    permalink: t.url ?? '',
    ...(t.due_on && t.due_on < today
      ? { daysOverdue: Math.round((Date.parse(today) - Date.parse(t.due_on)) / 86400000) }
      : {}),
  };
}

function mapTasks(tasks: HermesTask[], knownAssignees: Record<string, string>, dataSource?: DataSource): TasksData {
  const today = new Date().toISOString().slice(0, 10);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const incomplete = tasks.filter((t) => {
    if (t.completed) return false;
    // Filter out "test" tasks
    if (t.name && /test/i.test(t.name)) return false;
    // Filter out tasks older than 30 days
    if (t.due_on && t.due_on < thirtyDaysAgoStr) return false;
    return true;
  });

  const toItem = (t: HermesTask) => taskToItem(t, knownAssignees, today);

  const overdue = incomplete.filter((t) => t.due_on && t.due_on < today).map(toItem);
  const dueToday = incomplete.filter((t) => t.due_on === today).map(toItem);
  const noDueDate = incomplete.filter((t) => !t.due_on).length;

  const byAssignee: Record<string, number> = {};
  const bySection: Record<string, number> = {};
  for (const t of incomplete) {
    const label = assigneeLabel(t.assignee, knownAssignees);
    byAssignee[label] = (byAssignee[label] ?? 0) + 1;
    if (t.section) {
      bySection[t.section] = (bySection[t.section] ?? 0) + 1;
    }
  }

  return {
    overdue,
    dueToday,
    pending: incomplete.length,
    noDueDate,
    byAssignee,
    bySection,
    dataSource,
  };
}

function mapProjects(tasks: HermesTask[], knownAssignees: Record<string, string>): ProjectSummary[] {
  const today = new Date().toISOString().slice(0, 10);

  const byProject = new Map<string, HermesTask[]>();
  for (const t of tasks) {
    if (!t.project) continue;
    if (t.name && /test/i.test(t.name)) continue;
    const list = byProject.get(t.project) ?? [];
    list.push(t);
    byProject.set(t.project, list);
  }

  const summaries = [...byProject.entries()].map(([name, projectTasks]): ProjectSummary => {
    const doneTasks = projectTasks.filter((t) => t.completed).length;
    const totalTasks = projectTasks.length;

    const overdueTasks = projectTasks
      .filter((t) => !t.completed && t.due_on && t.due_on < today)
      .map((t) => taskToItem(t, knownAssignees, today))
      .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0))
      .slice(0, 5);

    const assigneeCounts: Record<string, number> = {};
    for (const t of projectTasks) {
      const label = assigneeLabel(t.assignee, knownAssignees);
      if (label === 'Unassigned') continue;
      assigneeCounts[label] = (assigneeCounts[label] ?? 0) + 1;
    }
    const owner = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const dueDates = projectTasks.map((t) => t.due_on).filter((d): d is string => !!d).sort();
    const latestDue = dueDates.length > 0 ? dueDates[dueDates.length - 1] : null;

    return {
      name,
      totalTasks,
      doneTasks,
      completionPct: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      overdueTasks,
      owner,
      latestDue,
    };
  });

  return summaries.sort(
    (a, b) => b.overdueTasks.length - a.overdueTasks.length || a.name.localeCompare(b.name)
  );
}

// Known spelling variants for the same real person, so they don't show up as two
// separate team members (e.g. Hermes' vault notes spell the founder's name both ways).
const TEAM_NAME_ALIASES: Record<string, string> = {
  'marissa peer': 'marisa peer',
};

function canonicalTeamName(name: string): string {
  const key = name.trim().toLowerCase();
  return TEAM_NAME_ALIASES[key] ?? key;
}

function dedupeTeamMembers(members: HermesTeamPulseMember[]): HermesTeamPulseMember[] {
  const byName = new Map<string, HermesTeamPulseMember>();
  const score = (x: HermesTeamPulseMember) => (x.email ? 2 : 0) + x.notes.length;

  // Contact entries (e.g. a raw phone number) leak into the vault's people list
  // sometimes — they aren't a team member, so drop them before deduping.
  const realMembers = members.filter((m) => !/^contact:/i.test(m.name.trim()));

  for (const m of realMembers) {
    const key = canonicalTeamName(m.name);
    const existing = byName.get(key);
    if (!existing || score(m) > score(existing)) byName.set(key, m);
  }

  const names = [...byName.keys()];
  for (const key of names) {
    const isPrefixOfAnother = names.some((other) => other !== key && other.startsWith(key + ' '));
    if (isPrefixOfAnother) byName.delete(key);
  }

  return [...byName.values()];
}

function mapTeamPulse(
  members: HermesTeamPulseMember[],
  asanaTasks: HermesTask[],
  knownAssignees: Record<string, string>,
  dataSource: DataSource | undefined,
  rawMembers: HermesTeamMember[]
): TeamPulseData {
  // John is the person reading this dashboard — he doesn't need to monitor his own
  // status, and including him skews the "needs attention" ratio. Filtered here rather
  // than per-component so the Overview tile and the Team page agree on the roster.
  const deduped = dedupeTeamMembers(members).filter((m) => !/^john\s+davy$/i.test(m.name.trim()));

  const overdueCounts: Record<string, number> = {};
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

  for (const t of asanaTasks) {
    if (t.completed) continue;
    if (t.name && /test/i.test(t.name)) continue;
    if (t.due_on && t.due_on < thirtyDaysAgoStr) continue;
    if (t.due_on && t.due_on < today) {
      const gid = t.assignee || 'unassigned';
      overdueCounts[gid] = (overdueCounts[gid] || 0) + 1;
    }
  }

  return {
    team: deduped.map((m) => {
      let overdueCount = 0;
      if (m.id && overdueCounts[m.id]) {
        overdueCount = overdueCounts[m.id];
      } else {
        const firstName = m.name.split(' ')[0].toLowerCase();
        const matchingGid = Object.keys(knownAssignees).find(
          (gid) => knownAssignees[gid].toLowerCase() === firstName
        );
        if (matchingGid && overdueCounts[matchingGid]) {
          overdueCount = overdueCounts[matchingGid];
        }
      }

      // Merge overdue_tasks and pending_tasks from raw members or the pulse payload
      const rawMember = rawMembers?.find(
        (rm) => rm.id === m.id || rm.name.toLowerCase() === m.name.toLowerCase()
      );
      
      const pending_tasks = m.pending_tasks ?? m.task_count ?? 0;
      const overdue_tasks = m.overdue_tasks ?? overdueCount;

      // Granular status ladder (replaces the old "everyone defaults to on_track
      // unless 5+ overdue" mapping, which made every member except the worst
      // offenders look identical): Hermes' own inactivity signal overrides task
      // counts, then overdue/pending volume buckets into Blocked/Slipping/Clear/On track.
      let status: TeamMember['status'] = 'on_track';
      let statusLabel = 'On track';

      if (m.status === 'inactive') {
        status = 'inactive';
        statusLabel = 'No recent activity';
      } else if (overdue_tasks >= 2 || pending_tasks >= 6) {
        status = 'critical';
        statusLabel = 'Blocked';
      } else if (overdue_tasks === 1 || (pending_tasks >= 3 && pending_tasks <= 5)) {
        status = 'warning';
        statusLabel = 'Slipping';
      } else if (overdue_tasks === 0 && pending_tasks === 0) {
        // Zero tasks means one of two very different things, and collapsing them into a
        // green-adjacent "Clear" put a positive label on ~17 of 22 people we have no
        // signal on at all. Hermes' `tracked_in_asana` is the authoritative answer:
        // someone absent from Asana isn't clear, we simply know nothing about them.
        // (This replaced a name-matching heuristic against the assignee map, which
        // produced false "Clear" labels for people who only looked like assignees.)
        const trackedInAsana = m.tracked_in_asana === true;
        status = trackedInAsana ? 'on_track' : 'unknown';
        // "No data" read like a dashboard/system failure. Most people in this state
        // simply aren't on Asana at all (contractors, agencies, people managed some
        // other way) — say that plainly instead of implying something is broken.
        statusLabel = trackedInAsana ? 'Clear' : 'Not in Asana';
      }

      return {
        name: m.name,
        role: m.role,
        status,
        statusLabel,
        notes: overdue_tasks > 0
          ? [`Has ${overdue_tasks} overdue task(s) in Asana`, ...m.notes]
          : m.notes.length > 0
          ? m.notes
          : status === 'unknown'
          ? ['Not tracked in Asana — no task data available for this person']
          : ['No flagged items'],
        overdueCount: overdue_tasks,
        pendingCount: pending_tasks,
        pending_tasks,
        overdue_tasks,
        daysSinceLastActivity: m.days_since_last_activity ?? null,
      };
    }),
    dataSource,
  };
}

function priorityStatusText(p: HermesStrategicPriority): string {
  if (p.note) return p.note.split('.')[0].replace(/^[↑↓→]\s*/, '').trim();
  return p.status;
}

// Hermes' /api/strategic endpoint sources Priority 1 from a Flowly session field that's
// currently returning 0 (and falls back to a hardcoded 10% when that happens) — the CRO
// data we already pull for the Flowly OS page is real and live, so use that instead.
function mapFlowlyLeadsPriority(p: HermesStrategicPriority, cro: CROData, deadline: string): StrategicPriority {
  const rangeDays = parseInt(cro.range, 10) || 7;
  const leads = cro.totals.leads30d;
  const prevLeads = cro.prevTotals.leads;
  const monthlyEstimate = Math.round(leads * (30 / rangeDays));
  const target = typeof p.target === 'number' ? p.target : 500000;
  const percentage = target > 0 ? Math.round((monthlyEstimate / target) * 100) : 0;

  let trend: StrategicPriority['trend'] = 'none';
  let trendText = '';
  if (prevLeads > 0) {
    const changePct = Math.round(((leads - prevLeads) / prevLeads) * 100);
    trend = changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';
    const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    trendText = `${arrow} ${Math.abs(changePct)}% vs prior ${rangeDays}d`;
  }

  const status: StrategicPriority['status'] =
    percentage >= 90 ? 'on_track' : percentage >= 50 ? 'warning' : 'behind';

  return {
    id: p.id,
    name: p.name,
    target,
    current: monthlyEstimate,
    percentage,
    trend,
    trendText,
    status,
    statusText: `${percentage}% of monthly target (est. from live Flowly CRO)`,
    metricLabel: 'leads/mo (est.)',
    additionalInfo: `Flowly CRO, last ${rangeDays}d: ${leads.toLocaleString()} leads, ${cro.totals.sales30d.toLocaleString()} sales, ${currencySymbol(cro.currency)}${cro.totals.revenue30d.toLocaleString(undefined, { maximumFractionDigits: 0 })} revenue, ROAS ${cro.totals.roas.toFixed(2)}x.`,
    deadline,
    owner: p.owner,
    relatedProject: p.related_project,
  };
}

function mapStrategic(priorities: HermesStrategicPriority[], dataSource?: DataSource, cro?: CROData | null): StrategicData {
  const deadlines: Record<number, string> = {
    1: '2026-08-31',
    2: '2026-09-30',
    3: '2026-09-30',
    4: '2026-07-31',
    5: '2026-08-15',
  };

  return {
    dataSource,
    priorities: priorities.map((p) => {
      if (p.id === 1 && cro) {
        return mapFlowlyLeadsPriority(p, cro, deadlines[p.id] || '');
      }

      const numericCurrent = typeof p.current === 'number' ? p.current : Math.round(p.pct);
      const numericTarget = typeof p.target === 'number' ? p.target : 100;
      const trendArrow = p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→';
      const milestoneText = p.milestones
        ? p.milestones
            .map((m) => `${m.name}: ${m.status.replace(/_/g, ' ')}${m.due ? ` (due ${m.due})` : ''}`)
            .join(' • ')
        : '';
      const extras = [
        p.revenue ? `Revenue: AED ${p.revenue.toLocaleString()}` : '',
        p.avg_price ? `Avg: AED ${p.avg_price.toLocaleString()}` : '',
        milestoneText,
      ]
        .filter(Boolean)
        .join(' • ');

      return {
        id: p.id,
        name: p.name,
        target: numericTarget,
        current: numericCurrent,
        percentage: Math.round(p.pct),
        trend: (['up', 'down', 'flat'].includes(p.trend) ? p.trend : 'none') as StrategicPriority['trend'],
        trendText: p.trend_pct != null ? `${trendArrow} ${p.trend_pct}%` : '',
        status: (['on_track', 'behind', 'warning', 'critical'].includes(p.status)
          ? p.status
          : 'warning') as StrategicPriority['status'],
        statusText: priorityStatusText(p),
        metricLabel: p.unit ?? '',
        additionalInfo: extras || (p.note ?? ''),
        deadline: deadlines[p.id] || '',
        owner: p.owner,
        relatedProject: p.related_project,
      };
    }),
  };
}

function mapRevenue(r: HermesRevenue): RevenueData {
  const trend = r.daily_trend && r.daily_trend.length > 0
    ? r.daily_trend
    : [{ date: new Date().toISOString().slice(0, 10), revenue: r.daily }];
  const last = trend[trend.length - 1].revenue;
  const prev = trend.length > 1 ? trend[trend.length - 2].revenue : last;
  const dailyTrend = prev ? Math.round(((last - prev) / prev) * 100) : 0;

  return {
    daily: r.daily,
    dailyTrend,
    monthToDate: r.month_to_date,
    monthTarget: r.month_target,
    monthPct: r.month_pct,
    departments: r.departments.map((d) => ({
      name: d.name,
      monthly: d.monthly,
      pctTarget: d.pct_target,
      trend: d.trend_pct != null ? Math.round(d.trend_pct) : 0,
      dataSource: toDataSource(d.source),
    })),
    daily7Day: trend.slice(-7).map((t) => t.revenue),
    daily7DayLabels: trend.slice(-7).map((t) => formatDate(t.date, { weekday: 'short' })),
    dailyTrendAll: trend.map((t) => ({ date: t.date, revenue: t.revenue })),
    dailySource: toDataSource(r.daily_source?.source, r.daily_source?.fetched_at, r.daily_source?.from_cache),
    monthSource: toDataSource(r.month_source, r.month_fetched_at, r.month_from_cache),
    overallSource: toDataSource(r.source, r.fetched_at, r.from_cache),
    dailyPending: r.daily_source?.source === 'timeout',
  };
}

function mapDecisions(decisions: HermesDecision[], dataSource?: DataSource): DecisionsData {
  const sourceType = (source: string): DecisionItem['sourceType'] => {
    const s = source.toLowerCase();
    if (s.includes('email') || s.includes('gmail')) return 'gmail';
    if (s.includes('whatsapp')) return 'whatsapp';
    if (s.includes('meeting') || s.includes('recall')) return 'recall';
    if (s.includes('calendar')) return 'calendar';
    return 'general';
  };
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const mapped = decisions.map((d) => ({
    date: d.date,
    displayText: d.description
      .replace(/^#+\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^[-*]\s*/, '')
      .replace(/\*+/g, '')
      .trim(),
    source: d.source,
    sourceType: sourceType(d.source),
    confidence: (['high', 'medium', 'low'].includes((d.confidence || '').toLowerCase())
      ? (d.confidence || '').toLowerCase()
      : undefined) as DecisionItem['confidence'],
    sourceRef: d.source_ref,
  }));

  return {
    decisions: mapped.filter((d) => !d.date || d.date >= sevenDaysAgoStr),
    allDecisions: mapped,
    dataSource,
  };
}

// Hermes now mixes source/fetched_at/from_cache metadata into these objects
// alongside the actual metrics — strip them out before turning entries into
// human-readable activity lines.
const HERMES_META_KEYS = new Set(['source', 'fetched_at', 'from_cache']);

function mapFlowly(f: HermesFlowly): FlowlyOSData {
  const asText = (v: string | number) => String(v);
  const dataEntries = (obj: Record<string, string | number> | undefined) =>
    Object.entries(obj || {}).filter(([k]) => !HERMES_META_KEYS.has(k));

  // Hermes's response caching layer doesn't always snapshot every section — dev_activity,
  // task_backlog, and blockers can be entirely absent even on a successful 200, so every
  // section here is treated as optional rather than assumed present.
  const funnels = f.funnels ?? { total: 0, published: 0, draft: 0, total_steps_across_funnels: 0, created_24h: 0, leads_captured_total: 0 };
  const taskBacklog = f.task_backlog;
  const blockers = Array.isArray(f.blockers) ? f.blockers : f.blockers?.items || [];
  const devActivityRaw = f.dev_activity ? {
    commits_48h: typeof f.dev_activity.commits_48h === 'number' ? f.dev_activity.commits_48h : undefined,
    prs_open: typeof f.dev_activity.prs_open === 'number' ? f.dev_activity.prs_open : undefined,
    last_codebase_snapshot: typeof f.dev_activity.last_codebase_snapshot === 'string' ? f.dev_activity.last_codebase_snapshot : undefined,
  } : undefined;

  return {
    funnelsActive: funnels.total,
    leadsCaptured: f.sessions?.["24h"]?.leads_captured ?? funnels.leads_captured_total,
    leadsCapturedAllTime: f.sessions?.all_time?.leads_captured ?? funnels.leads_captured_total,
    conversionRatePct: f.sessions?.["24h"]?.conversion_rate_pct ?? f.sessions?.all_time?.conversion_rate_pct ?? 0,
    recentActivity: [
      `${funnels.published} published, ${funnels.draft} draft (${funnels.total_steps_across_funnels} total steps)`,
      ...dataEntries(f.recent_activity).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${asText(v)}`),
    ],
    devActivity: dataEntries(f.dev_activity).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${asText(v)}`),
    taskBacklog: taskBacklog?.pending ?? 0,
    taskStale: taskBacklog?.stale ?? 0,
    blockers,
    leadsDailyTrend: (f.sessions?.daily_trend || []).map((t) => ({
      date: t.date,
      leadsCaptured: t.leads_captured,
      sessionsTotal: t.sessions_total,
      isReal: t.source !== 'unavailable',
    })),
    funnelsCreated24h: funnels.created_24h ?? 0,
    devActivityRaw,
    cro: mapCRO(f.cro, { fromCache: f.from_cache, timestamp: f.timestamp }),
    sources: {
      funnels: toDataSource(funnels.source, funnels.fetched_at, funnels.from_cache),
      sessions: toDataSource(f.sessions?.["24h"]?.source, f.sessions?.["24h"]?.fetched_at, f.sessions?.["24h"]?.from_cache),
      recentActivity: toDataSource(f.recent_activity?.source as string | undefined),
      devActivity: toDataSource(f.dev_activity?.source as string | undefined),
      taskBacklog: toDataSource(taskBacklog?.source, taskBacklog?.fetched_at, taskBacklog?.from_cache),
      blockers: Array.isArray(f.blockers) ? undefined : toDataSource(f.blockers?.source, f.blockers?.fetched_at, f.blockers?.from_cache),
    },
  };
}

function mapEmails(
  messages: import('./hermesClient').HermesEmail[],
  unreadCount: number,
  dataSource?: DataSource
): EmailsData {
  const isFlagged = (label: any): boolean => {
    if (!label) return false;
    if (typeof label === 'string') {
      return label.toUpperCase().includes('IMPORTANT') || label.toUpperCase().includes('FLAGGED');
    }
    if (Array.isArray(label)) {
      return label.some(l => typeof l === 'string' && (l.toUpperCase().includes('IMPORTANT') || l.toUpperCase().includes('FLAGGED')));
    }
    return false;
  };

  const filtered = (messages || [])
    .filter((m) => {
      if (!m) return false;
      const fromStr = m.from || '';
      const subjectStr = m.subject || '';
      
      if (/boomerang/i.test(fromStr) || /boomerang/i.test(subjectStr)) return false;
      if (/noreply|no-reply|auto-reply|autoreply/i.test(fromStr)) return false;
      if (/auto-reply|autoreply|^Auto:/i.test(subjectStr)) return false;
      
      return true;
    });

  const seenSubjects = new Set<string>();
  const uniqueEmails: typeof messages = [];
  for (const m of filtered) {
    const subKey = (m.subject || '').trim().toLowerCase().replace(/^re:\s*/i, '');
    if (!seenSubjects.has(subKey)) {
      seenSubjects.add(subKey);
      uniqueEmails.push(m);
    }
  }

  const slicedEmails = uniqueEmails.slice(0, 5);

  return {
    importantUnread: slicedEmails.map((m) => ({
      from: m.from,
      subject: m.subject,
      date: m.date,
      snippet: m.snippet,
      flagged: isFlagged(m.label),
    })),
    unreadCount,
    dataSource,
  };
}

// How long to wait for Hermes to actually finish a queued refresh before giving up
// and just showing whatever's currently in Supabase. Hermes' own cron jobs have been
// observed to take up to ~90s on a cold pull; this gives real margin above that
// without reintroducing the old ~240s blocking wait on a single Hermes HTTP call.
const REFRESH_JOB_TIMEOUT_MS = 90000;

export async function refreshAllData(): Promise<DashboardPayload> {
  // Enqueues 'tasks' and 'revenue' rows in Supabase's refresh_jobs table instead of
  // calling Hermes' /api/tasks/refresh or /api/revenue/refresh directly — those block
  // for up to 240s on a subprocess cron run and, observed live, can starve Hermes'
  // other endpoints while that runs. Hermes' own scheduler picks up queued rows and
  // does the slow work off this request entirely; we just poll Supabase (fast reads)
  // for completion, with a bounded wait rather than an open-ended blocking fetch.
  const refreshWarnings: string[] = [];
  try {
    const [tasksJobId, revenueJobId] = await Promise.all([
      enqueueRefreshJob('tasks'),
      enqueueRefreshJob('revenue'),
    ]);
    const [tasksResult, revenueResult] = await Promise.all([
      waitForRefreshJob(tasksJobId, REFRESH_JOB_TIMEOUT_MS),
      waitForRefreshJob(revenueJobId, REFRESH_JOB_TIMEOUT_MS),
    ]);
    if (!tasksResult) {
      refreshWarnings.push('Tasks refresh is still running in the background — showing the latest available data.');
    } else if (tasksResult.status === 'failed') {
      refreshWarnings.push(`Tasks refresh failed: ${tasksResult.error ?? 'unknown error'} — showing the latest available data.`);
    }
    if (!revenueResult) {
      refreshWarnings.push('Revenue refresh is still running in the background — showing the latest available data.');
    } else if (revenueResult.status === 'failed') {
      refreshWarnings.push(`Revenue refresh failed: ${revenueResult.error ?? 'unknown error'} — showing the latest available data.`);
    }
  } catch (e) {
    console.warn('Failed to enqueue/await refresh jobs:', e);
    refreshWarnings.push('Could not trigger a live refresh — showing the latest available data.');
  }
  const data = await getDashboardData();
  if (refreshWarnings.length) {
    data.meta.refreshWarnings = refreshWarnings;
  }
  return data;
}
