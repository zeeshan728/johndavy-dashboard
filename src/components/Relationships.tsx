'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Mail,
  Network,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type {
  HermesRelationshipPerson,
  HermesRelationships,
} from '@/lib/hermesClient';

const periods = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
];

const filters = ['all', 'close_circle', 'team', 'needs_attention'];

function dateLabel(value?: string) {
  if (!value) return 'No recorded interaction';

  const date = new Date(value);

  return Number.isNaN(date.valueOf())
    ? value.slice(0, 10)
    : date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
      });
}

function trendIcon(trend: HermesRelationshipPerson['trend']) {
  if (trend === 'increasing') {
    return <ArrowUp className="h-3.5 w-3.5 text-green" />;
  }

  if (trend === 'decreasing') {
    return <ArrowDown className="h-3.5 w-3.5 text-amber" />;
  }

  return <Activity className="h-3.5 w-3.5 text-cyan" />;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-color bg-bg-card p-4">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>

      <div className="mt-2 text-2xl font-bold text-text-primary">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function PersonCard({
  person,
  onOpen,
}: {
  person: HermesRelationshipPerson;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group rounded-xl border border-border-color bg-bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan/50 hover:shadow-lifted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue/20 to-cyan/20 text-xs font-bold text-blue">
            {initials(person.name)}
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-text-primary">
              {person.name}
            </span>

            <span className="block truncate text-xs text-text-secondary">
              {person.role || person.company || 'Professional contact'}
            </span>
          </span>
        </div>

        <span className="flex items-center gap-1 text-xs font-bold text-cyan">
          {person.relationshipStrength}
          <span className="text-[9px] font-normal text-text-muted">/100</span>
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-text-secondary">
        <span className="flex items-center gap-1">
          {trendIcon(person.trend)}
          {person.trend}
        </span>

        <span>{person.interactionCount} interactions</span>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-text-secondary">
        {person.explanation}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {person.company && (
          <span className="rounded-full bg-blue/8 px-2 py-1 text-[10px] text-blue">
            {person.company}
          </span>
        )}

        {person.openActions.length > 0 && (
          <span className="rounded-full bg-amber/10 px-2 py-1 text-[10px] text-amber">
            {person.openActions.length} open actions
          </span>
        )}
      </div>
    </button>
  );
}

function Detail({
  person,
  onClose,
}: {
  person: HermesRelationshipPerson;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border-color bg-bg-secondary p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan">
              Relationship profile
            </p>

            <h2 className="mt-1 text-2xl font-bold">{person.name}</h2>

            <p className="mt-1 text-sm text-text-secondary">
              {[person.role, person.company].filter(Boolean).join(' · ') ||
                'Professional contact'}
            </p>
          </div>

          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="Strength"
            value={person.relationshipStrength}
            icon={<Sparkles className="h-3.5 w-3.5" />}
          />

          <Metric
            label="Interactions"
            value={person.interactionCount}
            icon={<Activity className="h-3.5 w-3.5" />}
          />

          <Metric
            label="Meetings"
            value={person.meetingCount}
            icon={<CalendarDays className="h-3.5 w-3.5" />}
          />

          <Metric
            label="Emails"
            value={person.emailCount}
            icon={<Mail className="h-3.5 w-3.5" />}
          />
        </div>

        <div className="mt-5 rounded-xl border border-border-color bg-bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Last interaction
          </p>

          <p className="mt-2 text-sm font-semibold">
            {person.lastInteraction?.title || 'No recorded interaction'}
          </p>

          <p className="mt-1 text-xs text-text-secondary">
            {dateLabel(person.lastInteraction?.date)} ·{' '}
            {person.lastInteraction?.source || 'Source unavailable'}
          </p>

          {person.lastInteraction?.summary && (
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {person.lastInteraction.summary}
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Interaction timeline
            </p>

            <div className="mt-3 space-y-3">
              {(person.interactions || []).slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="border-l-2 border-cyan/30 pl-3"
                >
                  <p className="text-xs font-semibold text-text-primary">
                    {dateLabel(item.date)} · {item.type}
                  </p>

                  <p className="mt-0.5 text-xs text-text-secondary">
                    {item.title || item.source}
                  </p>
                </div>
              ))}

              {!person.interactions?.length && (
                <p className="text-xs text-text-muted">
                  No timeline records available.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Open actions
            </p>

            <div className="mt-3 space-y-2">
              {person.openActions.map((action, index) => (
                <div
                  key={`${action.text}-${index}`}
                  className="rounded-lg bg-amber/8 p-3 text-xs text-text-secondary"
                >
                  {action.text}

                  <span className="mt-1 block text-[10px] text-text-muted">
                    {action.source || 'Source unavailable'}
                  </span>
                </div>
              ))}

              {!person.openActions.length && (
                <p className="text-xs text-text-muted">
                  No open actions recorded.
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-text-muted">
          Confidence: {person.confidence}. Relationship strength is based on
          recorded interaction evidence, not assumptions.
        </p>
      </div>
    </div>
  );
}

export default function Relationships() {
  const [data, setData] = useState<HermesRelationships | null>(null);
  const [period, setPeriod] = useState('30d');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] =
    useState<HermesRelationshipPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    const params = new URLSearchParams({
      period,
      filter,
    });

    if (query.trim()) {
      params.set('q', query.trim());
    }

    fetch(`/api/relationships?${params.toString()}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);

          throw new Error(
            body?.detail || `Request failed: ${response.status}`,
          );
        }

        return response.json();
      })
      .then((value: HermesRelationships) => {
        if (!cancelled) {
          setData(value);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load relationships',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period, filter, query]);

  const people = useMemo(
    () => data?.mostInteracted || [],
    [data],
  );

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-72 animate-pulse rounded bg-bg-card" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((number) => (
            <div
              key={number}
              className="h-24 animate-pulse rounded-xl bg-bg-card"
            />
          ))}
        </div>

        <div className="h-64 animate-pulse rounded-2xl bg-bg-card" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red/25 bg-red/5 p-8 text-center text-sm text-text-secondary">
        {error}
      </div>
    );
  }

  const overview = data?.overview || {
    people: 0,
    closeCircle: 0,
    needsAttention: 0,
    upcomingMeetings: 0,
    recentInteractions: 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan">
            Relationship intelligence
          </p>

          <h1 className="mt-1 text-2xl font-bold">Relationships</h1>

          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            A grounded view of who matters, what has changed, and where John’s
            attention is needed.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border-color bg-bg-card px-3 py-2">
          <Search className="h-4 w-4 text-text-muted" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people or companies"
            className="w-48 bg-transparent text-xs outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="People identified"
          value={overview.people}
          icon={<Users className="h-3.5 w-3.5" />}
        />

        <Metric
          label="Close circle"
          value={overview.closeCircle}
          icon={<Sparkles className="h-3.5 w-3.5" />}
        />

        <Metric
          label="Needs attention"
          value={overview.needsAttention}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />

        <Metric
          label="Upcoming meetings"
          value={overview.upcomingMeetings}
          icon={<CalendarDays className="h-3.5 w-3.5" />}
        />

        <Metric
          label="Recent interactions"
          value={overview.recentInteractions}
          icon={<Activity className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ${
                filter === item
                  ? 'bg-blue text-white'
                  : 'border border-border-color bg-bg-card text-text-secondary'
              }`}
            >
              {item.replace('_', ' ')}
            </button>
          ))}
        </div>

        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="rounded-lg border border-border-color bg-bg-card px-3 py-2 text-xs text-text-secondary"
        >
          {periods.map((item) => (
            <option key={item.id} value={item.id}>
              Last {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border-color bg-bg-secondary p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue">
                John’s Close Circle
              </h2>

              <p className="mt-1 text-xs text-text-secondary">
                Ranked from meetings, email, tasks, roles, and recency.
              </p>
            </div>

            <Sparkles className="h-5 w-5 text-cyan" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {(data?.closeCircle || []).slice(0, 6).map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onOpen={() => setSelected(person)}
              />
            ))}

            {!data?.closeCircle?.length && (
              <p className="text-sm text-text-muted">
                No close-circle evidence in this period.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border-color bg-bg-secondary p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue">
                Relationships needing attention
              </h2>

              <p className="mt-1 text-xs text-text-secondary">
                Recommendations require business context or open work.
              </p>
            </div>

            <AlertTriangle className="h-5 w-5 text-amber" />
          </div>

          <div className="space-y-3">
            {(data?.attention || []).slice(0, 6).map((item) => (
              <button
                key={`${item.personId}-${item.title}`}
                onClick={() =>
                  setSelected(
                    people.find((person) => person.id === item.personId) ||
                      null,
                  )
                }
                className="w-full rounded-xl border border-border-color bg-bg-card p-3 text-left hover:border-amber/50"
              >
                <p className="text-sm font-semibold">{item.title}</p>

                <p className="mt-1 text-xs text-text-secondary">
                  {item.detail}
                </p>

                <p className="mt-2 text-[11px] text-text-muted">
                  Why: {item.why}
                </p>
              </button>
            ))}

            {!data?.attention?.length && (
              <p className="text-sm text-text-muted">
                No evidence-backed follow-ups right now.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border-color bg-bg-secondary p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-blue">
              Most interacted with
            </h2>

            <p className="mt-1 text-xs text-text-secondary">
              {period} window · click a person for the source timeline.
            </p>
          </div>

          <Network className="h-5 w-5 text-cyan" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {people.slice(0, 12).map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onOpen={() => setSelected(person)}
            />
          ))}
        </div>

        <p className="mt-5 text-[11px] text-text-muted">
          Based on: {data?.sources.available.join(' · ') || 'No connected sources returned'}
          {data?.sources.unavailable.length
            ? ` · Unavailable: ${data.sources.unavailable.join(', ')}`
            : ''}
        </p>
      </section>

      {selected && (
        <Detail person={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export { PersonCard, Detail };
