'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CircleHelp,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';

import './Connections.css';
import { metadata } from 'framer-motion/m';

type Status =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'not_configured';

type Connection = {
  id: string;
  name: string;
  status: Status;
  account?: string | null;
  last_checked?: string | null;
  last_successful_sync?: string | null;
  last_failure?: string | null;
  error?: string | null;
  reason?: string | null;
  authentication_status?: string;
  can_auto_fix?: boolean;
};

type Health = {
  connections: Connection[];
  health_score: number;
  summary: {
    healthy: number;
    attention: number;
    failed: number;
    not_configured: number;
  };
  timestamp?: string;
};

type Diagnosis = {
  connection_id: string;
  what_happened: string;
  why: string;
  impact: string;
  recommended_action: string;
  can_hermes_fix: boolean;
};

const STATUS_META: Record<
  Status,
  {
    dot: string;
    text: string;
    label: string;
  }
> = {
  healthy: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    label: 'Healthy',
  },
  degraded: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    label: 'Requires attention',
  },
  failed: {
    dot: 'bg-red-500',
    text: 'text-red-700',
    label: 'Failed',
  },
  not_configured: {
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    label: 'Not configured',
  },
};

function normalizeStatus(status: string): Status {
  switch (status) {
    case 'connected':
    case 'active':
    case 'fresh':
    case 'healthy':
      return 'healthy';

    case 'low_credits':
    case 'stale':
    case 'degraded':
      return 'degraded';

    case 'blocked':
    case 'error':
    case 'failed':
      return 'failed';

    case 'not_connected':
    case 'unavailable':
    case 'unknown':
    case 'not_configured':
    default:
      return 'not_configured';
  }
}

function statusPulseClass(status: Status): string {
  return status === 'healthy'
    ? 'connection-status-pulse'
    : '';
}


