'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, Minus, Info, X, UserRound } from 'lucide-react';
import { StrategicPriority, DataSource } from '@/lib/dataService';
import SourceBadge from './SourceBadge';
import { formatDate } from '@/lib/text';

interface StrategicPrioritiesProps {
  priorities: StrategicPriority[];
  dataSource?: DataSource;
}

export default function StrategicPriorities({ priorities, dataSource }: StrategicPrioritiesProps) {
  const [selectedPriority, setSelectedPriority] = useState<StrategicPriority | null>(null);

  const now = new Date();
  const periodLabel = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;

  const getStatusBadge = (status: StrategicPriority['status'], label: string) => {
    // These status strings are never short ("1% of monthly target (est. from Flowly)"),
    // so a fixed max-width truncated every one of them mid-word. Wrap to two lines and
    // let the badge size to its content instead.
    const base = 'text-xs font-semibold px-2.5 py-1 rounded-2xl text-right leading-snug max-w-[240px]';
    switch (status) {
      case 'on_track':
        return (
          <span title={label} className={`${base} text-green bg-emerald-500/12 border border-emerald-500/25`}>
            {label}
          </span>
        );
      case 'behind':
        return (
          <span title={label} className={`${base} text-red bg-red-500/12 border border-red-500/25`}>
            {label}
          </span>
        );
      case 'warning':
        return (
          <span title={label} className={`${base} text-amber bg-amber-500/12 border border-amber-500/25`}>
            {label}
          </span>
        );
      default:
        return (
          <span title={label} className={`${base} text-blue bg-blue-500/12 border border-blue-500/25`}>
            {label}
          </span>
        );
    }
  };

  const getTrendIcon = (trend: StrategicPriority['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3.5 h-3.5 text-green" />;
      case 'down':
        return <TrendingDown className="w-3.5 h-3.5 text-red" />;
      case 'flat':
        return <Minus className="w-3.5 h-3.5 text-amber" />;
      default:
        return null;
    }
  };

  const getProgressBarColor = (status: StrategicPriority['status']) => {
    switch (status) {
      case 'on_track':
        return 'bg-green';
      case 'behind':
        return 'bg-red';
      case 'warning':
        return 'bg-amber';
      default:
        return 'bg-gold';
    }
  };

  // Traffic-light left border keyed off raw percentage — independent of Hermes'
  // own `status` field, which reflects pacing logic that doesn't always agree
  // with "how far along is this, visually." A priority at 1% shouldn't look the
  // same as one at 55% just because both happen to carry the same status string.
  const getTrafficLightBorder = (pct: number): string => {
    if (pct < 5) return 'border-l-4 border-l-red-600';
    if (pct < 25) return 'border-l-4 border-l-amber-500';
    if (pct < 50) return 'border-l-4 border-l-yellow-500';
    if (pct < 75) return 'border-l-4 border-l-blue-500';
    return 'border-l-4 border-l-green-500';
  };

  return (
    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-5 animate-fade-in-up">
      {/* Card Header */}
      <div className="flex justify-between items-center border-b border-border-color pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-gold" />
          <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">
            Strategic Priorities — {periodLabel}
          </h2>
          <SourceBadge dataSource={dataSource} />
        </div>
      </div>

      {/* Priorities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {priorities?.map((priority) => {
          let daysRemaining: number | null = null;
          let badgeColor = '';
          let badgeText = '';

          if (priority.deadline) {
            const deadlineDate = new Date(priority.deadline);
            const timeDiff = deadlineDate.getTime() - now.getTime();
            daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysRemaining <= 15) {
              badgeColor = 'bg-red-500/10 text-red border-red-500/20';
            } else if (daysRemaining <= 45) {
              badgeColor = 'bg-amber-500/10 text-amber border-amber-500/20';
            } else {
              badgeColor = 'bg-green-500/10 text-green border-green-500/20';
            }

            if (daysRemaining < 0) {
              badgeText = `Overdue by ${Math.abs(daysRemaining)}d`;
            } else if (daysRemaining === 0) {
              badgeText = 'Due today';
            } else {
              badgeText = `${daysRemaining}d remaining`;
            }
          }

          // Required pace to close the gap by the deadline — doesn't assume any
          // historical rate (we don't know when tracking on this priority started),
          // just current position, target, and time left. Only meaningful once a
          // real deadline and a remaining gap exist.
          const remainingToTarget = priority.target - priority.current;
          const requiredPerDay =
            daysRemaining != null && daysRemaining > 0 && remainingToTarget > 0
              ? remainingToTarget / daysRemaining
              : null;
          // metricLabel is written for "X / Y {metricLabel}" (e.g. "leads/mo (est.)")
          // — strip any parenthetical and existing "/period" suffix before appending
          // our own "/day" so it doesn't read as "leads/mo (est.)/day".
          const paceUnitLabel = (priority.metricLabel || 'units').replace(/\s*\([^)]*\)/g, '').split('/')[0].trim() || 'units';

          // A required pace that exceeds everything achieved to date means a single day
          // would have to beat the entire run so far — that's not a target, it's a prompt
          // to reset the target or the date, and the number only grows each morning.
          // Deliberately compared against cumulative progress rather than a "current run
          // rate": the payload carries no goal start date and no historical series, so any
          // demonstrated-pace figure would be an assumption rather than a measurement.
          // Tighten this once Hermes exposes per-priority history.
          const paceUnreachable = requiredPerDay != null && requiredPerDay > priority.current;

          const isUrgent = daysRemaining != null && daysRemaining < 30 && priority.percentage < 50;

          return (
          <div
            key={priority.id}
            className={`p-4 flex flex-col gap-3 group cursor-pointer bg-bg-card border border-border-color rounded-xl hover:bg-bg-card-hover hover:border-gold/30 hover:shadow-sm transition-all duration-150 ${getTrafficLightBorder(priority.percentage)}`}
            onClick={() => setSelectedPriority(priority)}
          >
            {/* Header info */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gold tracking-wide uppercase">
                    Priority {priority.id}
                  </span>
                  {daysRemaining !== null && (
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${badgeColor}`}>
                      {badgeText}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-gold transition-colors">
                  {isUrgent && <span title="Under 30 days remaining and under 50% complete">🚨 </span>}
                  {priority.name}
                </h3>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {getStatusBadge(priority.status, priority.statusText)}
                {priority.trendText && (
                  <div className="flex items-center gap-1 text-xs text-text-secondary">
                    {getTrendIcon(priority.trend)}
                    <span>{priority.trendText}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics and Progress Bar */}
            <div className="space-y-2">
              {/* Labels */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">
                  Progress: <strong className="text-text-primary">{priority.current.toLocaleString()}</strong> / {priority.target.toLocaleString()}{priority.metricLabel ? ` ${priority.metricLabel}` : ''}
                </span>
                <span className="text-text-primary font-bold">{priority.percentage}%</span>
              </div>
              {/* Bar track */}
              <div className="w-full h-2.5 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(priority.status)}`}
                  style={{ width: `${priority.percentage}%` }}
                ></div>
              </div>
            </div>

            {/* Required pace to close the gap by the deadline */}
            {requiredPerDay != null && (
              <div className="text-xs text-text-secondary bg-bg-secondary px-3 py-1.5 rounded-lg flex items-start gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {paceUnreachable ? (
                    <>
                      <strong className="text-text-primary font-semibold">Unreachable at current pace</strong> — reset the
                      target or the date.
                    </>
                  ) : (
                    <>
                      Needs +{requiredPerDay.toLocaleString(undefined, { maximumFractionDigits: 1 })} {paceUnitLabel}/day to
                      hit target by {formatDate(priority.deadline!)}
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Owner / related project */}
            {(priority.owner || priority.relatedProject) && (
              <div className="text-xs text-text-secondary bg-bg-secondary px-3 py-1.5 rounded-lg flex items-start gap-2">
                <UserRound className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {priority.owner && <strong className="text-text-primary font-semibold">{priority.owner}</strong>}
                  {priority.owner && priority.relatedProject ? ' · ' : ''}
                  {priority.relatedProject}
                </span>
              </div>
            )}

            {/* Additional contextual information */}
            {priority.additionalInfo && (
              <div className="text-xs text-text-secondary bg-bg-secondary px-3 py-1.5 rounded-lg flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                <span className="leading-snug">{priority.additionalInfo}</span>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Priority Details Modal */}
      <AnimatePresence>
      {selectedPriority && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedPriority(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border-color px-5 py-4">
              <h3 className="font-semibold text-gold tracking-tight flex items-center gap-2">
                <Target className="w-4 h-4 text-gold" />
                Priority Details
              </h3>
              <button
                onClick={() => setSelectedPriority(null)}
                className="text-text-muted hover:text-text-primary transition p-1 hover:bg-bg-card rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-gold tracking-wide uppercase">Priority {selectedPriority.id}</span>
                  {selectedPriority.deadline && (
                    <span className="text-[10px] px-2 py-0.5 rounded border border-border-color bg-bg-card font-medium text-text-muted">
                      Deadline: {formatDate(selectedPriority.deadline, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-text-primary mt-1 leading-snug">{selectedPriority.name}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-card border border-border-color/80 p-3.5 rounded-xl">
                  <div className="text-xs text-text-muted">Target</div>
                  <div className="text-lg font-bold text-text-primary mt-1">{selectedPriority.target.toLocaleString()}</div>
                </div>
                <div className="bg-bg-card border border-border-color/80 p-3.5 rounded-xl">
                  <div className="text-xs text-text-muted">Current Progress</div>
                  <div className="text-lg font-bold text-text-primary mt-1">{selectedPriority.current.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Percent Complete</span>
                  <span className="text-text-primary font-bold">{selectedPriority.percentage}%</span>
                </div>
                <div className="w-full h-3 bg-border-color/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getProgressBarColor(selectedPriority.status)}`}
                    style={{ width: `${selectedPriority.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {selectedPriority.owner && (
                  <div className="flex justify-between py-1.5 border-b border-border-color/50">
                    <span className="text-text-secondary">Owner</span>
                    <span className="font-semibold text-text-primary">{selectedPriority.owner}</span>
                  </div>
                )}
                {selectedPriority.relatedProject && (
                  <div className="flex justify-between py-1.5 border-b border-border-color/50">
                    <span className="text-text-secondary">Related Project</span>
                    <span className="font-semibold text-text-primary">{selectedPriority.relatedProject}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-border-color/50">
                  <span className="text-text-secondary">Pacing Health</span>
                  <span className="font-semibold text-text-primary">{selectedPriority.statusText}</span>
                </div>
                {selectedPriority.trendText && (
                  <div className="flex justify-between py-1.5 border-b border-border-color/50">
                    <span className="text-text-secondary">Trend Direction</span>
                    <span className="font-semibold text-text-primary">{selectedPriority.trendText}</span>
                  </div>
                )}
                {selectedPriority.additionalInfo && (
                  <div className="py-2.5 text-text-secondary leading-relaxed bg-bg-card border border-border-color/80 px-3 rounded-lg">
                    <div className="font-semibold text-text-primary text-xs uppercase mb-1">Context Notes</div>
                    {selectedPriority.additionalInfo}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
