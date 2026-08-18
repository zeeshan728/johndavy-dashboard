'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Wallet, Percent, TriangleAlert } from 'lucide-react';
import { RevenueData } from '@/lib/dataService';
import SourceBadge from './SourceBadge';
import ChartTooltip from './ChartTooltip';
import { formatDate, dubaiDayKey, relativeTimeFrom } from '@/lib/text';

interface RevenuePulseProps {
  data?: RevenueData | null;
  loading?: boolean;
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded-lg ${className}`} />;
}

function FullSkeleton() {
  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      {/* Card Header */}
      <div className="flex justify-between items-center border-b border-border-color pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gold/40" />
          <h2 className="text-sm font-semibold text-gold/40 tracking-wide uppercase">Revenue Pulse — Loading...</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonBlock className="h-[88px] rounded-xl" />
        <SkeletonBlock className="h-[88px] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonBlock className="h-[88px] rounded-xl" />
        <SkeletonBlock className="h-[88px] rounded-xl" />
        <SkeletonBlock className="h-[88px] rounded-xl" />
      </div>
      <SkeletonBlock className="h-[160px] rounded-xl" />
    </div>
  );
}

export default function RevenuePulse({ data: propData, loading: propLoading }: RevenuePulseProps) {
  const [range, setRange] = useState('today');
  const [selfData, setSelfData] = useState<RevenueData | null>(null);
  const [selfLoading, setSelfLoading] = useState(!propData);
  const [selfError, setSelfError] = useState<string | null>(null);

  // If no data was passed via props (standalone mode), self-fetch
  useEffect(() => {
    if (propData) {
      setSelfData(null);
      setSelfLoading(false);
      setSelfError(null);
      return;
    }
    let cancelled = false;
    setSelfLoading(true);
    setSelfError(null);
    fetch('/api/revenue')
      .then(async (r) => {
        // A failed upstream call (e.g. Hermes 502/timeout) must not fall through to
        // rendering `data.daily` etc as undefined — that used to render as a
        // confident-looking "AED 0" / "NaN" instead of an honest error.
        if (!r.ok) throw new Error(`Revenue data unavailable (${r.status})`);
        return r.json();
      })
      .then(data => {
        if (!cancelled) {
          // Hermes revenue response has daily, daily_trend, departments etc.
          // Map it into RevenueData format like mapRevenue does
          const trend = data.daily_trend && data.daily_trend.length > 0
            ? data.daily_trend
            : [{ date: new Date().toISOString().slice(0, 10), revenue: data.daily }];
          const last = trend[trend.length - 1]?.revenue ?? data.daily;
          const prev = trend.length > 1 ? trend[trend.length - 2].revenue : last;
          const dailyTrend = prev ? Math.round(((last - prev) / prev) * 100) : 0;

          setSelfData({
            daily: data.daily,
            dailyTrend,
            monthToDate: data.month_to_date,
            monthTarget: data.month_target,
            monthPct: data.month_pct,
            departments: (data.departments || []).map((d: { name: string; monthly: number; pct_target: number; trend_pct?: number }) => ({
              name: d.name,
              monthly: d.monthly,
              pctTarget: d.pct_target,
              trend: d.trend_pct != null ? Math.round(d.trend_pct) : 0,
            })),
            daily7Day: trend.slice(-7).map((t: { date: string; revenue: number }) => t.revenue),
            daily7DayLabels: trend.slice(-7).map((t: { date: string; revenue: number }) =>
              formatDate(t.date, { weekday: 'short' })
            ),
            dailyTrendAll: trend.map((t: { date: string; revenue: number }) => ({ date: t.date, revenue: t.revenue })),
            dailySource: data.daily_source ? { source: data.daily_source.source, fetchedAt: data.daily_source.fetched_at } : undefined,
          });
          setSelfLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setSelfError(err instanceof Error ? err.message : 'Failed to load revenue data');
          setSelfLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [propData]);

  const effectiveData = propData || selfData;
  const effectiveLoading = propLoading || selfLoading;

  if (effectiveLoading) return <FullSkeleton />;

  if (!effectiveData) {
    return (
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
        <DollarSign className="w-8 h-8 text-text-muted" />
        <p className="text-sm text-text-secondary">
          {selfError || "Couldn't load revenue data."}
        </p>
        <p className="text-xs text-text-muted">Try refreshing from the header, or check back shortly.</p>
      </div>
    );
  }

  // ── Full revenue card (existing logic) ──
  const getTrendClass = (trend: number) => {
    if (trend > 0) return 'text-green';
    if (trend < 0) return 'text-red';
    return 'text-text-muted';
  };

  const getTrendString = (trend: number) => {
    if (trend > 0) return `↑ ${trend}%`;
    if (trend < 0) return `↓ ${Math.abs(trend)}%`;
    return '—';
  };

  const periodLabel = formatDate(new Date(), { month: 'long', year: 'numeric' });

  const trendAll = effectiveData?.dailyTrendAll || [];

  // The Supabase sync that feeds this chart can silently stop writing new rows —
  // the query just returns whatever the latest row happens to be, with no signal
  // that it isn't actually today. Compare the newest row's date against Dubai
  // "today" so a stalled pipeline reads as a visible warning instead of a quietly
  // wrong "Today's Revenue" figure.
  const latestTrendDate = trendAll.length > 0 ? trendAll[trendAll.length - 1].date : null;
  const todayKey = dubaiDayKey();
  const isRevenueStale = !!latestTrendDate && latestTrendDate < todayKey;
  const staleFetchedAt = effectiveData?.dailySource?.fetchedAt;

  const sumLast = (n: number) => {
    const slice = trendAll.slice(-n);
    return slice.length > 0 ? slice.reduce((a, t) => a + t.revenue, 0) : null;
  };
  const yesterdayValue = trendAll.length >= 2 ? trendAll[trendAll.length - 2].revenue : null;
  const last7DaysTotal = sumLast(7);
  const last30DaysTotal = sumLast(30);

  const revenueRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday', disabled: yesterdayValue == null },
    { value: '7d', label: 'Last 7 Days', disabled: last7DaysTotal == null },
    { value: '30d', label: 'Last 30 Days', disabled: last30DaysTotal == null },
  ];

  const rangeValueMap: Record<string, number | null | undefined> = {
    today: effectiveData?.daily,
    yesterday: yesterdayValue,
    '7d': last7DaysTotal,
    '30d': last30DaysTotal,
  };

  const rangeLabelMap: Record<string, string> = {
    today: isRevenueStale && latestTrendDate ? `Latest Revenue (${formatDate(latestTrendDate)})` : "Today's Revenue",
    yesterday: "Yesterday's Revenue",
    '7d': 'Last 7 Days Revenue',
    '30d': 'Last 30 Days Revenue',
  };

  const selectedValue = rangeValueMap[range];

  return (
    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-5 animate-fade-in-up">
      <div className="flex justify-between items-center border-b border-border-color pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gold" />
          <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">
            Revenue Pulse — {periodLabel}
          </h2>
          <SourceBadge dataSource={effectiveData?.overallSource} />
        </div>
      </div>

      {isRevenueStale && latestTrendDate && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3.5 py-2.5 text-xs text-amber-700">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber" />
          <span>
            Revenue sync hasn&apos;t picked up new figures since <strong>{formatDate(latestTrendDate, { day: 'numeric', month: 'long' })}</strong>
            {staleFetchedAt ? ` (${relativeTimeFrom(staleFetchedAt)})` : ''} — showing the most recent data available. Check the ingestion pipeline if this persists.
          </span>
        </div>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border-color p-4 rounded-xl flex items-center justify-between hover:border-gold/20 hover:shadow-sm transition-all duration-150">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-muted">{rangeLabelMap[range]}</span>
            </div>
            <div className="text-xl font-bold text-text-primary flex items-baseline tabular-nums">
              AED {selectedValue != null ? selectedValue.toLocaleString() : '—'}
              {range === 'today' && (
                <span className={`text-xs font-semibold ml-2 ${getTrendClass(effectiveData?.dailyTrend || 0)}`}>
                  {getTrendString(effectiveData?.dailyTrend || 0)}
                </span>
              )}
            </div>
          </div>
          <Wallet className="w-8 h-8 text-gold/30" />
        </div>

        <div className="bg-bg-card border border-border-color p-4 rounded-xl flex items-center justify-between hover:border-gold/20 hover:shadow-sm transition-all duration-150">
          <div className="space-y-1">
            <span className="text-xs font-medium text-text-muted">Month-to-Date Progress</span>
            <div className="text-xl font-bold text-text-primary flex items-baseline tabular-nums">
              {effectiveData?.monthPct}%
              <span className="text-xs text-text-muted ml-2">
                {effectiveData?.monthTarget != null ? `of AED ${(effectiveData.monthTarget / 1000).toFixed(0)}K` : ''}
              </span>
            </div>
          </div>
          <Percent className="w-8 h-8 text-emerald-600/30" />
        </div>
      </div>

      {/* Pace & Timeline row */}
      {(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
        const daysRemaining = totalDaysInMonth - today.getDate();
        const remainingTarget = (effectiveData?.monthTarget || 0) - (effectiveData?.monthToDate || 0);
        const requiredDailyTarget = daysRemaining > 0
          ? Math.max(0, remainingTarget / daysRemaining)
          : Math.max(0, remainingTarget);

        // Straight-line projection: extrapolate this month's average daily rate so far
        // across the remaining days. Not a model — just "if the rest of the month looks
        // like the average of the days already booked," so John can see whether today's
        // pace, held flat, clears the target or not.
        const dayOfMonth = today.getDate();
        const avgDailyRateSoFar = dayOfMonth > 0 ? (effectiveData?.monthToDate || 0) / dayOfMonth : 0;
        const projectedMonthEnd = (effectiveData?.monthToDate || 0) + avgDailyRateSoFar * daysRemaining;
        const projectedGap = projectedMonthEnd - (effectiveData?.monthTarget || 0);

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-card border border-border-color p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Pace & Timeline</span>
                <div className="text-lg font-bold text-text-primary">{daysRemaining} days remaining</div>
                <span className="text-[10px] text-text-muted">Month ends in {daysRemaining} days</span>
              </div>
            </div>
            <div className="bg-bg-card border border-border-color p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Required Daily Pace</span>
                {remainingTarget <= 0 ? (
                  <>
                    <div className="text-lg font-bold text-green">✅ On track</div>
                    <span className="text-[10px] text-text-muted">No catch-up needed to hit AED {(effectiveData?.monthTarget || 0).toLocaleString()} target</span>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold text-red">
                      AED {requiredDailyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}/day
                    </div>
                    <span className="text-[10px] text-text-muted">Needed to hit AED {(effectiveData?.monthTarget || 0).toLocaleString()} target</span>
                  </>
                )}
              </div>
            </div>
            <div className="bg-bg-card border border-border-color p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Today vs Yesterday</span>
                <div className="text-lg font-bold text-text-primary flex items-baseline gap-1.5">
                  <span>AED {(effectiveData?.daily || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="text-xs text-text-muted">vs</span>
                  <span className="text-xs text-text-secondary font-medium">
                    AED {yesterdayValue != null ? yesterdayValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted">
                  {yesterdayValue != null && effectiveData?.daily != null
                    ? `${((effectiveData.daily - yesterdayValue) >= 0 ? '+' : '')}${(((effectiveData.daily - yesterdayValue) / (yesterdayValue || 1)) * 100).toFixed(1)}% change`
                    : 'No historical comparison data'}
                </span>
              </div>
            </div>
            <div className="bg-bg-card border border-border-color p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Projected Month-End</span>
                <div className={`text-lg font-bold ${projectedGap >= 0 ? 'text-green' : 'text-red'}`}>
                  AED {projectedMonthEnd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[10px] text-text-muted">
                  {projectedGap >= 0
                    ? `+AED ${projectedGap.toLocaleString(undefined, { maximumFractionDigits: 0 })} above target, at today's average pace`
                    : `AED ${Math.abs(projectedGap).toLocaleString(undefined, { maximumFractionDigits: 0 })} short of target, at today's average pace`}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Department Breakdown — only shown once Hermes actually returns a per-department
          split; the Month-to-Date Progress card above already covers the total. */}
      {effectiveData?.departments && effectiveData.departments.length > 0 && (
        <>
          <div className="md:hidden space-y-2">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Department Breakdown</h3>
            {effectiveData.departments.map((dept, idx) => (
              <div key={idx} className="bg-bg-card border border-border-color p-3 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">{dept.name}</span>
                  <span className="font-bold text-text-primary">AED {dept.monthly.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${dept.pctTarget}%` }}></div>
                  </div>
                  <span className="text-text-secondary w-9 text-right shrink-0">{dept.pctTarget}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-color text-text-muted uppercase font-semibold tracking-wide text-[10px]">
                  <th className="py-2.5">Department</th>
                  <th className="py-2.5 text-right">This Month</th>
                  <th className="py-2.5 pl-6 pr-2">vs Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/60 text-text-secondary">
                {effectiveData.departments.map((dept, idx) => (
                  <tr key={idx} className="hover:bg-bg-card/60 transition-colors">
                    <td className="py-2.5 font-semibold text-text-primary">{dept.name}</td>
                    <td className="py-2.5 text-right text-text-primary">AED {dept.monthly.toLocaleString()}</td>
                    <td className="py-2.5 pl-6 pr-2">
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-right shrink-0">{dept.pctTarget}%</span>
                        <div className="flex-1 min-w-[50px] h-1.5 bg-bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-gold rounded-full" style={{ width: `${dept.pctTarget}%` }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border-color font-semibold text-text-primary bg-bg-card/60">
                  <td className="py-3 font-bold">Total</td>
                  <td className="py-3 text-right text-gold font-bold">AED {effectiveData?.monthToDate?.toLocaleString()}</td>
                  <td className="py-3 pl-6 pr-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-right shrink-0 font-bold">{effectiveData?.monthPct}%</span>
                      <div className="flex-1 min-w-[50px] h-2 bg-bg-card rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${effectiveData?.monthPct}%` }}></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Revenue Trend Chart — real Recharts area chart over the full history Hermes returns */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          Revenue Trend {trendAll.length > 7 ? `(Last ${trendAll.length} Days)` : ''}
          {isRevenueStale && latestTrendDate && (
            <span className="normal-case font-normal text-amber ml-2">· through {formatDate(latestTrendDate)}, sync delayed</span>
          )}
        </h3>
        <div className="bg-bg-card border border-border-color rounded-xl p-4">
          {trendAll.length < 2 ? (
            <div className="h-64 flex items-center justify-center text-xs text-text-muted">No trend data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendAll} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenue-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity={0} />
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
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
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
                  fill="url(#revenue-area-grad)"
                  activeDot={{ r: 4, fill: 'var(--accent-gold)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
