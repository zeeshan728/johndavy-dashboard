'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Sparkles,
  DollarSign,
  Target,
  Users,
  Rocket,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  Clock,
  Mail,
  ClipboardList,
  CircleCheckBig,
  TriangleAlert,
  OctagonAlert,
  UserRound,
  Megaphone,
  ChevronDown,
} from 'lucide-react';
import { DashboardPayload, materialChangePct } from '@/lib/dataService';
import { SectionId } from './Sidebar';
import { timeGreeting, formatTime, formatDate, dubaiDayKey, relativeTimeFrom, currencySymbol } from '@/lib/text';
import { useCountUp } from '@/lib/hooks';
import MeetingsList from './MeetingsList';
import ChartTooltip from './ChartTooltip';
import { button } from 'framer-motion/m';

interface OverviewStatsProps {
  data: DashboardPayload;
  onNavigate: (id: SectionId) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Unresolved Asana assignees come through as "gid-xxxxxx" — that's an internal ID,
// not something John needs to see. Drop it rather than show a raw fragment.
function cleanAssignee(assignee: string): string | null {
  if (!assignee || /^unassigned$/i.test(assignee) || assignee.startsWith('gid-')) return null;
  return assignee;
}

// Unresolved Asana projects sometimes come through as a raw numeric ID —
// an internal identifier, not a project name John would recognize.
function cleanProject(project: string): string | null {
  if (!project || /^\d+$/.test(project)) return null;
  return project;
}

// Asana task titles for build requests embed the customer's email address
// ("New Build: Diana Vogel, dianavogel@icloud.com"). That's a customer's personal
// data on a CEO dashboard and adds nothing to the task — strip it.
function stripEmails(name: string): string {
  return name
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')
    .replace(/[,;]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Email "from" headers can carry raw addresses (including forwarding/proxy addresses) —
// show just the sender's name.
function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+?)"?\s*<[^>]+>$/);
  return match ? match[1].trim() : from;
}

function formatCompact(n: number): string {
  if (n >= 1000000) return `${parseFloat((n / 1000000).toFixed(2))}M`;
  if (n >= 1000) return `${parseFloat((n / 1000).toFixed(1))}K`;
  return n.toLocaleString();
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 15.5;

function trendStrFor(trend: number): string {
  if (trend > 0) return `↑ ${trend}%`;
  if (trend < 0) return `↓ ${Math.abs(trend)}%`;
  return '—';
}

interface YourNextMovesProps {
  data: DashboardPayload;
  onNavigate: (id: SectionId) => void;
}

function YourNextMoves({
  data,
  onNavigate,
}: YourNextMovesProps) {
  const [showUpcomingMeetings, setShowUpcomingMeetings] = useState(false);
  const nowMinutes =
    new Date().getHours() * 60 + new Date().getMinutes();

  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);

    return Number.isFinite(hours)
      ? hours * 60 + (minutes || 0)
      : -1;
  };

  const upcomingEvents = [...(data.calendar?.events || [])]
    .filter(
      (event) =>
        event.title?.trim() &&
        parseTime(event.time) >= nowMinutes
    )
    .sort(
      (a, b) => parseTime(a.time) - parseTime(b.time)
    );

  const nextEvent = upcomingEvents[0];

  const overdueTask = data.tasks?.overdue?.[0];
  const overdueCount = data.tasks?.overdue?.length ?? 0;
  const dueTodayCount = data.tasks?.dueToday?.length ?? 0;

  const blockers = data.flowly?.blockers || [];
  const leadCount = data.flowly?.leadsCaptured ?? 0;

  const behindPriority = (
    data.strategic?.priorities || []
  ).find(
    (priority) =>
      priority.status === 'behind' ||
      priority.status === 'critical' ||
      priority.status === 'warning'
  );

  const focus = overdueTask
    ? {
        text: `Clear “${overdueTask.name}”`,
        section: 'priorities' as SectionId,
      }
    : blockers[0]
    ? {
        text: blockers[0],
        section: 'flowly' as SectionId,
      }
    : data.briefing?.highlights?.opportunities?.[0]
    ? {
        text: data.briefing.highlights.opportunities[0],
        section: 'brief' as SectionId,
      }
    : behindPriority
    ? {
        text: `${behindPriority.name} is ${behindPriority.statusText.toLowerCase()}`,
        section: 'priorities' as SectionId,
      }
    : null;

  const moves = [
    {
      label: 'Next up',
      value: nextEvent
        ? `${nextEvent.time} · ${nextEvent.title}`
        : 'No more meetings today',
      detail: nextEvent?.attendees?.length
        ? `${nextEvent.attendees.length} attendees`
        : 'Calendar clear',
      section: 'meetings' as SectionId,
      action: () => setShowUpcomingMeetings((visible) => !visible),
      icon: Calendar,
      tone: 'text-blue bg-blue/10',
    },
    {
      label: 'Needs attention',
      value:
        overdueCount > 0
          ? `${overdueCount} overdue task${
              overdueCount === 1 ? '' : 's'
            }`
          : 'Nothing overdue',
      detail:
        dueTodayCount > 0
          ? `${dueTodayCount} due today`
          : 'Backlog under control',
      section: 'priorities' as SectionId,
      icon:
        overdueCount > 0
          ? TriangleAlert
          : CircleCheckBig,
      tone:
        overdueCount > 0
          ? 'text-amber bg-amber/10'
          : 'text-green bg-green/10',
    },
    {
      label: 'Revenue pulse',
      value: `AED ${formatCompact(
        data.revenue?.daily ?? 0
      )} today`,
      detail: `${trendStrFor(
        data.revenue?.dailyTrend ?? 0
      )} vs yesterday`,
      section: 'revenue' as SectionId,
      icon: DollarSign,
      tone: 'text-gold bg-gold/10',
    },
    {
      label: 'Pipeline',
      value:
        leadCount > 0
          ? `${leadCount} new lead${
              leadCount === 1 ? '' : 's'
            }`
          : 'No new leads captured',
      detail:
        blockers.length > 0
          ? `${blockers.length} blocker${
              blockers.length === 1 ? '' : 's'
            }`
          : 'No active blockers',
      section: 'flowly' as SectionId,
      icon: Rocket,
      tone:
        blockers.length > 0
          ? 'text-amber bg-amber/10'
          : 'text-green bg-green/10',
    },
  ];

