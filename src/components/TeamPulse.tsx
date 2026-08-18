'use client';

import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, AlertTriangle, HelpCircle, Clock, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { TeamPulseData, TeamMember } from '@/lib/dataService';
import SourceBadge from './SourceBadge';

interface TeamPulseProps {
  data: TeamPulseData;
}

const SNAPSHOT_KEY = 'teamPulseSnapshot';
type Trend = 'up' | 'down' | 'flat';

// Compares today's pending-task count per person against the last snapshot taken
// on a *different* day (not the previous render) — one comparison per day, so
// re-visiting this tab repeatedly in one sitting doesn't reset the baseline.
// Per the audit spec: ↑ = tasks decreased (good), ↓ = tasks increased (worse).
function useTeamTrend(team: TeamMember[]): Record<string, Trend> {
  const [trendMap, setTrendMap] = useState<Record<string, Trend>>({});

  useEffect(() => {
    if (!team.length) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const current: Record<string, number> = {};
    for (const m of team) current[m.name] = m.pending_tasks ?? 0;

    let stored: { date: string; counts: Record<string, number> } | null = null;
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse team pulse snapshot', e);
    }

    if (stored && stored.date !== todayStr) {
      const next: Record<string, Trend> = {};
      for (const name of Object.keys(current)) {
        const prevCount = stored.counts[name];
        if (prevCount === undefined) continue;
        next[name] = current[name] < prevCount ? 'up' : current[name] > prevCount ? 'down' : 'flat';
      }
      setTrendMap(next);
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ date: todayStr, counts: current }));
    } else if (!stored) {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ date: todayStr, counts: current }));
    }
  }, [team]);

  return trendMap;
}

// Role text is pulled from free-form notes and sometimes carries stray markdown
// (leading "**", "-", bullet characters) — strip that before showing it to John.
function cleanRole(role: string): string {
  const cleaned = role.replace(/^[\s*\-•"]+|[\s*"]+$/g, '').trim();
  return cleaned || 'Team Member';
}

export default function TeamPulse({ data }: TeamPulseProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const trendMap = useTeamTrend(data?.team ?? []);

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'on_track':
        return 'text-green border-green-500/25 bg-green-500/10';
      case 'warning':
        return 'text-amber border-amber-500/25 bg-amber-500/10';
      case 'critical':
        return 'text-red border-red-500/25 bg-red-500/10';
      default:
        return 'text-text-muted border-border-color bg-bg-card';
    }
  };

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="w-3.5 h-3.5 text-green" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber" />;
      case 'critical':
        return <AlertTriangle className="w-3.5 h-3.5 text-red" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  const toggleExpand = (name: string) => {
    if (expandedMember === name) {
      setExpandedMember(null);
    } else {
      setExpandedMember(name);
    }
  };

  const getInitialsRingColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'critical':
        return 'border-red-500 bg-red-500/10 text-red';
      case 'warning':
        return 'border-amber bg-amber/10 text-amber';
      case 'on_track':
        return 'border-green bg-green/10 text-green';
      default:
        return 'border-gold/25 bg-gold/10 text-gold';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-5 animate-fade-in-up">
      {/* Card Header */}
      <div className="flex justify-between items-center border-b border-border-color pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gold" />
          <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">
            Executive Team Pulse
          </h2>
          <SourceBadge dataSource={data?.dataSource} />
        </div>
      </div>

      {/* Grid of Team Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {data?.team?.map((member) => {
          const isExpanded = expandedMember === member.name;
          return (
            <div
              key={member.name}
              className="bg-bg-card border border-border-color rounded-xl hover:bg-bg-card-hover hover:border-gold/30 hover:shadow-sm transition-all duration-200 overflow-hidden"
            >
              {/* Card Summary Header */}
              <div
                onClick={() => toggleExpand(member.name)}
                className="p-4 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 ${getInitialsRingColor(member.status)}`}>
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text-primary flex flex-wrap items-center gap-1.5">
                      <span>{member.name}</span>
                      <span className="flex items-center gap-1">
                        {member.overdueCount > 0 && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red font-bold border border-red-500/20" title={`${member.overdueCount} overdue`}>
                            {member.overdueCount} overdue
                          </span>
                        )}
                        {member.pendingCount !== undefined && member.pendingCount > 0 && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-blue/15 text-blue font-bold border border-blue/20" title={`${member.pendingCount} pending`}>
                            {member.pendingCount} pending
                          </span>
                        )}
                        {trendMap[member.name] && (
                          <span title="Pending task count vs the last time this changed" className="inline-flex">
                            {trendMap[member.name] === 'up' && <ArrowUp className="w-3 h-3 text-green" />}
                            {trendMap[member.name] === 'down' && <ArrowDown className="w-3 h-3 text-red" />}
                            {trendMap[member.name] === 'flat' && <Minus className="w-3 h-3 text-text-muted" />}
                          </span>
                        )}
                      </span>
                    </h3>
                    <span className="text-[11px] text-text-muted">{cleanRole(member.role)}</span>
                    {member.daysSinceLastActivity != null && (
                      <span className="block text-[10px] text-text-muted/80">
                        Last active {member.daysSinceLastActivity === 0 ? 'today' : `${member.daysSinceLastActivity}d ago`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getStatusColor(member.status)}`}>
                    {getStatusIcon(member.status)}
                    <span className="hidden sm:inline">{member.statusLabel}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
                </div>
              </div>

              {/* Expandable Notes Drawer */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-border-color/60 space-y-2">
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                    Updates & Tasks
                  </span>
                  <ul className="space-y-2 text-[11px] text-text-secondary">
                    {member.notes?.map((note, index) => {
                      let itemStyle = '';
                      if (note.includes('🔴')) itemStyle = 'text-red font-medium';
                      else if (note.includes('🟡')) itemStyle = 'text-amber font-medium';
                      else if (note.includes('🟢')) itemStyle = 'text-green';

                      return (
                        <li key={index} className={`flex items-start gap-1.5 leading-relaxed ${itemStyle}`}>
                          <span className="text-gold mt-1">•</span>
                          <span>{note.replace(/^[🔴🟢🟡]\s*/, '')}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {member.overdueCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red bg-red-500/10 border border-red-500/20 p-2 rounded-lg mt-2">
                      <Clock className="w-3 h-3 text-red shrink-0" />
                      <span>Has {member.overdueCount} critical tasks overdue.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
