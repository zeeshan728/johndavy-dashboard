'use client';

import React, { useEffect, useRef,useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ArrowUpDown, TriangleAlert } from 'lucide-react';
import { FlowlyOSData, CROFunnel, CROData, materialChangePct } from '@/lib/dataService';
import DateRangeDropdown from './DateRangeDropdown';
import ChartTooltip from './ChartTooltip';
import { currencySymbol, formatDate, formatTime, dubaiDayKey, relativeTimeFrom } from '@/lib/text';

interface FlowlyOSProps {
  data: FlowlyOSData;
}

function formatMoney(
  value: number | null | undefined,
  currency = 'USD'
): string {
  if (value == null) return '—';

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type CROSortKey = 'name' | 'revenue' | 'sales' | 'leads' | 'convRatePct' | 'spend' | 'roas';

// The /api/cro endpoint always returns instantly with whatever range is cached —
// cro.range may not match the requested days right after a switch, and a background
// refresh on the backend brings it in sync within ~45s. We just show a subtle
// "Updating…" hint for that window rather than polling or comparing ranges ourselves.
//
// These are the only ranges Hermes's CRO dashboard actually supports (see
// _map_days_to_mcp_range in hermes-api/server.py) — 7d/30d/90d MCP buckets.
// There's no "Today" tier server-side (a 1-day request just gets the 7d bucket
// scaled down, which isn't real single-day data), and "all" is unreachable
// through /api/flowly's own days param (clamped to a 90-day max), so neither
// is offered here.
const RANGE_DAYS: Record<string, number> = { week: 7, month: 30, quarter: 90 };
const UPDATING_INDICATOR_MS = 45000;

// Hermes doesn't necessarily honour the requested window: the server-side pull asks for
// 7 days (getFlowly(7)) and the payload comes back as "30d". Seeding the selector from a
// hardcoded default therefore had the dropdown reading "Last 7 Days" above a card headed
// "CRO Dashboard (30d)" — two different claims about the same numbers. Derive the initial
// selection from what the payload actually contains instead.
function rangeKeyFor(croRange?: string): string {
  const days = parseInt(croRange ?? '', 10);
  if (days >= 90) return 'quarter';
  if (days >= 30) return 'month';
  if (days >= 7) return 'week';
  return 'month';
}

export default function FlowlyOS({ data }: FlowlyOSProps) {
  const [croSort, setCroSort] = useState<{ key: CROSortKey; dir: 'asc' | 'desc' }>({ key: 'revenue', dir: 'desc' });
  const [range, setRange] = useState(() => rangeKeyFor(data?.cro?.range));
  const [cro, setCro] = useState<CROData | null | undefined>(data?.cro);
  const [isSyncing, setIsSyncing] = useState(false);
  const requestIdRef = useRef(0);
 // Always fetch the selected CRO range on mount and whenever the user changes it.
 // The parent dashboard payload may contain an older snapshot, so it is never
 // authoritative for the CRO card.


  useEffect(() => {
  const days = RANGE_DAYS[range];
  const requestId = ++requestIdRef.current;

  setIsSyncing(true);

  fetch(`/api/cro?days=${days}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`CRO request failed: ${res.status}`);
      }
      return res.json();
    })
    .then((payload) => {
      if (requestId !== requestIdRef.current) return;

      setCro(payload.cro ?? null);
      setIsSyncing(false);
    })
    .catch(() => {
      if (requestId === requestIdRef.current) {
        setIsSyncing(false);
      }
    });
}, [range]);

  // If the server-side pull for the initial payload came back with no CRO data
  // (getFlowly can take ~40s cold and the main dashboard load doesn't wait that
  // long), retry once here instead of leaving "No CRO data available" showing
  // until the user happens to touch the range dropdown.
  useEffect(() => {
    if (data?.cro != null) return;
    const days = RANGE_DAYS[range];
    const requestId = ++requestIdRef.current;
    setIsSyncing(true);
    const clearIndicator = setTimeout(() => {
      if (requestId === requestIdRef.current) setIsSyncing(false);
    }, UPDATING_INDICATOR_MS);
    fetch(`/api/cro?days=${days}`)
      .then((res) => res.json())
      .then((payload) => {
        if (requestId !== requestIdRef.current) return;
        setCro(payload.cro ?? null);
      })
      .catch(() => {
        // keep showing "no data"; the indicator clears on its own timer
      });
    return () => clearTimeout(clearIndicator);
    // Deliberately mount-only — this is a one-time retry for a missing initial
    // payload, not something that should re-run as range/data change (the range
    // effect above already owns re-fetching on range changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedFunnels: CROFunnel[] = [...(cro?.byFunnel || [])].sort((a, b) => {
    const { key, dir } = croSort;
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'string' || typeof bv === 'string') {
      return dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    }
    const an = av ?? -Infinity;
    const bn = bv ?? -Infinity;
    return dir === 'asc' ? an - bn : bn - an;
  });

  const handleCroSort = (key: CROSortKey) => {
    setCroSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const croRevenueChangePct = cro ? materialChangePct(cro.totals.revenue30d, cro.prevTotals.revenue) : null;
  const croRoasChangePct = cro ? materialChangePct(cro.totals.roas, cro.prevTotals.roas) : null;

  // Below 1.0x every pound of ad spend returns less than a pound. Stated as a bare
  // ratio in small red text this reads as a metric; stated as money it reads as what
  // it is — an ongoing loss on paid acquisition.
  const adLoss = cro && cro.totals.roas < 1 ? cro.totals.spend30d - cro.totals.revenue30d : null;

  // Total-level spend/ROAS come from a real Meta Ads pull, but the per-funnel
  // breakdown isn't linked to ad spend at all yet — every funnel always reports
  // spend=0/roas=null, which reads as "this funnel has zero ROAS" rather than
  // "we don't know." Hide those two columns rather than show a misleading £0.00.
  const perFunnelSpendAvailable = sortedFunnels.some((f) => f.spend > 0);

  // The Flowly MCP integration only exposes real numbers for "today" — every other
  // day in leadsDailyTrend is a zero-filled placeholder (isReal: false). Plotting
  // those as a line made the chart look broken (a flat zero line with one spike)
  // rather than communicating "we don't have historical data yet."
  const realLeadPoints = (data.leadsDailyTrend || []).filter((p) => p.isReal);
  const latestRealPoint = realLeadPoints[realLeadPoints.length - 1];
  const isLeadsDataStale = !!latestRealPoint && latestRealPoint.date < dubaiDayKey();

  const rangeOptions = [
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'quarter', label: 'Last 90 Days' },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-5 animate-fade-in-up">
      {/* Card Header */}
      <div className="flex justify-between items-center border-b border-border-color pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gold" />
          <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">
            CRO Dashboard {cro ? `(${cro.range})` : ''}
          </h2>
          {isSyncing && (
            <span className="text-[10px] font-medium text-text-muted normal-case tracking-normal">
              Updating…
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {cro?.fetchedAt && (
            <span className="text-[10px] text-text-muted">
              Updated {formatTime(cro.fetchedAt)}
            </span>
          )}
          <DateRangeDropdown value={range} onChange={setRange} options={rangeOptions} />
        </div>
      </div>

      {!cro ? (
        <div className="text-xs text-text-muted">No CRO data available.</div>
      ) : (
        <>
          {adLoss != null && adLoss > 0 && (
            <div className="border border-red-500/30 bg-red-500/[0.07] rounded-xl p-4 flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-red shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-red">
                  Losing {formatMoney(adLoss, cro.currency)} over the last {cro.range} at {cro.totals.roas.toFixed(2)}x ROAS
                </span>
                <span className="text-xs text-text-secondary">
                  Paid acquisition spent {formatMoney(cro.totals.spend30d, cro.currency)} to return {formatMoney(cro.totals.revenue30d, cro.currency)}.
                  Every {currencySymbol(cro.currency)}1 of spend is bringing back {formatMoney(cro.totals.roas, cro.currency)}.
                </span>
              </div>
            </div>
          )}

          {/* KPI row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg-card border border-border-color p-3 rounded-xl">
              <span className="text-[10px] font-medium text-text-muted uppercase">Revenue</span>
              <div className="text-base font-bold text-text-primary mt-1 tabular-nums">{formatMoney(cro.totals.revenue30d, cro.currency)}</div>
            </div>
            <div className="bg-bg-card border border-border-color p-3 rounded-xl">
              <span className="text-[10px] font-medium text-text-muted uppercase">Sales</span>
              <div className="text-base font-bold text-text-primary mt-1 tabular-nums">{cro.totals.sales30d.toLocaleString()}</div>
            </div>
            <div className="bg-bg-card border border-border-color p-3 rounded-xl">
              <span className="text-[10px] font-medium text-text-muted uppercase">Leads</span>
              <div className="text-base font-bold text-text-primary mt-1 tabular-nums">{cro.totals.leads30d.toLocaleString()}</div>
            </div>
            <div className="bg-bg-card border border-border-color p-3 rounded-xl">
              <span className="text-[10px] font-medium text-text-muted uppercase">Conv Rate</span>
              <div className="text-base font-bold text-text-primary mt-1 tabular-nums">{cro.totals.convRatePct.toFixed(2)}%</div>
            </div>
          </div>

          {/* KPI row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg-card border border-border-color p-3 rounded-xl">
              <span className="text-[10px] font-medium text-text-muted uppercase">Spend</span>
              <div className="text-base font-bold text-text-primary mt-1 tabular-nums">{formatMoney(cro.totals.spend30d, cro.currency)}</div>
            </div>
            <div className="bg-bg-card border border-border-color p-3 rounded-xl">
              <span className="text-[10px] font-medium text-text-muted uppercase">ROAS</span>
              <div className={`text-base font-bold mt-1 ${cro.totals.roas < 1.0 ? 'text-red' : 'text-text-primary'}`}>
                {cro.totals.roas.toFixed(2)}x
              </div>
            </div>
            <div className="bg-bg-card border border-border-color p-3 rounded-xl">
              <span className="text-[10px] font-medium text-text-muted uppercase">CPA</span>
              <div className="text-base font-bold text-text-primary mt-1 tabular-nums">{formatMoney(cro.totals.cpa, cro.currency)}</div>
            </div>
            <div className="bg-bg-card border border-border-color p-3 rounded-xl">
              <span className="text-[10px] font-medium text-text-muted uppercase">CPL</span>
              <div className="text-base font-bold text-text-primary mt-1 tabular-nums">{formatMoney(cro.totals.cpl, cro.currency)}</div>
            </div>
          </div>

          {/* Leads & Sessions Trend */}
          {data.leadsDailyTrend && data.leadsDailyTrend.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Leads &amp; Sessions Trend
              </h3>
              {realLeadPoints.length > 1 ? (
                <div className="bg-bg-card border border-border-color rounded-xl p-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={realLeadPoints} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leads-area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="sessions-area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => formatDate(d, { day: 'numeric', month: 'short' })}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                        axisLine={{ stroke: 'var(--border-color)' }}
                        tickLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={36}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <ChartTooltip
                            active={active}
                            label={typeof label === 'string' ? formatDate(label, { day: 'numeric', month: 'long' }) : undefined}
                            payload={payload?.map((p) => ({
                              name: p.dataKey === 'sessionsTotal' ? 'Sessions' : 'Leads',
                              value: p.value as number,
                              color: p.dataKey === 'sessionsTotal' ? 'var(--accent-blue)' : 'var(--accent-teal)',
                            }))}
                          />
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="sessionsTotal"
                        name="Sessions"
                        stroke="var(--accent-blue)"
                        strokeWidth={2}
                        fill="url(#sessions-area-grad)"
                        animationDuration={700}
                      />
                      <Area
                        type="monotone"
                        dataKey="leadsCaptured"
                        name="Leads"
                        stroke="var(--accent-teal)"
                        strokeWidth={2}
                        fill="url(#leads-area-grad)"
                        animationDuration={700}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                // Flowly's MCP integration only exposes real numbers for "today" — there's
                // no historical per-day data to plot yet, so a line chart here would either
                // be empty or misleadingly flat. Show today's real snapshot as a stat
                // instead, and say plainly why there's no trend line.
                <div className="bg-bg-card border border-border-color rounded-xl p-5 flex flex-col gap-3">
                  {latestRealPoint ? (
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <span className="text-[10px] font-medium text-text-muted uppercase">
                          {isLeadsDataStale ? `As of ${formatDate(latestRealPoint.date)}` : 'Today'}
                        </span>
                        <div className="text-xl font-bold text-teal tabular-nums">
                          {latestRealPoint.leadsCaptured.toLocaleString()} <span className="text-xs font-medium text-text-muted">leads</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-text-muted uppercase">&nbsp;</span>
                        <div className="text-xl font-bold text-blue tabular-nums">
                          {latestRealPoint.sessionsTotal.toLocaleString()} <span className="text-xs font-medium text-text-muted">sessions</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary">No session data available yet.</p>
                  )}
                  <div className="flex items-start gap-2 text-[11px] text-text-muted">
                    <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber" />
                    <span>
                      Flowly&apos;s integration only reports real numbers for the most recent sync — it doesn&apos;t expose historical
                      per-day data. A trend line will build up here as more days are captured.
                      {isLeadsDataStale && latestRealPoint && ` The last successful sync was ${relativeTimeFrom(latestRealPoint.date)}.`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Funnel table */}
          {!perFunnelSpendAvailable && (
            <p className="text-[10px] text-text-muted italic -mt-1">
              Ad spend not yet linked per-funnel — ROAS is only available at the total level above.
            </p>
          )}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-color text-text-muted uppercase font-semibold tracking-wide text-[10px]">
                  {([
                    ['name', 'Funnel'],
                    ['revenue', 'Revenue'],
                    ['sales', 'Sales'],
                    ['leads', 'Leads'],
                    ['convRatePct', 'Conv %'],
                    ...(perFunnelSpendAvailable ? ([['spend', 'Spend'], ['roas', 'ROAS']] as [CROSortKey, string][]) : []),
                  ] as [CROSortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleCroSort(key)}
                      className="py-2.5 pr-3 cursor-pointer select-none hover:text-text-secondary"
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <ArrowUpDown className="w-2.5 h-2.5" />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/60 text-text-secondary">
                {sortedFunnels.map((f, idx) => (
                  <tr key={idx} className="hover:bg-bg-card/60 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-text-primary">{f.name}</td>
                    <td className="py-2.5 pr-3">{formatMoney(f.revenue, cro.currency)}</td>
                    <td className="py-2.5 pr-3">{f.sales.toLocaleString()}</td>
                    <td className="py-2.5 pr-3">{f.leads.toLocaleString()}</td>
                    <td className="py-2.5 pr-3">{f.convRatePct.toFixed(2)}%</td>
                    {perFunnelSpendAvailable && (
                      <>
                        <td className="py-2.5 pr-3">{formatMoney(f.spend, cro.currency)}</td>
                        <td className={`py-2.5 pr-3 font-semibold ${f.roas != null && f.roas < 1.0 ? 'text-red' : ''}`}>
                          {f.roas != null ? `${f.roas.toFixed(2)}x` : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trend */}
          {(croRevenueChangePct != null || croRoasChangePct != null) && (
            <div className="bg-bg-secondary/40 border border-border-color/60 p-3.5 rounded-xl flex flex-col gap-2 text-xs">
              {croRevenueChangePct != null && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">
                    Prev {cro.range}: {formatMoney(cro.prevTotals.revenue, cro.currency)} → Now: {formatMoney(cro.totals.revenue30d, cro.currency)}
                  </span>
                  <span className={`font-bold ${croRevenueChangePct >= 0 ? 'text-green' : 'text-red'}`}>
                    {croRevenueChangePct >= 0 ? '+' : ''}
                    {croRevenueChangePct.toLocaleString(undefined, { maximumFractionDigits: 0 })}%
                  </span>
                </div>
              )}
              {croRoasChangePct != null && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">
                    ROAS prev {cro.range}: {cro.prevTotals.roas.toFixed(2)}x → Now: {cro.totals.roas.toFixed(2)}x
                  </span>
                  <span className={`font-bold ${croRoasChangePct >= 0 ? 'text-green' : 'text-red'}`}>
                    {croRoasChangePct >= 0 ? '+' : ''}
                    {croRoasChangePct.toLocaleString(undefined, { maximumFractionDigits: 0 })}%
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>
  );
}
