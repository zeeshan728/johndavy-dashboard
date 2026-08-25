'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Video,
  FileText,
  Mail,
  Circle,
  CircleCheck,
} from 'lucide-react';
import { DataSource } from '@/lib/dataService';
import SourceBadge from './SourceBadge';
import { relativeTimeFrom } from '@/lib/text';

// ── Self-contained meetings data access ──
// The Meetings tab reads parsed meeting notes (transcripts → summaries, action
// items, decisions) straight from the Hermes agent's `/api/meetings` endpoint,
// using the same fallback base / bearer-token pattern as hermesClient.ts. The
// mapping below is intentionally local to this component so the tab can be
// added without touching the evolved core data layer on master.

const FALLBACK_API_BASE = 'https://exposed-port-8766-75e25f2cf7732394f831-k7lg5zdmjg.h48.openclaw.agent37.com';

function meetingsApiBase(): string {
  const base = process.env.NEXT_PUBLIC_HERMES_API_BASE || process.env.HERMES_API_BASE;
  if (!base) {
    if (typeof window !== 'undefined') {
      console.warn('HERMES_API_BASE not set, using fallback URL');
    }
    return FALLBACK_API_BASE;
  }
  return base.replace(/\/$/, '');
}

interface HermesMeetingActionItem {
  text: string;
  checked: boolean | null;
}

interface HermesMeeting {
  id: string;
  path: string;
  title: string;
  date: string;
  source: string;
  type: string;
  tags: string[];
  people: string[];
  summary: string;
  key_points: string;
  decisions_text: string;
  decisions: string[];
  action_items: HermesMeetingActionItem[];
  open_action_items: number;
  raw_transcript: string;
}

interface HermesMeetingsStats {
  this_week: number;
  open_action_items: number;
  decisions: number;
}

interface HermesMeetings {
  meetings: HermesMeeting[];
  total: number;
  stats: HermesMeetingsStats;
  source?: string;
  fetched_at?: string;
  from_cache?: boolean;
}

