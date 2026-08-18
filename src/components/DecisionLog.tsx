'use client';

import React, { useMemo, useState } from 'react';
import { ClipboardList, MessageSquare, Mail, Calendar, Video, FileText } from 'lucide-react';
import { DecisionsData, DecisionItem } from '@/lib/dataService';
import { relativeTimeFrom, formatDate } from '@/lib/text';
import DateRangeDropdown from './DateRangeDropdown';

interface DecisionLogProps {
  data: DecisionsData;
}

const SOURCE_LABELS: Record<DecisionItem['sourceType'], string> = {
  gmail: 'Email',
  whatsapp: 'WhatsApp',
  recall: 'Meeting',
  calendar: 'Calendar',
  general: 'Note',
};

const CONFIDENCE_BADGES: Record<NonNullable<DecisionItem['confidence']>, { label: string; className: string }> = {
  high: { label: '✅ High confidence', className: 'bg-emerald-500/12 text-green border-emerald-500/25' },
  medium: { label: '⚠️ Medium confidence', className: 'bg-amber-500/12 text-amber border-amber-500/25' },
  low: { label: '🤖 Low confidence', className: 'bg-bg-card text-text-muted border-border-color' },
};

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '14', label: 'Last 14 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

export default function DecisionLog({ data }: DecisionLogProps) {
  const [range, setRange] = useState('7');

  const visibleDecisions = useMemo(() => {
    const all = data?.allDecisions ?? [];
    if (range === 'all') return all;
    const days = Number(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return all.filter((d) => !d.date || d.date >= cutoffStr);
  }, [data?.allDecisions, range]);
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? 'Last 7 Days';

  const getSourceIcon = (sourceType: DecisionItem['sourceType']) => {
    switch (sourceType) {
      case 'gmail':
        return <Mail className="w-3 h-3 text-blue" />;
      case 'whatsapp':
        return <MessageSquare className="w-3 h-3 text-green" />;
      case 'recall':
        return <Video className="w-3 h-3 text-teal" />;
      case 'calendar':
        return <Calendar className="w-3 h-3 text-amber" />;
      default:
        return <FileText className="w-3 h-3 text-gold" />;
    }
  };

  const getSourceBadgeColor = (sourceType: DecisionItem['sourceType']) => {
    switch (sourceType) {
      case 'gmail':
        return 'bg-blue-500/12 text-blue border-blue-500/25';
      case 'whatsapp':
        return 'bg-emerald-500/12 text-green border-emerald-500/25';
      case 'recall':
        return 'bg-teal-500/12 text-teal border-teal-500/25';
      case 'calendar':
        return 'bg-amber-500/12 text-amber border-amber-500/25';
      default:
        return 'bg-bg-card text-text-muted border-border-color';
    }
  };

  const getSourceBorderColor = (sourceType: DecisionItem['sourceType']) => {
    switch (sourceType) {
      case 'gmail':
        return 'border-blue/50 text-blue bg-blue-500/10';
      case 'whatsapp':
        return 'border-green/50 text-green bg-green-500/10';
      case 'recall':
        return 'border-teal/50 text-teal bg-teal-500/10';
      case 'calendar':
        return 'border-amber/50 text-amber bg-amber-500/10';
      default:
        return 'border-gold/50 text-gold bg-gold/10';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-6 animate-fade-in-up">
      {/* Card Header */}
      <div className="flex justify-between items-center border-b border-border-color pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-gold" />
          <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">
            Decision Log — {rangeLabel}
          </h2>
        </div>
        <DateRangeDropdown value={range} onChange={setRange} options={RANGE_OPTIONS} />
      </div>

      {/* Decision timeline log */}
      <div className="relative border-l border-border-color/80 pl-6 ml-4 my-2 space-y-6">
        {visibleDecisions?.length === 0 && (
          <p className="text-text-muted text-xs italic pl-2">No decisions recorded.</p>
        )}
        {visibleDecisions?.map((decision, idx) => (
          <div key={idx} className="relative group/item">
            {/* Circle dot on the timeline line */}
            <div className={`absolute -left-[37px] top-4.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition-colors duration-150 ${getSourceBorderColor(decision.sourceType)}`}>
              {getSourceIcon(decision.sourceType)}
            </div>

            {/* The main decision entry card */}
            <div className="bg-bg-card border border-border-color/80 rounded-2xl p-5 hover:bg-bg-card-hover hover:border-gold/30 hover:shadow-sm transition-all duration-200 flex flex-col gap-3.5">
              {/* Card Header: Date & Source Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="font-semibold text-text-primary">
                    {formatDate(decision.date, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {relativeTimeFrom(decision.date) && (
                    <span className="text-[10px] opacity-75">· {relativeTimeFrom(decision.date)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {decision.confidence && (
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${CONFIDENCE_BADGES[decision.confidence].className}`}>
                      {CONFIDENCE_BADGES[decision.confidence].label}
                    </span>
                  )}
                  <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${getSourceBadgeColor(decision.sourceType)}`}>
                    {getSourceIcon(decision.sourceType)}
                    <span>{SOURCE_LABELS[decision.sourceType]}</span>
                  </span>
                </div>
              </div>

              {/* Decision Text statement with premium typography */}
              <div className="text-[13px] md:text-sm font-medium text-text-primary leading-relaxed font-serif italic text-left pl-3 border-l-2 border-gold/40">
                &ldquo;{decision.displayText}&rdquo;
              </div>

              {/* Card Footer: Metadata/details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted border-t border-border-color/50 pt-3">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Reference:</span>
                  <span className="font-medium text-text-secondary truncate max-w-[240px] sm:max-w-xs" title={decision.sourceRef}>
                    {decision.source}
                  </span>
                </div>
                {decision.sourceRef && (
                  <span className="font-mono text-[10px] text-text-muted/80 truncate max-w-[240px] sm:max-w-xs" title={decision.sourceRef}>
                    {decision.sourceRef}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