function normalizeConnection(raw: any): Connection {
  const status = normalizeStatus(
    String(raw.status || 'not_configured'),
  );

  const id =
    raw.id ||
    String(raw.name || 'connection')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

  return {
    ...raw,
    id,
    status,
    error: raw.error || null,
    reason: raw.reason || raw.note || null,
    last_checked:
      raw.last_checked ||
      raw.fetched_at ||
      null,
    last_successful_sync:
      raw.last_successful_sync ||
      (status === 'healthy'
        ? raw.fetched_at || null
        : null),
    last_failure: raw.last_failure || null,
    authentication_status:
      raw.authentication_status ||
      (status === 'healthy' ? 'valid' : 'unknown'),
    can_auto_fix: Boolean(raw.can_auto_fix),
  };
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Connections() {
  const [health, setHealth] = useState<Health | null>(null);
  const [selected, setSelected] = useState<Connection | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHealth() {
    setError(null);

    try {
      const response = await fetch('/api/connections', {
        cache: 'no-store',
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error || 'Health API unavailable',
        );
      }

      const connections: Connection[] = Array.isArray(
        payload.connections,
      )
        ? payload.connections.map(normalizeConnection)
        : [];

      const summary =
        payload.summary ||
        connections.reduce(
          (counts, connection) => {
            if (connection.status === 'healthy') {
              counts.healthy += 1;
            } else if (connection.status === 'degraded') {
              counts.attention += 1;
            } else if (connection.status === 'failed') {
              counts.failed += 1;
            } else {
              counts.not_configured += 1;
            }

            return counts;
          },
          {
            healthy: 0,
            attention: 0,
            failed: 0,
            not_configured: 0,
          },
        );

      const configuredCount =
        connections.length - summary.not_configured;

      const derivedScore =
        configuredCount > 0
          ? Math.round(
              ((summary.healthy +
                summary.attention * 0.5) /
                configuredCount) *
                100,
            )
          : 0;

      setHealth({
        ...payload,
        connections,
        summary: {
          healthy: Number(summary.healthy || 0),
          attention: Number(summary.attention || 0),
          failed: Number(summary.failed || 0),
          not_configured: Number(
            summary.not_configured || 0,
          ),
        },
        health_score: Number(
          payload.health_score ?? derivedScore,
        ),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load system health',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();

    const interval = window.setInterval(() => {
      void loadHealth();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  async function runAction(
    action: 'test' | 'diagnose' | 'fix',
  ) {
    if (!selected) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/connections/${encodeURIComponent(
          selected.id,
        )}?action=${action}`,
        {
          method: 'POST',
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            payload.error ||
            'Connection action failed',
        );
      }

      if (action === 'diagnose') {
        setDiagnosis(payload);
      } else {
        if (payload.connection) {
          setSelected(
            normalizeConnection(payload.connection),
          );
        }

        await loadHealth();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Connection action failed',
      );
    } finally {
      setBusy(false);
    }
  }

  const connections = useMemo(
    () => health?.connections ?? [],
    [health],
  );

  if (loading && !health) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <strong>System health unavailable.</strong>{' '}
        {error}

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadHealth();
          }}
          className="ml-3 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const summary = health.summary || {
    healthy: 0,
    attention: 0,
    failed: 0,
    not_configured: 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            Francis / Hermes
          </p>

          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            System Health
          </h1>

          <p className="mt-1 text-sm text-text-secondary">
            Live connection status, diagnostics, and safe recovery actions.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void loadHealth();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border-color px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-card disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border-color bg-bg-secondary p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Overall health
          </p>

          <div className="mt-2 text-4xl font-bold text-gold">
            {health.health_score}%
          </div>

          <p className="mt-1 text-xs text-text-secondary">
            {summary.failed + summary.attention}{' '}
            issue
            {summary.failed + summary.attention === 1
              ? ''
              : 's'}{' '}
            require attention.
          </p>
        </div>

        <div className="rounded-2xl border border-border-color bg-bg-secondary p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Healthy
          </p>

          <div className="mt-2 text-3xl font-bold text-text-primary">
            {summary.healthy}
          </div>
        </div>

        <div className="rounded-2xl border border-border-color bg-bg-secondary p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Requires attention
          </p>

          <div className="mt-2 text-3xl font-bold text-amber-600">
            {summary.attention}
          </div>
        </div>

        <div className="rounded-2xl border border-border-color bg-bg-secondary p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Failed
          </p>

          <div className="mt-2 text-3xl font-bold text-red-600">
            {summary.failed}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border-color bg-bg-secondary p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-gold" />

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
              Connection graph
            </h2>

            <p className="text-xs text-text-muted">
              Select a system to inspect its current health.
            </p>
          </div>
        </div>

        <div className="relative mx-auto h-[420px] max-w-[760px] overflow-hidden rounded-xl bg-bg-card">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 760 420"
            role="img"
            aria-label="Francis connection graph"
          >
            {connections.map((_, index) => {
              const angle =
                (index / Math.max(connections.length, 1)) *
                  Math.PI *
                  2 -
                Math.PI / 2;

              return (
                <line
                  key={`line-${index}`}
                  className="connection-graph-line"
                  x1="380"
                  y1="210"
                  x2={380 + Math.cos(angle) * 270}
                  y2={210 + Math.sin(angle) * 160}
                  stroke="var(--border-color)"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          <div className="connection-center-pulse absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gold bg-gold/10 text-center text-xs font-bold tracking-widest text-gold">
            FRANCIS
          </div>

          {connections.map((connection, index) => {
            const angle =
              (index / Math.max(connections.length, 1)) *
                Math.PI *
                2 -
              Math.PI / 2;

            const meta =
              STATUS_META[connection.status] ||
              STATUS_META.not_configured;

            return (
              <button
                key={connection.id}
                type="button"
                onClick={() => {
                  setSelected(connection);
                  setDiagnosis(null);
                  setError(null);
                }}
                style={{
                  left: `calc(50% + ${Math.cos(angle) * 35}%)`,
                  top: `calc(50% + ${Math.sin(angle) * 38}%)`,
                }}
                className="connection-graph-node absolute flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl p-2 text-center text-xs font-semibold transition-colors hover:bg-bg-secondary"
              >
                <span
                  className={`h-3 w-3 rounded-full ${meta.dot} ${
                    statusPulseClass(connection.status)
                  } ring-4 ring-white/60`}
                />

                <span>{connection.name}</span>

                <span className={`text-[10px] ${meta.text}`}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-primary">
          Connected systems
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          {connections.map((connection) => {
            const meta =
              STATUS_META[connection.status] ||
              STATUS_META.not_configured;

            return (
              <button
                key={connection.id}
                type="button"
                onClick={() => {
                  setSelected(connection);
                  setDiagnosis(null);
                  setError(null);
                }}
                className="flex items-center justify-between rounded-xl border border-border-color bg-bg-secondary p-4 text-left hover:border-gold/50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
                  />

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {connection.name}
                    </span>

                    <span className="block truncate text-xs text-text-muted">
                      Last checked{' '}
                      {formatDate(connection.last_checked)}
                    </span>
                  </span>
                </span>

                <span
                  className={`ml-3 shrink-0 text-xs font-semibold ${meta.text}`}
                >
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border-color bg-bg-secondary p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold">
                  Connection details
                </p>

                <h2 className="mt-1 text-xl font-bold text-text-primary">
                  {selected.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close connection details"
                className="rounded-lg p-1 text-text-muted hover:bg-bg-card hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  (
                    STATUS_META[selected.status] ||
                    STATUS_META.not_configured
                  ).dot
                }`}
              />

              <strong
                className={
                  (
                    STATUS_META[selected.status] ||
                    STATUS_META.not_configured
                  ).text
                }
              >
                {
                  (
                    STATUS_META[selected.status] ||
                    STATUS_META.not_configured
                  ).label
                }
              </strong>

              {selected.account && (
                <span className="text-xs text-text-muted">
                  · {selected.account}
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4 text-xs sm:grid-cols-2">
              <div>
                <p className="font-semibold">Last checked</p>
                <p className="mt-1 text-text-secondary">
                  {formatDate(selected.last_checked)}
                </p>
              </div>

              <div>
                <p className="font-semibold">
                  Last successful sync
                </p>
                <p className="mt-1 text-text-secondary">
                  {formatDate(
                    selected.last_successful_sync,
                  )}
                </p>
              </div>

              <div>
                <p className="font-semibold">
                  Authentication
                </p>
                <p className="mt-1 text-text-secondary">
                  {selected.authentication_status ||
                    'Unknown'}
                </p>
              </div>

              <div>
                <p className="font-semibold">Last failure</p>
                <p className="mt-1 text-text-secondary">
                  {formatDate(selected.last_failure)}
                </p>
              </div>
            </div>

            {(selected.error || selected.reason) && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-bold">What happened</p>
                <p className="mt-1">
                  {selected.error || selected.reason}
                </p>
              </div>
            )}

            {diagnosis && (
              <div className="mt-4 space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <CircleHelp className="h-4 w-4 text-gold" />
                  <p className="font-bold">
                    Hermes diagnosis
                  </p>
                </div>

                <p>
                  <strong>What happened:</strong>{' '}
                  {diagnosis.what_happened}
                </p>

                <p>
                  <strong>Why:</strong> {diagnosis.why}
                </p>

                <p>
                  <strong>Impact:</strong> {diagnosis.impact}
                </p>

                <p>
                  <strong>Recommended action:</strong>{' '}
                  {diagnosis.recommended_action}
                </p>

                <p>
                  <strong>Can Hermes fix it?</strong>{' '}
                  {diagnosis.can_hermes_fix
                    ? 'Yes — Hermes can attempt a safe retry.'
                    : 'No — John must intervene manually.'}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction('test')}
                className="rounded-lg border border-border-color px-3 py-2 text-xs font-semibold hover:bg-bg-card disabled:opacity-50"
              >
                {busy && (
                  <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                )}
                Test connection
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction('diagnose')}
                className="rounded-lg border border-border-color px-3 py-2 text-xs font-semibold hover:bg-bg-card disabled:opacity-50"
              >
                <CircleHelp className="mr-1 inline h-3.5 w-3.5" />
                Ask Hermes to diagnose
              </button>

              {selected.can_auto_fix &&
                selected.status !== 'healthy' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction('fix')}
                    className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-white hover:bg-gold/90 disabled:opacity-50"
                  >
                    {busy && (
                      <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                    )}
                    Fix connection
                  </button>
                )}

              {!selected.can_auto_fix &&
                selected.status !== 'healthy' && (
                  <span className="inline-flex items-center gap-1 px-2 text-xs text-text-muted">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Manual intervention required
                  </span>
                )}
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