  return (
    <section
      className="space-y-3"
      aria-label="Your next moves"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
          Your next moves
        </h2>

        {focus && (
          <span className="text-[10px] font-medium text-amber">
            Focus recommended
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {moves.map(
          ({
            label,
            value,
            detail,
            section,
            action,
            icon: Icon,
            tone,
          }) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                action ? action() : onNavigate(section)
              }
              className="group min-w-0 rounded-xl border border-border-color bg-bg-secondary p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/30"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>

                <ArrowRight className="h-3.5 w-3.5 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-gold" />
              </div>

              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {label}
              </div>

              <div
                className="mt-1 truncate text-xs font-semibold text-text-primary"
                title={value}
              >
                {value}
              </div>

              <div
                className="mt-1 truncate text-[10px] text-text-secondary"
                title={detail}
              >
                {detail}
              </div>
            </button>
          )
        )}
      </div>

            {showUpcomingMeetings && (
        <div className="rounded-xl border border-blue/20 bg-blue/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-blue" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue">
                Upcoming meetings
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowUpcomingMeetings(false)}
              className="text-[10px] text-text-muted hover:text-text-primary"
            >
              Close
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="py-2 text-xs text-text-secondary">
              No upcoming meetings scheduled today.
            </p>
          ) : (
            <div className="space-y-1.5">
              {upcomingEvents.slice(0, 5).map((event, index) => (
                <div
                  key={`${event.time}-${event.title}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-border-color/60 bg-bg-secondary px-3 py-2"
                >
                  <span className="w-12 shrink-0 text-xs font-bold text-text-primary">
                    {event.time}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">
                    {event.title}
                  </span>

                  <span className="shrink-0 text-[10px] text-text-muted">
                    {event.duration}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate('meetings')}
            className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-blue hover:text-text-primary"
          >
            View meeting transcripts
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {focus && (
        <button
          type="button"
          onClick={() => onNavigate(focus.section)}
          className="flex w-full items-center gap-3 rounded-xl border border-amber/20 bg-amber/5 px-3 py-2.5 text-left transition-colors hover:border-amber/40"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber/10">
            <TriangleAlert className="h-3.5 w-3.5 text-amber" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber">
              CEO focus
            </span>

            <span className="mt-0.5 block truncate text-xs font-medium text-text-primary">
              {focus.text}
            </span>
          </span>

          <ArrowRight className="h-4 w-4 shrink-0 text-amber" />
        </button>
      )}
    </section>
  );
}

// Assigns each top-level block a stagger index for the mount-in animation defined in
// globals.css (.animate-fade-in-up reads --stagger as a CSS custom property).
function stagger(idx: number): React.CSSProperties {
  return { '--stagger': idx } as React.CSSProperties;
}

export default function OverviewStats({ data, onNavigate, onRefresh, isRefreshing }: OverviewStatsProps) {
  const priorities = data.strategic.priorities || [];
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [recentNotes, setRecentNotes] = useState<{ text: string; timestamp: string }[]>([]);
  const [healthHistory, setHealthHistory] = useState<{ date: string; score: number }[]>([]);

  useEffect(() => {
    const cachedNotes = localStorage.getItem('recentNotes');
    if (cachedNotes) {
      try {
        setRecentNotes(JSON.parse(cachedNotes));
      } catch (e) {
        console.error('Failed to parse cached notes', e);
      }
    }
  }, []);

  const saveNote = async () => {
    if (!noteInput.trim()) return;
    const newNote = { text: noteInput, timestamp: new Date().toISOString() };
    const updated = [newNote, ...recentNotes].slice(0, 5);
    setRecentNotes(updated);
    localStorage.setItem('recentNotes', JSON.stringify(updated));

    try {
      await fetch('/api/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteInput }),
      });
    } catch (e) {
      console.warn('Failed to post note to API:', e);
    }
    setNoteInput('');
  };
  const onTrackCount = priorities.filter((p) => p.status === 'on_track').length;

  const team = data.teamPulse?.team || [];
  const attentionCount = team.filter((m) => m.status === 'warning' || m.status === 'critical').length;

  const overdueTasks = data.tasks?.overdue || [];
  const dueTodayCount = data.tasks?.dueToday?.length ?? 0;
  // `pending` is the entire open backlog — it already includes overdue, due-today,
  // and no-due-date tasks — not a separate bucket sitting alongside them.
  const backlogPending = data.tasks?.pending ?? 0;
  const backlogNoDueDate = data.tasks?.noDueDate ?? 0;
  const dueLaterCount = Math.max(0, backlogPending - overdueTasks.length - dueTodayCount - backlogNoDueDate);
  const topAssignees = Object.entries(data.tasks?.byAssignee || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  // "Untitled section" is Asana bookkeeping for tasks nobody filed — it carries no
  // executive signal, so it shouldn't occupy a slot in the section breakdown.
  const topSections = Object.entries(data.tasks?.bySection || {})
    .filter(([name]) => !/^untitled section$/i.test(name.trim()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const flaggedEmails = data.emails?.importantUnread || [];
  const recentDecisions = (data.decisions?.decisions || []).slice(0, 3);
  const decisionsThisWeek = data.decisions?.decisions?.length ?? 0;

  // The briefing's "5. DEADLINES" section groups items under "Today (...)" / "Next 48
  // Extract today's actionable items from the deadlines section, which typically
  // starts with "Today: <content>" followed by multi-day entries. Also handles
  // bulleted items after the "Today" line.
  const todayDeadlineItems = (() => {
    const deadlineSection = data.briefing?.sections?.find((s) => /deadline/i.test(s.heading));
    if (!deadlineSection) return [] as string[];
    const lines = deadlineSection.body.split('\n');
    const todayStart = lines.findIndex((l) => /^today\b/i.test(l.trim()));
    if (todayStart === -1) return [] as string[];
    const items: string[] = [];
    // Extract the "Today: ..." line itself (colon format, not bulleted)
    const todayLine = lines[todayStart].trim().replace(/^today:\s*/i, '');
    if (todayLine) items.push(todayLine);
    // Also extract any bulleted items right after the Today line
    for (let i = todayStart + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) break;
      if (trimmed.startsWith('-')) items.push(trimmed.replace(/^-\s*/, ''));
    }
    return items;
  })();
  const todayMeetingItem = todayDeadlineItems.find((i) => /standup|meeting|call|sync/i.test(i));

  // Top Action promises "the one thing that matters", so it must resolve to exactly one
  // action or render nothing at all. The decision queue is the only section that carries
  // a real per-item action line; the previous heading regex matched nothing and fell
  // through to the deadlines section, whose first line is a prose re-listing of the very
  // calendar shown directly above it.
  const topAction = (() => {
    const queue = data.briefing?.sections?.find((s) => /decision queue/i.test(s.heading));
    if (!queue) return null;
    const lines = queue.body.split('\n').map((l) => l.trim());
    const suggested = lines.find((l) => /^suggested action\s*:/i.test(l));
    if (suggested) return suggested.replace(/^suggested action\s*:\s*/i, '').trim();
    const firstItem = lines.find((l) => /^-\s+\S/.test(l));
    return firstItem ? firstItem.replace(/^-\s*/, '').trim() : null;
  })();

  // The brief's blockers and opportunities are the sharpest content in the whole payload
  // and used to sit two clicks away, beneath a meeting list. This is that data sliced —
  // no extra fetching. Severity ordering: the lead blocker, then the next, then the top
  // opportunity.
  const briefHighlights = [
    ...(data.briefing?.highlights?.blockers ?? [])
      .slice(0, 2)
      .map((text, idx) => ({ text, tone: idx === 0 ? ('red' as const) : ('amber' as const) })),
    ...(data.briefing?.highlights?.opportunities ?? [])
      .slice(0, 1)
      .map((text) => ({ text, tone: 'green' as const })),
  ];

  // These bullets usually lead with their own label ("Biggest operational risk: …",
  // "Projects behind schedule: …") — pull it out so it can be rendered as a tag
  // instead of running into the sentence.
  const splitBulletLabel = (text: string): { label: string | null; body: string } => {
    const m = text.match(/^([^:]{3,45}):\s*([\s\S]+)$/);
    return m ? { label: m[1].trim(), body: m[2].trim() } : { label: null, body: text };
  };

  const highlightTone = {
    red: { dot: 'bg-red', chip: 'bg-red-500/12 text-red', edge: 'border-l-red-600' },
    amber: { dot: 'bg-amber', chip: 'bg-amber-500/15 text-amber-700', edge: 'border-l-amber-500' },
    green: { dot: 'bg-green', chip: 'bg-emerald-500/15 text-emerald-700', edge: 'border-l-emerald-500' },
  };

  // "On pace" means today's cumulative progress is at least where the elapsed share
  // of the period would predict — e.g. 15/30 days elapsed implies ~50% of target.
  // This replaces flat, target-blind thresholds (a fixed AED amount, a fixed lead
  // count) that had no relationship to what John is actually trying to hit.
  // Dubai's calendar day, not the viewer's — otherwise the elapsed-share pace target
  // (and the health score built on it) steps a day early or late depending on where
  // John happens to be sitting.
  const [dubaiYear, dubaiMonth, dayOfMonth] = dubaiDayKey().split('-').map(Number);
  const daysInMonth = new Date(dubaiYear, dubaiMonth, 0).getDate();
  const paceTargetPct = (dayOfMonth / daysInMonth) * 100;
  const paceStatus = (gapPts: number): 'green' | 'amber' | 'red' =>
    gapPts >= -5 ? 'green' : gapPts >= -15 ? 'amber' : 'red';

  const revenuePaceGap = (data.revenue?.monthPct ?? 0) - paceTargetPct;
  // A timed-out revenue fetch reads as AED 0 upstream — that's an infra hiccup, not
  // a revenue crisis, so it's shown as "syncing" rather than scored red/green.
  const revenueStatus: 'green' | 'amber' | 'red' = data.revenue?.dailyPending ? 'amber' : paceStatus(revenuePaceGap);

  // An empty priorities/team array here means that section's Hermes call failed (see
  // degradedCoreSections in dataService.ts) — normally there are always 5 priorities
  // and ~22 team members, never zero. "0 bad out of 0" must not read as a clean "all
  // on track" green, since that's a data gap, not a real all-clear.
  const badPriorities = priorities.filter(p => p.status === 'warning' || p.status === 'behind').length;
  const prioritiesStatus: 'green' | 'amber' | 'red' =
    priorities.length === 0 ? 'amber' : badPriorities === 0 ? 'green' : badPriorities <= 2 ? 'amber' : 'red';
  const teamStatus: 'green' | 'amber' | 'red' =
    team.length === 0 ? 'amber' : attentionCount === 0 ? 'green' : attentionCount <= 2 ? 'amber' : 'red';
  const teamStatusLabel =
    team.length === 0 ? 'Data unavailable' : teamStatus === 'green' ? 'On track' : teamStatus === 'amber' ? 'Needs attention' : 'Multiple flags';

  const leads24h = data.flowly?.leadsCaptured ?? 0;
  // Priority 1 (500K leads/month) already carries a real monthly-target percentage —
  // pace the pipeline signal off that instead of an arbitrary flat lead count.
  const leadsPriority = priorities.find((p) => p.id === 1);
  const pipelinePaceGap = leadsPriority ? leadsPriority.percentage - paceTargetPct : null;
  const pipelineStatus: 'green' | 'amber' | 'red' =
    pipelinePaceGap != null ? paceStatus(pipelinePaceGap) : leads24h === 0 ? 'red' : leads24h < 5 ? 'amber' : 'green';
  const pipelineLabel =
    pipelinePaceGap != null
      ? pipelineStatus === 'green' ? 'On pace' : pipelineStatus === 'amber' ? 'Behind pace' : 'Off pace'
      : pipelineStatus === 'green' ? 'Flowing' : pipelineStatus === 'amber' ? 'Slowing' : 'Stalled';
  const trendClass = (data.revenue?.dailyTrend || 0) >= 0 ? 'text-green' : 'text-red';
  const trendStr =
    (data.revenue?.dailyTrend || 0) > 0
      ? `↑ ${data.revenue.dailyTrend}%`
      : (data.revenue?.dailyTrend || 0) < 0
      ? `↓ ${Math.abs(data.revenue.dailyTrend)}%`
      : '—';

  const overallStatus = [revenueStatus, teamStatus, prioritiesStatus, pipelineStatus].includes('red')
    ? 'red'
    : [revenueStatus, teamStatus, prioritiesStatus, pipelineStatus].includes('amber')
    ? 'amber'
    : 'green';

  // Revenue's Supabase sync can silently stop writing new rows — the raw read just
  // returns whatever the latest row is, with no signal that it isn't actually today.
  // Surfacing that here explains why the score can look "stuck": it's recomputing
  // correctly every render, but the same stale upstream figure feeds it each time.
  const revenueTrendAll = data.revenue?.dailyTrendAll || [];
  const latestRevenueDate = revenueTrendAll.length > 0 ? revenueTrendAll[revenueTrendAll.length - 1].date : null;
  const isRevenueStale = !!latestRevenueDate && latestRevenueDate < dubaiDayKey();

  // One line per criterion explaining *why* it's not green, so the score reads as
  // "here's what's actually wrong" instead of a number with no context.
  type HealthCategory = { key: string; label: string; status: 'green' | 'amber' | 'red'; reason: string };
  const healthCategories: HealthCategory[] = [
    {
      key: 'revenue',
      label: 'Revenue',
      status: revenueStatus,
      reason: data.revenue?.dailyPending
        ? 'sync pending'
        : isRevenueStale && latestRevenueDate
        ? `data as of ${formatDate(latestRevenueDate)}`
        : revenueStatus !== 'green'
        ? `${Math.max(0, Math.round(paceTargetPct - (data.revenue?.monthPct ?? 0)))}pt behind pace`
        : 'on pace',
    },
    {
      key: 'team',
      label: 'Team',
      status: teamStatus,
      reason:
        team.length === 0
          ? 'data unavailable'
          : teamStatus !== 'green'
          ? `${attentionCount} flagged`
          : 'all clear',
    },
    {
      key: 'priorities',
      label: 'Priorities',
      status: prioritiesStatus,
      reason:
        priorities.length === 0
          ? 'data unavailable'
          : prioritiesStatus !== 'green'
          ? `${badPriorities} off track`
          : 'on track',
    },
    {
      key: 'pipeline',
      label: 'Pipeline',
      status: pipelineStatus,
      reason: pipelineStatus !== 'green' ? pipelineLabel.toLowerCase() : 'flowing',
    },
  ];
  const statusRank: Record<'red' | 'amber' | 'green', number> = { red: 0, amber: 1, green: 2 };
  const activeBlockers = healthCategories.filter((c) => c.status !== 'green').sort((a, b) => statusRank[a.status] - statusRank[b.status]);
  const blockerSummary =
    activeBlockers.length === 0
      ? 'All four signals are healthy — nothing needs attention right now.'
      : `Held back by ${activeBlockers.map((c) => `${c.label} (${c.reason})`).join(', ')}.`;

  // The freshest a score number can ever look is only as fresh as its slowest input —
  // show that age directly, so "the number never changes" reads as "the source data
  // hasn't updated" rather than "this card is broken."
  const sourceFetchTimes = [
    data.revenue?.dailySource?.fetchedAt,
    data.teamPulse?.dataSource?.fetchedAt,
    data.strategic?.dataSource?.fetchedAt,
  ].filter((t): t is string => !!t);
  const oldestSourceFetchedAt = sourceFetchTimes.length
    ? sourceFetchTimes.reduce((oldest, t) => (new Date(t).getTime() < new Date(oldest).getTime() ? t : oldest))
    : undefined;

  const statusColorMap = {
    green: 'border-green-500/25',
    amber: 'border-amber/30',
    red: 'border-red-500/30',
  };

  const statusWashMap = {
    green: 'from-emerald-500/14 via-emerald-500/4 to-transparent',
    amber: 'from-amber-500/16 via-amber-500/5 to-transparent',
    red: 'from-red-500/16 via-red-500/5 to-transparent',
  };

  const statusLabelMap = {
    green: 'All Systems Optimal',
    amber: 'Action Recommended',
    red: 'Operational Risk: Action Required',
  };

  const StatusIcon = { green: CircleCheckBig, amber: TriangleAlert, red: OctagonAlert }[overallStatus];
  const statusRingHex = { green: 'var(--accent-green)', amber: 'var(--accent-amber)', red: 'var(--accent-red)' }[overallStatus];
  const scoreOf = (s: 'green' | 'amber' | 'red') => (s === 'green' ? 100 : s === 'amber' ? 55 : 15);
  const healthScore = Math.round(
    (scoreOf(revenueStatus) + scoreOf(teamStatus) + scoreOf(prioritiesStatus) + scoreOf(pipelineStatus)) / 4
  );
  const healthScoreDisplay = useCountUp(healthScore);
  const healthRingOffset = RING_CIRCUMFERENCE - (healthScore / 100) * RING_CIRCUMFERENCE;

  // Local (per-browser) trend of the health score — one point per day, last 30 days —
  // so "72" reads as "up from 60 a week ago" instead of only a point-in-time snapshot.
  useEffect(() => {
    const key = 'healthScoreHistory';
    let history: { date: string; score: number }[] = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) history = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse cached health score history', e);
    }
    const todayKey = dubaiDayKey();
    const idx = history.findIndex((h) => h.date === todayKey);
    if (idx >= 0) history[idx] = { date: todayKey, score: healthScore };
    else history.push({ date: todayKey, score: healthScore });
    history = history.slice(-30);
    localStorage.setItem(key, JSON.stringify(history));
    setHealthHistory(history);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthScore]);

  const monthPct = Math.max(0, Math.min(100, data.revenue?.monthPct ?? 0));
  const monthRingOffset = RING_CIRCUMFERENCE - (monthPct / 100) * RING_CIRCUMFERENCE;
  const priorityRatio = priorities.length ? (onTrackCount / priorities.length) * 100 : 0;
  const teamRatio = team.length ? ((team.length - attentionCount) / team.length) * 100 : 0;
  const topDepartments = [...(data.revenue?.departments || [])]
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 3);
  const maxDeptMonthly = Math.max(...topDepartments.map((d) => d.monthly), 1);
  const topCROFunnel = [...(data.flowly?.cro?.byFunnel || [])].sort((a, b) => b.revenue - a.revenue)[0];
  const cro = data.flowly?.cro;
  const croRevenueChangePct = cro ? materialChangePct(cro.totals.revenue30d, cro.prevTotals.revenue) : null;
  const croAdLoss = cro && cro.totals.roas < 1 ? cro.totals.spend30d - cro.totals.revenue30d : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero: greeting + composite health ring, asymmetric bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-1 items-stretch animate-fade-in-up" style={stagger(0)}>
        <div className="lg:col-span-8 flex flex-col justify-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            {formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <h1 className="font-serif text-2xl sm:text-[34px] font-semibold text-text-primary leading-tight">
            {timeGreeting('John')}
          </h1>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green"></span>
            </span>
            Synced {formatTime(data.overview.lastUpdated)}
          </span>

                    <div className="mt-4">
            <YourNextMoves
              data={data}
              onNavigate={onNavigate}
            />
          </div>
        </div>

        <button
          onClick={() => setStatusExpanded(!statusExpanded)}
          className={`lg:col-span-4 relative overflow-hidden border rounded-2xl p-4 flex flex-col gap-3 text-left transition-all duration-300 glass-card cursor-pointer select-none hover:border-gold/40 ${statusColorMap[overallStatus]}`}
        >
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${statusWashMap[overallStatus]}`} />
          <div className="relative flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke={statusRingHex}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={healthRingOffset}
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-primary tabular-nums">
                {healthScoreDisplay}
              </div>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-[10px] tracking-wider uppercase text-text-muted">Business Health</div>
              <div className="font-serif text-base font-semibold text-text-primary mt-0.5 leading-snug">
                {statusLabelMap[overallStatus]}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 ml-auto transition-transform ${statusExpanded ? 'rotate-180' : ''}`} />
          </div>

          {/* Segmented composition bar — Revenue / Team / Priorities / Pipeline at a
              glance, in the same order as the rows below, so the score's "why" is
              visible without expanding anything. */}
          <div className="relative flex items-center gap-1" title={healthCategories.map((c) => `${c.label}: ${c.reason}`).join(' · ')}>
            {healthCategories.map((c) => (
              <div
                key={c.key}
                className={`h-1.5 flex-1 rounded-full ${c.status === 'green' ? 'bg-green' : c.status === 'amber' ? 'bg-amber' : 'bg-red'}`}
              />
            ))}
          </div>

          {/* The single sentence explaining what's actually driving the score — the
              same real inputs recompute every render, so a low score that repeats
              day over day is this sentence staying the same because the underlying
              problem hasn't changed, not the card being frozen. */}
          <p className="relative text-[11px] text-text-secondary leading-snug">{blockerSummary}</p>

          {/* Health score trend — last 14 days, one point per day, stored locally in this browser */}
          {healthHistory.length > 1 && (() => {
            const points = healthHistory.slice(-14);
            const weekAgo = points.length >= 8 ? points[points.length - 8].score : points[0].score;
            const delta = healthScore - weekAgo;
            return (
              <div className="relative flex items-center gap-2">
                <svg viewBox="0 0 100 20" className="w-16 h-5 shrink-0" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke={statusRingHex}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    points={points
                      .map((h, idx) => {
                        const x = points.length > 1 ? (idx / (points.length - 1)) * 100 : 0;
                        const y = 19 - (h.score / 100) * 18;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
                <span className="text-[10px] text-text-muted">
                  {delta === 0 ? 'Flat' : delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`} vs 7d ago
                </span>
              </div>
            );
          })()}