async function getMeetings() {
  const res = await fetch(`${meetingsApiBase()}/api/meetings`, {
    cache: 'no-store',
    headers: {
      ...(process.env.NEXT_PUBLIC_HERMES_API_TOKEN || process.env.HERMES_API_TOKEN
        ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_HERMES_API_TOKEN || process.env.HERMES_API_TOKEN}` }
        : {}),
    },
  });
  if (!res.ok) throw new Error(`Hermes API /api/meetings failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as HermesMeetings;
}

function humanizeSource(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('gmail') || s.includes('email') || s.includes('inbox')) return 'Email archive';
  if (s.includes('meeting') || s.includes('transcript') || s.includes('recall')) return 'Meeting transcript';
  return s.split(/[_\-.]/)[0] || source;
}

function mapMeetings(raw: HermesMeetings): MeetingsData {
  const meta: DataSource = {
    source: raw.source || 'johns_brain_meeting_notes',
    fetchedAt: raw.fetched_at,
    fromCache: raw.from_cache,
  };
  return {
    total: raw.total || 0,
    dataSource: meta,
    stats: {
      thisWeek: raw.stats?.this_week ?? 0,
      openActionItems: raw.stats?.open_action_items ?? 0,
      decisions: raw.stats?.decisions ?? 0,
    },
    meetings: (raw.meetings || []).map((m) => ({
      id: m.id,
      title: m.title || m.id.replace(/-/g, ' '),
      date: m.date || '',
      dateLabel: m.date
        ? new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'Unknown date',
      people: m.people || [],
      source: m.source || '',
      sourceLabel: humanizeSource(m.source || 'meeting_notes'),
      summary: m.summary || '',
      keyPoints: m.key_points || '',
      decisions: (m.decisions || []).filter(Boolean),
      actionItems: (m.action_items || []).map((a) => ({
        text: a.text,
        checked: a.checked ?? null,
      })),
      openActionItems: m.open_action_items ?? 0,
      rawTranscript: m.raw_transcript || '',
    })),
  };
}

export interface MeetingActionItem {
  text: string;
  checked: boolean | null;
}

export interface MeetingNote {
  id: string;
  title: string;
  date: string;
  dateLabel: string;
  people: string[];
  source: string;
  sourceLabel: string;
  summary: string;
  keyPoints: string;
  decisions: string[];
  actionItems: MeetingActionItem[];
  openActionItems: number;
  rawTranscript: string;
}

export interface MeetingsStats {
  thisWeek: number;
  openActionItems: number;
  decisions: number;
}

export interface MeetingsData {
  meetings: MeetingNote[];
  total: number;
  stats: MeetingsStats;
  dataSource?: DataSource;
}

interface MeetingsProps {
  data?: MeetingsData | null;
}

type SortKey = 'date' | 'title' | 'people' | 'source' | 'openActionItems' | 'decisions';

// Sortable column header — plain render helper (not a component) so it keeps
// a stable identity across renders and doesn't remount the click target.
function SortHeader({
  label,
  k,
  sortKey,
  sortAsc,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(k)}
      className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted hover:text-gold transition cursor-pointer"
    >
      {label}
      <span className="text-gold/70">{sortKey === k ? (sortAsc ? '↑' : '↓') : ''}</span>
    </button>
  );
}

export default function Meetings({ data: propData }: MeetingsProps) {
  const [selfData, setSelfData] = useState<MeetingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const dateOptions = [
    { value: 'all', label: 'All dates' },
    { value: 'today', label: 'Yesterday' },
    { value: 'thisWeek', label: 'Last 7 Days' },
    { value: 'thisMonth', label: 'Last 30 Days' },
  ] as const;
  type DateFilter = (typeof dateOptions)[number]['value'];

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [dateOpen, setDateOpen] = useState(false);
  const currentDate = dateOptions.find((o) => o.value === dateFilter);

  const hasPropData = propData != null;
  const data = propData ?? selfData;
  // Show the skeleton when there's nothing to render yet and we're still fetching.
  const loading = !hasPropData && selfData === null && !error;

  // Self-fetch from the Hermes backend when no data is passed via props
  // (mirrors the standalone mode used by RevenuePulse).
  useEffect(() => {
  if (propData) return;

  let cancelled = false;

  fetch('/api/meetings', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => null);

        throw new Error(
          body?.detail ||
            body?.error ||
            `Meetings request failed: ${response.status}`
        );
      }

      return response.json();
    })
    .then((raw) => {
      if (!cancelled) {
        setSelfData(mapMeetings(raw));
        setError(null);
      }
    })
    .catch((e) => {
      if (!cancelled) {
        console.error('Error fetching meetings:', e);
        setError('Could not load meetings. Please check the Hermes connection.');
      }
    });

  return () => {
    cancelled = true;
  };
}, [propData]);

  const sorted = useMemo(() => {

      const q = searchQuery.trim().toLowerCase();
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let list = [...(data?.meetings || [])];

      if (q) {
        list = list.filter((m) =>
          m.title.toLowerCase().includes(q) ||
          (m.people || []).join(' ').toLowerCase().includes(q) ||
          (m.summary || '').toLowerCase().includes(q) ||
          (m.keyPoints || '').toLowerCase().includes(q)
        );
      }

      if (dateFilter === 'today') {
        list = list.filter((m) => {
          const d = new Date(m.date + 'T00:00:00');
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          return d.toDateString() === yest.toDateString();
        });
      } else if (dateFilter === 'thisWeek') {
        list = list.filter((m) => {
          const d = new Date(m.date + 'T00:00:00');
          return d >= weekAgo && d <= now;
        });
      } else if (dateFilter === 'thisMonth') {
        list = list.filter((m) => {
          const d = new Date(m.date + 'T00:00:00');
          return d >= monthStart && d <= now;
        });
      }

    const val = (m: MeetingNote): string | number => {
      switch (sortKey) {
        case 'date':
          return m.date || '';
        case 'title':
          return m.title.toLowerCase();
        case 'people':
          return (m.people || []).join(', ').toLowerCase();
        case 'source':
          return m.sourceLabel.toLowerCase();
        case 'openActionItems':
          return m.openActionItems ?? 0;
        case 'decisions':
          return (m.decisions || []).length;
        default:
          return '';
      }
    };
    list.sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [data, sortKey, sortAsc, searchQuery, dateFilter]);

  const stats = data?.stats || { thisWeek: 0, openActionItems: 0, decisions: 0 };

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-border-color pb-3">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-gold/40" />
            <h2 className="text-sm font-semibold text-gold/40 tracking-wide uppercase">
              Meetings — Loading...
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="animate-pulse bg-bg-card h-[88px] rounded-xl" />
          <div className="animate-pulse bg-bg-card h-[88px] rounded-xl" />
          <div className="animate-pulse bg-bg-card h-[88px] rounded-xl" />
        </div>
        <div className="animate-pulse bg-bg-card h-[240px] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 shadow-sm text-center">
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const statCard = (icon: React.ReactNode, value: number, label: string) => (
    <div className="bg-bg-card border border-border-color rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-text-primary leading-none">
          {value.toLocaleString()}
        </div>
        <div className="text-[11px] text-text-secondary mt-1 truncate">{label}</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Headline stats */}
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 shadow-sm gold-glow-hover flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-border-color pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-gold" />
            <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">
              Meetings — This Week
            </h2>
          </div>
          <SourceBadge dataSource={data?.dataSource} />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings…"
            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-bg-card border border-border-color hover:border-gold/30 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition"
          />

          <div className="relative shrink-0">
            <button
              onClick={() => setDateOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border-color hover:border-gold/30 rounded-lg text-xs font-semibold text-text-primary transition cursor-pointer"
            >
              {currentDate?.label ?? 'All dates'}
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </button>

            {dateOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDateOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-48 glass-card rounded-xl shadow-lg z-20 overflow-hidden animate-fade-in-up">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setDateFilter(opt.value);
                        setDateOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition ${
                        opt.value === dateFilter
                          ? 'bg-gold/10 text-gold'
                          : 'text-text-secondary hover:bg-bg-card hover:text-text-primary cursor-pointer'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {statCard(
            <CalendarDays className="w-5 h-5" />,
            stats.thisWeek,
            `Meetings in the last 7 days (${data?.total ?? 0} total)`
          )}
          {statCard(
            <ListTodo className="w-5 h-5" />,
            stats.openActionItems,
            'Open action items across all notes'
          )}
          {statCard(
            <CheckCircle2 className="w-5 h-5" />,
            stats.decisions,
            'Meetings with recorded decisions'
          )}
        </div>
      </div>

      {/* Meetings table */}
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 shadow-sm gold-glow-hover flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-border-color pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">
              All Meetings — {sorted.length}
            </h2>
          </div>
        </div>

        {/* Column headers (sortable) */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-2 pb-1 border-b border-border-color/60">
          <div className="col-span-3">
            <SortHeader label="Title" k="title" sortKey={sortKey} sortAsc={sortAsc} onSort={cycleSort} />
          </div>
          <div className="col-span-2">
            <SortHeader label="Date" k="date" sortKey={sortKey} sortAsc={sortAsc} onSort={cycleSort} />
          </div>
          <div className="col-span-3">
            <SortHeader label="People" k="people" sortKey={sortKey} sortAsc={sortAsc} onSort={cycleSort} />
          </div>
          <div className="col-span-2">
            <SortHeader label="Source" k="source" sortKey={sortKey} sortAsc={sortAsc} onSort={cycleSort} />
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <SortHeader label="Open" k="openActionItems" sortKey={sortKey} sortAsc={sortAsc} onSort={cycleSort} />
            <SortHeader label="Decisions" k="decisions" sortKey={sortKey} sortAsc={sortAsc} onSort={cycleSort} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {sorted.length === 0 && (
            <p className="text-text-muted text-xs italic px-2 py-6 text-center">
              No meeting notes yet. They&apos;ll appear here as the email-transcript ingest processor creates them.
            </p>
          )}
          {sorted.map((m) => {
            const open = m.openActionItems ?? 0;
            const dec = (m.decisions || []).length;
            const isExpanded = expandedId === m.id;
            return (
              <div
                key={m.id}
                className="bg-bg-card border border-border-color rounded-xl hover:bg-bg-card-hover hover:border-gold/30 hover:shadow-sm transition-all duration-150 overflow-hidden"
              >
                {/* Row summary */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center px-3 py-3 text-left cursor-pointer"
                >
                  <div className="md:col-span-3 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate leading-snug">
                      {m.title}
                    </div>
                    {m.date && (
                      <span className="text-[10px] text-text-muted md:hidden">
                        {m.dateLabel}
                        {relativeTimeFrom(m.date + 'T00:00:00') && ` · ${relativeTimeFrom(m.date + 'T00:00:00')}`}
                      </span>
                    )}
                  </div>
                  <div className="md:col-span-2 flex items-center gap-1.5 text-xs text-text-secondary">
                    <CalendarDays className="w-3 h-3 text-gold/60 shrink-0 hidden md:inline" />
                    <span className="hidden md:inline">
                      {m.dateLabel}
                      {relativeTimeFrom(m.date + 'T00:00:00') && (
                        <span className="text-[10px] text-text-muted ml-1">({relativeTimeFrom(m.date + 'T00:00:00')})</span>
                      )}
                    </span>
                  </div>
                  <div className="md:col-span-3 flex flex-wrap items-center gap-1">
                    {(m.people || []).slice(0, 3).map((p) => (
                      <span
                        key={p}
                        className="px-1.5 py-0.5 rounded-full bg-bg-secondary border border-border-color text-[10px] font-medium text-text-secondary truncate max-w-[120px]"
                      >
                        {p}
                      </span>
                    ))}
                    {(m.people || []).length > 3 && (
                      <span className="text-[10px] text-text-muted">
                        +{(m.people || []).length - 3}
                      </span>
                    )}
                    {(m.people || []).length === 0 && (
                      <span className="text-[10px] text-text-muted">—</span>
                    )}
                  </div>
                  <div className="md:col-span-2 flex items-center gap-1.5 text-xs text-text-secondary min-w-0">
                    {m.sourceLabel === 'Email archive' || m.source.includes('gmail') ? (
                      <Mail className="w-3 h-3 text-blue shrink-0" />
                    ) : (
                      <FileText className="w-3 h-3 text-teal shrink-0" />
                    )}
                    <span className="truncate">{m.sourceLabel}</span>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-3 text-xs">
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                        open > 0
                          ? 'bg-amber-50/60 text-amber-700 border-amber-200/60'
                          : 'bg-emerald-50/60 text-emerald-700 border-emerald-200/60'
                      }`}
                    >
                      <ListTodo className="w-3 h-3" />
                      {open} open
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-text-secondary">
                      <CheckCircle2 className="w-3 h-3 text-gold" />
                      {dec}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gold shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border-color px-4 py-4 flex flex-col gap-4 bg-bg-secondary/40">
                    {m.summary && (
                      <section>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-1.5">
                          Summary
                        </h4>
                        <p className="text-[13px] text-text-primary leading-relaxed">{m.summary}</p>
                      </section>
                    )}

                    {m.keyPoints && (
                      <section>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-1.5">
                          Key Points
                        </h4>
                        <ul className="text-[13px] text-text-secondary leading-relaxed list-disc pl-4 space-y-1">
                          {m.keyPoints
                            .split('\n')
                            .filter((l) => l.trim())
                            .map((l, i) => (
                              <li key={i}>{l.replace(/^[-*]\s+/, '')}</li>
                            ))}
                        </ul>
                      </section>
                    )}

                    <section>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-1.5">
                        Decisions {m.decisions.length > 0 && `(${m.decisions.length})`}
                      </h4>
                      {m.decisions.length === 0 ? (
                        <p className="text-[13px] text-text-muted italic">No decisions recorded for this meeting.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {m.decisions.map((d, i) => (
                            <li key={i} className="flex gap-2 text-[13px] text-text-primary">
                              <CheckCircle2 className="w-4 h-4 text-green shrink-0 mt-0.5" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gold mb-1.5">
                        Action Items {m.actionItems.filter((a) => a.checked === false).length > 0 && `(${m.actionItems.filter((a) => a.checked === false).length} open)`}
                      </h4>
                      {m.actionItems.length === 0 ? (
                        <p className="text-[13px] text-text-muted italic">No action items recorded.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {m.actionItems.map((a, i) => (
                            <li key={i} className="flex gap-2 text-[13px] text-text-primary items-start">
                              {a.checked === true ? (
                                <CircleCheck className="w-4 h-4 text-green shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                              )}
                              <span className={a.checked === true ? 'line-through text-text-muted' : ''}>
                                {a.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    {m.rawTranscript && (
                      <section>
                        <details className="group">
                          <summary className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gold cursor-pointer list-none">
                            <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                            Raw Transcript
                          </summary>
                          <pre className="mt-2 text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap bg-bg-card border border-border-color/60 rounded-lg p-3 max-h-72 overflow-y-auto custom-scrollbar">
                            {m.rawTranscript}
                          </pre>
                        </details>
                      </section>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