          {/* Compact criteria breakdown */}
          {/* Always one column. This sits inside the 4-of-12 hero card, so even at xl the
              two columns were only ~141px each and still cut "Team Needs atten…" and
              "Pipeline Off p…" — the container is narrow at every breakpoint, not just
              tablet. One column gives each label its full width. */}
          <div className="relative grid grid-cols-1 gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/70 border border-border-color rounded-lg text-[11px] min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${revenueStatus === 'green' ? 'bg-green' : revenueStatus === 'amber' ? 'bg-amber' : 'bg-red'}`}></span>
              <span className="text-text-muted shrink-0">Revenue</span>
              <span className="font-semibold text-text-primary ml-auto tabular-nums">
                {data.revenue?.dailyPending ? 'Syncing…' : `AED ${formatCompact(data.revenue?.daily ?? 0)}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/70 border border-border-color rounded-lg text-[11px] min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${teamStatus === 'green' ? 'bg-green' : teamStatus === 'amber' ? 'bg-amber' : 'bg-red'}`}></span>
              <span className="text-text-muted shrink-0">Team</span>
              <span className="font-semibold text-text-primary ml-auto">{teamStatusLabel}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/70 border border-border-color rounded-lg text-[11px] min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${prioritiesStatus === 'green' ? 'bg-green' : prioritiesStatus === 'amber' ? 'bg-amber' : 'bg-red'}`}></span>
              <span className="text-text-muted shrink-0">Priorities</span>
              <span className="font-semibold text-text-primary ml-auto">
                {priorities.length === 0
                  ? 'Data unavailable'
                  : prioritiesStatus === 'green' ? 'On track' : prioritiesStatus === 'amber' ? 'Needs pace' : 'Critical'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-secondary/70 border border-border-color rounded-lg text-[11px] min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pipelineStatus === 'green' ? 'bg-green' : pipelineStatus === 'amber' ? 'bg-amber' : 'bg-red'}`}></span>
              <span className="text-text-muted shrink-0">Pipeline</span>
              <span className="font-semibold text-text-primary ml-auto">{pipelineLabel}</span>
            </div>
          </div>

          {oldestSourceFetchedAt && (
            <span className="relative text-[10px] text-text-muted/80">
              Data last synced {relativeTimeFrom(oldestSourceFetchedAt)}
            </span>
          )}
        </button>
      </div>

      {/* Expandable detailed breakdown */}
      {statusExpanded && (
        <div className="rounded-2xl border border-border-color bg-bg-secondary p-4 animate-fade-in-up">
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2.5">Detailed Breakdown</h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {(() => {
              const details: { icon: React.ElementType; text: string }[] = [];

              if (data.revenue?.dailyPending) {
                details.push({ icon: DollarSign, text: "Revenue sync hasn't returned yet — target pace unknown for now" });
              } else if (data.revenue) {
                details.push(
                  data.revenue.monthPct < paceTargetPct
                    ? { icon: DollarSign, text: `Revenue at ${data.revenue.monthPct}% of monthly target (day ${dayOfMonth} of ${daysInMonth} — behind target pace of ~${Math.round(paceTargetPct)}%)` }
                    : { icon: DollarSign, text: `Revenue at ${data.revenue.monthPct}% of monthly target (on track)` }
                );
              }

              const metaStatus = data.overview.connections.metaAds;
              details.push(
                metaStatus === 'blocked' || metaStatus === 'disconnected' || metaStatus === 'unavailable'
                  ? { icon: Megaphone, text: 'Ad campaigns are paused — worth a check-in with marketing' }
                  : { icon: CircleCheckBig, text: 'Ad campaigns running normally' }
              );

              const calStatus = data.overview.connections.calendar;
              details.push(
                calStatus === 'disconnected' || calStatus === 'unavailable'
                  ? { icon: Calendar, text: "Calendar isn't up to date — some meetings may be missing" }
                  : { icon: Calendar, text: 'Calendar up to date' }
              );

              const overdueC = data.tasks?.overdue?.length ?? 0;
              details.push(
                overdueC > 0
                  ? { icon: UserRound, text: `${overdueC} personal task${overdueC > 1 ? 's' : ''} overdue` }
                  : { icon: UserRound, text: 'Zero overdue tasks' }
              );

              return details.map(({ icon: Icon, text }, idx) => (
                <li key={idx} className="flex items-center gap-2.5 bg-bg-card border border-border-color/50 px-3.5 py-2.5 rounded-xl text-text-secondary">
                  <Icon className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span>{text}</span>
                </li>
              ));
            })()}
          </ul>
        </div>
      )}

      {/* What the brief found — the highest-signal content in the payload, promoted out
          of the Morning Brief accordion to the top of the Overview. */}
      {briefHighlights.length > 0 && (
        <button
          onClick={() => onNavigate('brief')}
          className="group text-left bg-bg-secondary border border-border-color hover:border-gold/30 rounded-2xl p-5 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col gap-3.5 w-full animate-fade-in-up"
          style={stagger(1)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                <TriangleAlert className="w-3.5 h-3.5 text-gold" />
              </div>
              <h3 className="text-xs font-semibold text-gold tracking-wide uppercase">What Needs You Today</h3>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-gold transition-colors" />
          </div>
          <ul className="flex flex-col gap-2.5">
            {briefHighlights.map(({ text, tone }, idx) => {
              const { label, body } = splitBulletLabel(text);
              return (
                <li
                  key={idx}
                  className={`bg-bg-card border border-border-color/70 border-l-4 ${highlightTone[tone].edge} rounded-xl px-3.5 py-2.5 flex flex-col gap-1`}
                >
                  {label && (
                    <span className={`self-start text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${highlightTone[tone].chip}`}>
                      {label}
                    </span>
                  )}
                  <span className="text-xs text-text-secondary leading-relaxed">{body}</span>
                </li>
              );
            })}
          </ul>
        </button>
      )}

      {/* Full-width teaser: Morning Brief — the daily narrative digest, read first */}
      <button
        onClick={() => onNavigate('brief')}
        className="group relative overflow-hidden text-left glass-card hover:border-gold/30 rounded-2xl p-6 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up"
        style={stagger(2)}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/[0.08] via-transparent to-transparent" />
        <div className="relative flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gold tracking-wide uppercase">AI Morning Brief</span>
            </div>
            <h3 className="font-serif text-xl font-medium text-text-primary leading-snug mt-1">{timeGreeting('John Davy')}</h3>
            <p className="text-sm text-text-secondary mt-1.5 leading-relaxed max-w-2xl">
              {data.briefing?.available && data.briefing.highlights?.headline
                ? data.briefing.highlights.headline
                : 'Your RTT® business snapshot — global enrolments, cohort progress, and brand momentum are ready to review.'}
            </p>
          </div>
        </div>
        <span className="relative flex items-center gap-1.5 text-sm font-semibold text-gold group-hover:text-text-primary transition-colors shrink-0">
          Read Morning Brief <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </span>
      </button>

      {/* Needs attention today: agenda snapshot, sign-off, inbox — the actionable items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in-up" style={stagger(3)}>
        {/* Today's Agenda (compact) */}
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-5 shadow-sm gold-glow-hover flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
            </div>
            <h3 className="text-xs font-semibold text-gold tracking-wide uppercase">Today&apos;s Agenda</h3>
          </div>
          {!data.briefing?.available ? (
            <div className="py-4 flex flex-col items-center justify-center text-center gap-3">
              <span className="text-text-muted text-xs">Morning Brief not yet generated</span>
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 bg-gold hover:bg-gold/90 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {isRefreshing ? 'Generating...' : 'Generate Brief'}
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              <li className="text-sm">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Meetings{data.calendar?.events?.length ? ` (${data.calendar.events.length})` : ''}
                </div>
                {data.calendar?.events?.length ? (
                  <MeetingsList events={data.calendar.events} />
                ) : (
                  <div className="font-medium text-text-primary truncate">
                    {(() => {
                      const meetingsSection = data.briefing?.sections?.find((s) => /meeting|calendar/i.test(s.heading));
                      if (meetingsSection) return meetingsSection.body.split('\n')[0].replace(/^[-*•]\s*/, '').trim();
                      return todayMeetingItem ?? 'No meeting details in today’s briefing';
                    })()}
                  </div>
                )}
              </li>
              {topAction && (
                <li className="text-sm">
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Top Action</div>
                  <div className="font-medium text-text-primary">{topAction}</div>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Needs Your Sign-off */}
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-5 shadow-sm gold-glow-hover flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber" />
            </div>
            {/* These are other people's overdue build tasks, not items awaiting John's
                signature — the old "Needs Your Sign-off" label claimed authority over
                them that the underlying Asana data doesn't support. */}
            <h3 className="text-xs font-semibold text-gold tracking-wide uppercase">Overdue Across the Team</h3>
          </div>
          {overdueTasks.length > 0 ? (
            <ul className="space-y-2.5">
              {overdueTasks.slice(0, 4).map((t, idx) => {
                const assignee = cleanAssignee(t.assignee);
                const project = cleanProject(t.project);
                const content = (
                  <>
                    <div className="min-w-0">
                      <div className={`font-medium text-text-primary truncate ${t.permalink ? 'group-hover:underline' : ''}`}>{stripEmails(t.name)}</div>
                      <div className="text-xs text-text-muted truncate">
                        {[assignee, project].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {t.daysOverdue ? (
                      <span className="text-xs font-semibold text-red shrink-0">{t.daysOverdue}d late</span>
                    ) : null}
                  </>
                );
                return t.permalink ? (
                  <li key={idx}>
                    <a
                      href={t.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start justify-between gap-3 text-sm"
                    >
                      {content}
                    </a>
                  </li>
                ) : (
                  <li key={idx} className="flex items-start justify-between gap-3 text-sm">
                    {content}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">Nothing overdue — nice work.</p>
          )}
        </div>

        {/* Inbox Highlights */}
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-5 shadow-sm gold-glow-hover flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue/10 flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5 text-blue" />
            </div>
            <h3 className="text-xs font-semibold text-gold tracking-wide uppercase">Inbox Highlights</h3>
          </div>
          {flaggedEmails.length > 0 ? (
            <ul className="space-y-2.5">
              {flaggedEmails.slice(0, 3).map((e, idx) => (
                <li key={idx} className="text-sm">
                  <div className="font-medium text-text-primary truncate">{e.subject}</div>
                  <div className="text-xs text-text-muted truncate">{senderName(e.from)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No flagged emails right now.</p>
          )}
        </div>
      </div>

      {/* Financial snapshot: revenue hero + cash flow, asymmetric 8/4 split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch animate-fade-in-up" style={stagger(4)}>
        {/* Revenue tile (Hero Card) */}
        <button
          onClick={() => onNavigate('revenue')}
          className="lg:col-span-12 group relative overflow-hidden text-left glass-card hover:border-gold/30 rounded-2xl p-6 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col gap-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/[0.07] via-transparent to-transparent" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
            <div className="flex-1 flex flex-col justify-between h-full min-h-[90px]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-gold" />
                </div>
                <span className="text-xs font-bold text-gold uppercase tracking-wider">Revenue Pulse</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-medium text-text-muted">Today&apos;s Revenue (Emirates NBD)</span>
                {data.revenue?.dailyPending ? (
                  <div className="text-3xl font-serif font-bold text-text-muted mt-1">Syncing…</div>
                ) : (
                  <div className="text-3xl font-serif font-bold text-text-primary mt-1 flex flex-wrap items-baseline gap-2 tabular-nums">
                    AED {data.revenue?.daily?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className={`text-xs font-semibold ${trendClass}`}>{trendStr}</span>
                  </div>
                )}
                <span className="text-[10px] text-text-muted mt-1 block">
                  {data.revenue?.dailyPending ? "Hermes revenue sync hasn't returned yet — not a real AED 0" : 'Figures are estimated'}
                </span>
              </div>
            </div>

            {/* Revenue trend — real Recharts area chart over Hermes' full history */}
            <div className="relative shrink-0 w-full sm:w-64">
              {/* A pending/timed-out revenue fetch collapses the trend to a single [0]
                  point — a one-point chart is meaningless, so show an explicit
                  placeholder instead. */}
              {data.revenue?.dailyPending || (data.revenue?.dailyTrendAll?.length ?? 0) < 2 ? (
                <div className="w-full h-20 flex items-center justify-center text-[10px] text-text-muted border border-dashed border-border-color rounded-lg">
                  No trend data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={data.revenue.dailyTrendAll} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="overview-revenue-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <ChartTooltip
                          active={active}
                          label={typeof label === 'string' ? formatDate(label, { day: 'numeric', month: 'short' }) : undefined}
                          payload={payload?.map((p) => ({ name: 'Revenue', value: p.value as number, color: 'var(--accent-gold)' }))}
                          formatValue={(v) => `AED ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="var(--accent-gold)"
                      strokeWidth={2}
                      fill="url(#overview-revenue-grad)"
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Revenue by department breakdown */}
          {topDepartments.length > 0 && (
            <div className="relative border-t border-border-color/70 pt-4 flex flex-col gap-2.5">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Top Departments (MTD)</span>
              {topDepartments.map((dept) => (
                <div key={dept.name} className="flex items-center gap-3 text-xs">
                  <span className="w-28 sm:w-36 shrink-0 truncate text-text-secondary font-medium">{dept.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-bg-primary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gold/70 transition-all duration-500"
                      style={{ width: `${(dept.monthly / maxDeptMonthly) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right font-semibold text-text-primary tabular-nums">AED {formatCompact(dept.monthly)}</span>
                </div>
              ))}
            </div>
          )}
        </button>
      </div>

      {/* Even bento row: MTD, Priorities, Team, Decisions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={stagger(5)}>
        {/* MTD tile */}
        <button
          onClick={() => onNavigate('revenue')}
          className="group text-left bg-bg-secondary border border-border-color hover:border-gold/30 rounded-2xl p-5 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col justify-between"
        >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-600" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-gold transition-colors" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0">
                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--accent-green)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={monthRingOffset}
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </svg>
              </div>
              <div>
                <span className="text-xs font-medium text-text-muted block">Toward Monthly Target</span>
                {data.revenue?.dailyPending ? (
                  <>
                    <div className="text-xl font-bold text-text-muted mt-0.5">—</div>
                    <span className="text-[10px] text-text-muted mt-0.5 block">Revenue sync pending, not a real 0%</span>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold text-text-primary mt-0.5 tabular-nums">{data.revenue?.monthPct}%</div>
                    <span className="text-[10px] text-text-muted mt-0.5 block">
                      AED {formatCompact(data.revenue?.monthToDate ?? 0)} of AED {formatCompact(data.revenue?.monthTarget ?? 0)} target
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* Strategic Priorities tile */}
          <button
            onClick={() => onNavigate('priorities')}
            className="group text-left bg-bg-secondary border border-border-color hover:border-gold/30 rounded-2xl p-5 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-gold" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-gold transition-colors" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-medium text-text-muted">Priorities On Track</span>
              {priorities.length === 0 ? (
                <>
                  <div className="text-2xl font-bold text-text-muted mt-1">—</div>
                  <span className="text-[10px] text-text-muted mt-0.5 block">Data unavailable</span>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
                    {onTrackCount}<span className="text-text-muted text-base font-medium">/{priorities.length}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-bg-primary overflow-hidden">
                    <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${priorityRatio}%` }} />
                  </div>
                </>
              )}
            </div>
          </button>

          {/* Team Pulse tile */}
          <button
            onClick={() => onNavigate('team')}
            className="group text-left bg-bg-secondary border border-border-color hover:border-gold/30 rounded-2xl p-5 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-gold transition-colors" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-medium text-text-muted">Team Needs Attention</span>
              {team.length === 0 ? (
                <>
                  <div className="text-2xl font-bold text-text-muted mt-1">—</div>
                  <span className="text-[10px] text-text-muted mt-0.5 block">Data unavailable</span>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
                    {attentionCount}<span className="text-text-muted text-base font-medium">/{team.length}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-bg-primary overflow-hidden">
                    <div className="h-full rounded-full bg-blue transition-all duration-500" style={{ width: `${teamRatio}%` }} />
                  </div>
                </>
              )}
            </div>
          </button>

          {/* Decisions tile */}
          <button
            onClick={() => onNavigate('decisions')}
            className="group text-left bg-bg-secondary border border-border-color hover:border-gold/30 rounded-2xl p-5 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-gold" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-gold transition-colors" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-medium text-text-muted">Decisions Logged This Week</span>
              <div className="text-2xl font-bold text-text-primary mt-1 tabular-nums">{decisionsThisWeek}</div>
            </div>
          </button>
        </div>

        {/* Flowly tile (full width) */}
        <button
          onClick={() => onNavigate('flowly')}
          className="group relative overflow-hidden text-left bg-bg-secondary border border-border-color hover:border-gold/30 rounded-2xl p-5 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 animate-fade-in-up"
          style={stagger(6)}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal/[0.07] via-transparent to-transparent" />
          <div className="relative flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center">
                <Rocket className="w-4 h-4 text-teal" />
              </div>
              <span className="text-xs font-semibold text-teal tracking-wide uppercase">Flowly CRO Performance</span>
            </div>
            <div className="mt-3">
              <span className="text-xs font-medium text-text-muted">Revenue ({cro?.range || '30d'})</span>
              <div className="text-2xl font-bold text-text-primary mt-1 flex items-baseline gap-2 tabular-nums">
                {cro ? `${currencySymbol(cro.currency)}${formatCompact(cro.totals.revenue30d)}` : '—'}
                {croRevenueChangePct != null ? (
                  <span className={`text-xs font-semibold ${croRevenueChangePct >= 0 ? 'text-green' : 'text-red'}`}>
                    {croRevenueChangePct >= 0 ? '↑' : '↓'} {Math.abs(croRevenueChangePct).toFixed(0)}%
                  </span>
                ) : cro && cro.prevTotals.revenue > 0 ? (
                  // Prior period too small for a percentage to mean anything — show the move itself.
                  <span className="text-xs font-medium text-text-muted">
                    from {currencySymbol(cro.currency)}{formatCompact(cro.prevTotals.revenue)}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] text-text-muted mt-1 block">
                {cro ? `${cro.totals.sales30d.toLocaleString()} sales · ${cro.totals.leads30d.toLocaleString()} leads` : 'No CRO data available'}
              </span>
              {croAdLoss != null && croAdLoss > 0 && (
                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-red bg-red-500/10 border border-red-500/25 px-2 py-1 rounded-lg">
                  <TriangleAlert className="w-3 h-3 shrink-0" />
                  Losing {currencySymbol(cro!.currency)}{formatCompact(croAdLoss)} on ads at {cro!.totals.roas.toFixed(2)}x ROAS
                </span>
              )}
            </div>
          </div>

          {/* CRO insights on the right */}
          <div className="relative shrink-0 text-right hidden sm:block text-xs space-y-1">
            <div className="text-text-secondary">
              ROAS: <span className={`font-bold ${cro && cro.totals.roas < 1 ? 'text-red' : 'text-text-primary'}`}>
                {cro ? `${cro.totals.roas.toFixed(2)}x` : '—'}
              </span>
            </div>
            <div className="text-text-muted">
              Conv Rate: <span className="font-semibold text-text-primary">{cro ? `${cro.totals.convRatePct.toFixed(2)}%` : '—'}</span>
            </div>
            {topCROFunnel && (
              <div className="text-text-muted truncate max-w-[160px]">
                Top funnel: <span className="font-semibold text-text-primary">{topCROFunnel.name}</span>
              </div>
            )}
          </div>
        </button>

        {/* Task Workload tile (full width) */}
        <div className="relative overflow-hidden bg-bg-secondary border border-border-color rounded-2xl p-5 shadow-sm gold-glow-hover flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 animate-fade-in-up" style={stagger(7)}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue/[0.07] via-transparent to-transparent" />
          <div className="relative flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-blue" />
              </div>
              <span className="text-xs font-semibold text-blue tracking-wide uppercase">Task Workload</span>
            </div>
            {/* backlogPending === 0 with no due-today/no-due-date tasks either is the
                signature of the tasks cache fetch having failed (dataService.ts's
                getDashboardCache().catch fallback) — a real empty backlog basically
                never happens across every bucket simultaneously. Show that honestly
                instead of "0 of 0 open tasks", which reads as a suspiciously perfect day. */}
            {backlogPending === 0 && dueTodayCount === 0 && backlogNoDueDate === 0 ? (
              <div className="mt-3 text-sm text-text-muted">Task data hasn&apos;t synced yet</div>
            ) : (
              <>
                <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <span className="text-xs font-medium text-text-muted">Overdue</span>
                    <div className="text-2xl font-bold mt-1 tabular-nums">
                      <span className={overdueTasks.length > 0 ? 'text-red' : 'text-text-primary'}>{overdueTasks.length}</span>
                      <span className="text-xs font-medium text-text-muted ml-2">of {backlogPending} open tasks</span>
                    </div>
                    <span className="text-[10px] text-text-muted mt-1 block">
                      {dueTodayCount} due today · {dueLaterCount} due later · {backlogNoDueDate} no due date
                    </span>
                  </div>

                  {topAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" title="Top assignees by open task count">
                      {topAssignees.map(([name, count]) => (
                        <span key={name} className="text-[10px] px-2 py-0.5 rounded-full bg-bg-card border border-border-color text-text-secondary">
                          {name} <span className="font-semibold text-text-primary">{count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {topSections.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5" title="Open tasks by section">
                    {topSections.map(([name, count]) => (
                      <span key={name} className="text-[10px] px-2 py-0.5 rounded-full bg-blue/10 border border-blue/20 text-blue font-medium">
                        {name} <span className="font-semibold">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Small stats on the right */}
          <div className="relative shrink-0 text-right hidden sm:block text-xs space-y-1">
            {topAssignees[0] && (
              <div className="text-text-secondary">
                Busiest: <span className="font-semibold text-text-primary">{topAssignees[0][0]}</span> ({topAssignees[0][1]})
              </div>
            )}
            {topSections[0] && (
              <div className="text-text-muted">
                Top section: <span className="font-semibold text-text-primary">{topSections[0][0]}</span> ({topSections[0][1]})
              </div>
            )}
          </div>
        </div>

      {/* Recent Decisions teaser */}
      {recentDecisions.length > 0 && (
        <button
          onClick={() => onNavigate('decisions')}
          className="group text-left bg-bg-secondary border border-border-color hover:border-gold/30 rounded-2xl p-5 shadow-sm gold-glow-hover transition-all duration-200 flex flex-col gap-3 w-full animate-fade-in-up"
          style={stagger(8)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                <ClipboardList className="w-3.5 h-3.5 text-gold" />
              </div>
              <h3 className="text-xs font-semibold text-gold tracking-wide uppercase">Recent Decisions</h3>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-gold transition-colors" />
          </div>
          <ul className="space-y-2">
            {recentDecisions.map((d, idx) => (
              <li key={idx} className="flex items-baseline gap-2.5 text-sm">
                <span className="text-xs text-text-muted shrink-0">
                  {formatDate(d.date)}
                </span>
                <span className="text-text-primary truncate">{d.displayText}</span>
              </li>
            ))}
          </ul>
        </button>
      )}

      {/* Feature 14: Quick Note Input & Recent Notes */}
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-5 sm:p-6 shadow-sm gold-glow-hover flex flex-col gap-4 animate-fade-in-up" style={stagger(9)}>
        <div className="flex justify-between items-center border-b border-border-color pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-gold" />
            <h3 className="text-sm font-semibold text-gold tracking-wide uppercase">Quick Note / Instruction</h3>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a note, question, or instruction..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveNote()}
            className="flex-1 px-3.5 py-2.5 bg-bg-card border border-border-color rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-gold"
          />
          <button
            onClick={saveNote}
            className="px-5 py-2 bg-gold hover:bg-gold/90 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Save
          </button>
        </div>

        {recentNotes.length > 0 && (
          <div className="space-y-2 mt-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Recent Notes</span>
            <ul className="space-y-2">
              {recentNotes.map((note, index) => (
                <li key={index} className="flex justify-between items-center bg-bg-card border border-border-color/60 px-3.5 py-2.5 rounded-xl text-xs">
                  <span className="text-text-primary">{note.text}</span>
                  <span className="text-[9px] text-text-muted">
                    {formatTime(note.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
