'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Download, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Clock, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { DashboardPayload } from '@/lib/dataService';
import { timeGreeting, formatTime, formatDate } from '@/lib/text';

interface MorningBriefProps {
  data: DashboardPayload;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export default function MorningBrief({ data, onRefresh, isRefreshing }: MorningBriefProps) {
  const [showRawReport, setShowRawReport] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const formatSectionBody = (bodyText: string) => {
    const lines = bodyText.split('\n');
    return (
      <div className="space-y-3 pt-3">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lineIdx} className="h-1.5" />;

          // Check for subheaders
          const isHeader = (trimmed.startsWith('**') && trimmed.endsWith('**')) || 
                           (trimmed.startsWith('**') && trimmed.includes(':**')) ||
                           (trimmed.endsWith(':') && trimmed.length < 50 && !trimmed.startsWith('-') && !trimmed.startsWith('*')) ||
                           /^[A-Z0-9\s().&,-]{4,}:?$/.test(trimmed.replace(/\*/g, ''));

          if (isHeader) {
            const cleanText = trimmed.replace(/\*\*/g, '').replace(/:$/, '').trim();
            return (
              <h5 key={lineIdx} className="text-xs font-bold text-gold tracking-wide uppercase mt-4 mb-2 first:mt-1 font-sans">
                {cleanText}
              </h5>
            );
          }

          // Check for bullet lists
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const cleanText = trimmed.replace(/^[-*]\s*/, '');
            const html = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>');
            return (
              <div key={lineIdx} className="flex items-start gap-2 pl-3 text-xs text-text-secondary leading-relaxed">
                <span className="text-gold shrink-0 select-none mt-1.5 text-[9px]">•</span>
                <span dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            );
          }

          // Normal paragraphs
          const html = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>');
          return (
            <p 
              key={lineIdx} 
              className="text-xs text-text-secondary leading-relaxed pl-1"
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          );
        })}
      </div>
    );
  };

  const handleDownloadFullReport = () => {
    const date = formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' });
    const markdown = `# CEO Full Report - ${date}

## Revenue
- Today: AED ${data.revenue?.daily?.toLocaleString()}
- Month-to-date: AED ${data.revenue?.monthToDate?.toLocaleString()} of AED ${data.revenue?.monthTarget?.toLocaleString()} (${data.revenue?.monthPct}%)
${data.revenue?.departments?.map((d) => `- ${d.name}: AED ${d.monthly.toLocaleString()} (${d.pctTarget}% of target)`).join('\n') ?? ''}

## Strategic Priorities
${data.strategic.priorities.map((p) => `- **${p.name}**: ${p.current.toLocaleString()} / ${p.target.toLocaleString()} ${p.metricLabel} (${p.percentage}%) — ${p.statusText}`).join('\n')}

## Team Pulse
${data.teamPulse.team.map((m) => `- **${m.name}** (${m.role}): ${m.statusLabel}`).join('\n')}

## Decisions (Last 7 Days)
${data.decisions.decisions.length > 0 ? data.decisions.decisions.map((d) => `- ${d.displayText} — ${d.source}`).join('\n') : '- No decisions recorded'}

## Blockers
${data.flowly?.blockers?.length ? data.flowly.blockers.map((b) => `- ${b}`).join('\n') : '- No active blockers'}

## Opportunities
${data.briefing?.highlights?.opportunities?.length ? data.briefing.highlights.opportunities.map((o) => `- ${o}`).join('\n') : '- None flagged'}

---
Generated from live Hermes data at ${new Date().toISOString()}
`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CEO_Full_Report_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleScheduleMeeting = () => {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Meeting with executive team',
      details: 'Scheduled from the CEO Dashboard',
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const handleRegenerate = async () => {
    try {
      // Dedicated trigger for the briefing cron itself (not just tasks/revenue).
      await fetch('/api/briefing/refresh', { method: 'POST' });
    } catch (e) {
      console.warn('Briefing refresh trigger failed:', e);
    }
    if (onRefresh) {
      await onRefresh();
    }
  };

  const handleDownloadBrief = async () => {
    try {
      const res = await fetch('/api/actions/daily-brief', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate daily brief');
      const payload = await res.json();
      
      const blob = new Blob([payload.markdown], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CEO_Daily_Brief_${new Date().toISOString().slice(0, 10)}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error downloading daily brief report.');
    }
  };

  const hasBriefing = data.briefing && data.briefing.available;

  const footerSummary = data.overview.overdueTasks > 0
    ? `You have ${data.overview.overdueTasks} overdue task(s) requiring attention. Core connections (${data.meta.activeIntegrationsCount} active) are functioning.`
    : `Nothing overdue right now. Core connections (${data.meta.activeIntegrationsCount} active) are green. Focus on driving progress for your strategic priorities, including leads and certifications.`;

  const generationTime = hasBriefing && data.briefing.generated_at
    ? formatTime(data.briefing.generated_at, { timeZoneName: 'short' })
    : (data.overview.lastUpdated
        ? formatTime(data.overview.lastUpdated, { timeZoneName: 'short' })
        : 'recently');

  const headline = hasBriefing && data.briefing.highlights.headline
    ? data.briefing.highlights.headline
    : 'CEO Daily Briefing Snapshot';

  const revenueTrendStr = (data.revenue?.dailyTrend || 0) > 0
    ? `up ${data.revenue.dailyTrend}% vs yesterday`
    : (data.revenue?.dailyTrend || 0) < 0
    ? `down ${Math.abs(data.revenue.dailyTrend)}% vs yesterday`
    : 'flat vs yesterday';

  // The brief sometimes reaches a position ("9. OVERALL VERDICT: LEANING YES") — that's
  // the AI committing to a recommendation on something material, and it was sitting
  // behind two expand clicks at the bottom of an accordion. Pull those to the top.
  const verdictSections = (hasBriefing && data.briefing.sections
    ? data.briefing.sections.filter((s) => /verdict|recommendation/i.test(s.heading))
    : []
  ).map((s) => {
    // "9. OVERALL VERDICT: LEANING YES" — split the call off the heading so it can be
    // rendered as the headline it is.
    const cleaned = s.heading.replace(/^\s*\d+[.)]\s*/, '');
    const [label, ...rest] = cleaned.split(':');
    return { label: label.trim(), call: rest.join(':').trim(), body: s.body };
  });

  const topDepartment = data.revenue?.departments
    ? [...data.revenue.departments].sort((a, b) => b.trend - a.trend)[0]
    : undefined;
  const topDepartmentText = topDepartment
    ? topDepartment.trend >= 0
      ? `${topDepartment.name} is leading momentum this month (↑ ${topDepartment.trend}%).`
      : `${topDepartment.name} is holding up best this month, though still down ${Math.abs(topDepartment.trend)}%.`
    : '';

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col gap-6 animate-fade-in-up">
      {/* Brief Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-color pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">
            AI Morning Brief
          </h2>
          <span className="text-xs text-text-muted">
            — Generated at {generationTime}
          </span>
          {hasBriefing && data.briefing.age_hours > 0 && (
            <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-medium">
              {data.briefing.age_hours.toFixed(1)}h ago ({data.briefing.fresh ? 'Fresh' : 'Stale'})
            </span>
          )}
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 hover:bg-gold/15 text-gold rounded-full text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Analyzing...' : 'Regenerate'}
        </button>
      </div>

      {/* Intro Greetings */}
      <div className="space-y-1">
        <h3 className="font-serif text-xl md:text-2xl font-medium text-text-primary leading-tight">
          {timeGreeting('John Davy')}
        </h3>
        <p className="text-sm text-gold font-medium">
          {headline}
        </p>
        <p className="text-xs text-text-secondary leading-relaxed max-w-4xl pt-0.5">
          A structured briefing pulled together from your inbox, calendar, tasks, and revenue feeds.
        </p>
      </div>

      {/* Headline verdicts — surfaced above the executive blocks instead of being
          buried in the collapsed section list at the bottom. */}
      {verdictSections.map((v, idx) => (
        <div key={idx} className="border border-gold/30 bg-gold/[0.06] rounded-2xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-4 h-4 text-gold shrink-0" />
            <span className="text-xs font-bold text-gold uppercase tracking-wider">{v.label}</span>
            {v.call && (
              <span className="text-[11px] font-bold uppercase tracking-wide bg-gold/15 text-gold px-2 py-0.5 rounded-full">
                {v.call}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
            {v.body.split('\n').slice(0, 4).join('\n')}
          </p>
          <button
            onClick={() => {
              setShowRawReport(true);
              setExpandedSection(data.briefing!.sections!.findIndex((s) => s.body === v.body));
            }}
            className="self-start flex items-center gap-1 text-[11px] font-semibold text-gold hover:underline cursor-pointer"
          >
            Read the full reasoning <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* The 4 Executive Bullet Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Block 1: 💰 REVENUE */}
        <div className="bg-bg-card border border-border-color/80 hover:border-gold/20 p-5 rounded-2xl flex flex-col gap-3 transition">
          <div className="flex items-center justify-between border-b border-border-color pb-2">
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span>💰 REVENUE</span>
            </div>
            <span className="text-[10px] text-text-muted">Revenue Snapshot</span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-text-muted uppercase font-semibold">Today&apos;s revenue (Emirates NBD)</p>
            <h4 className="text-2xl font-serif font-bold text-text-primary tabular-nums">
              AED {data.revenue?.daily?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="space-y-2 mt-2">
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2 text-text-secondary">
                <span className="text-gold shrink-0 mt-1">•</span>
                <span>Today&apos;s revenue is {revenueTrendStr}.</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <span className="text-gold shrink-0 mt-1">•</span>
                <span>Month-to-date at {data.revenue?.monthPct}% of target (AED {data.revenue?.monthToDate?.toLocaleString()}).</span>
              </li>
              {topDepartment && (
                <li className="flex items-start gap-2 text-text-secondary">
                  <span className="text-gold shrink-0 mt-1">•</span>
                  <span>{topDepartmentText}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Block 2: ⚡ DECISIONS PENDING */}
        <div className="bg-bg-card border border-border-color/80 hover:border-gold/20 p-5 rounded-2xl flex flex-col gap-3 transition">
          <div className="flex items-center justify-between border-b border-border-color pb-2">
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-gold" />
              <span>⚡ DECISIONS PENDING</span>
            </div>
            <span className="text-[10px] bg-amber/15 text-amber px-2 py-0.5 rounded-full font-semibold">
              {data.decisions.decisions.length} Items
            </span>
          </div>
          <div className="space-y-2 mt-2">
            {data.decisions.decisions.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {data.decisions.decisions.slice(0, 3).map((decision, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-text-secondary leading-relaxed">
                    <span className="text-gold shrink-0 mt-1">•</span>
                    <span>{decision.displayText}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted text-xs italic text-center">No decisions pending John.</p>
            )}
          </div>
        </div>

        {/* Block 3: 🚧 BLOCKERS */}
        <div className="bg-bg-card border border-border-color/80 hover:border-gold/20 p-5 rounded-2xl flex flex-col gap-3 transition">
          <div className="flex items-center justify-between border-b border-border-color pb-2">
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider">
              <XCircle className="w-4 h-4 text-red" />
              <span>🚧 BLOCKERS</span>
            </div>
            <span className="text-[10px] bg-red/15 text-red px-2 py-0.5 rounded-full font-semibold">
              {((data.briefing?.highlights?.blockers?.length || 0) + (data.tasks?.overdue?.length > 0 ? 1 : 0) + (data.overview.connections.calendar === 'blocked' ? 1 : 0))} Items
            </span>
          </div>
          <div className="space-y-2 mt-2">
            <ul className="space-y-2 text-xs">
              {data.overview.connections.calendar === 'blocked' && (
                <li className="flex items-start gap-2 text-text-secondary">
                  <span className="text-red shrink-0 mt-1">•</span>
                  <span className="font-semibold text-text-primary">Google Calendar OAuth is expired: sync is blocked.</span>
                </li>
              )}
              {data.briefing?.highlights?.blockers && data.briefing.highlights.blockers.slice(0, 2).map((blocker, idx) => (
                <li key={idx} className="flex items-start gap-2 text-text-secondary">
                  <span className="text-red shrink-0 mt-1">•</span>
                  <span>{blocker}</span>
                </li>
              ))}
              {data.tasks?.overdue?.length > 0 && (
                <li className="flex items-start gap-2 text-text-secondary">
                  <span className="text-red shrink-0 mt-1">•</span>
                  <span>{data.tasks.overdue.length} overdue tasks pending assignees in Asana.</span>
                </li>
              )}
              {!data.briefing?.highlights?.blockers?.length && data.overview.connections.calendar !== 'blocked' && data.tasks?.overdue?.length === 0 && (
                <li className="flex items-start gap-2 text-text-secondary">
                  <span className="text-green shrink-0 mt-1">•</span>
                  <span>No active blockers or critical risks.</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Block 4: 🎯 OPPORTUNITIES */}
        <div className="bg-bg-card border border-border-color/80 hover:border-gold/20 p-5 rounded-2xl flex flex-col gap-3 transition">
          <div className="flex items-center justify-between border-b border-border-color pb-2">
            <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-green" />
              <span>🎯 OPPORTUNITIES</span>
            </div>
            <span className="text-[10px] text-text-muted">
              {data.briefing?.highlights?.opportunities?.length || 0} Items
            </span>
          </div>
          <div className="space-y-2 mt-2">
            <ul className="space-y-2 text-xs">
              {data.briefing?.highlights?.opportunities && data.briefing.highlights.opportunities.slice(0, 3).map((opp, idx) => (
                <li key={idx} className="flex items-start gap-2 text-text-secondary">
                  <span className="text-green shrink-0 mt-1">•</span>
                  <span>{opp}</span>
                </li>
              ))}
              {(!data.briefing?.highlights?.opportunities || data.briefing.highlights.opportunities.length === 0) && (
                <li className="flex items-start gap-2 text-text-secondary">
                  <span className="text-green shrink-0 mt-1">•</span>
                  <span>Review strategic priorities for growth opportunities.</span>
                </li>
              )}
            </ul>
          </div>
        </div>

      </div>

      {/* Raw Report Details Expandable Toggle */}
      {hasBriefing && data.briefing.sections && data.briefing.sections.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowRawReport(!showRawReport)}
            className="w-full flex justify-between items-center px-4 py-3 bg-bg-card border border-border-color hover:border-gold/30 rounded-xl font-semibold text-xs text-gold uppercase tracking-wider transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {showRawReport ? 'Hide Full Strategy Report Details' : 'Show Full Strategy Report Details'}
            </span>
            {showRawReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showRawReport && (
            <div className="space-y-3 mt-4 animate-fade-in-up">
              {data.briefing.sections.map((section, idx) => {
                const isExpanded = expandedSection === idx;
                return (
                  <div key={idx} className="bg-bg-card border border-border-color hover:border-gold/20 rounded-xl overflow-hidden transition-all duration-200">
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : idx)}
                      className="w-full flex justify-between items-center p-4 text-left font-serif text-sm font-medium text-text-primary hover:bg-bg-card-hover transition"
                    >
                      <span className="text-gold font-sans font-semibold tracking-wide uppercase text-xs">
                        {section.heading}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                    </button>
                    {isExpanded && (
                      <div className="p-5 pt-1 border-t border-border-color/40 bg-bg-secondary/40 pb-5">
                        {formatSectionBody(section.body)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Brief Summary Footer */}
      <div className="border-t border-border-color pt-4">
        <p className="text-sm italic text-text-secondary leading-relaxed border-l-2 border-gold pl-3">
          {footerSummary}
        </p>
      </div>

      {/* Interactive Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border-color pt-4">
        <button
          onClick={handleDownloadFullReport}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-card hover:bg-bg-card-hover border border-border-color hover:border-gold/30 text-text-primary hover:text-gold rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-gold" />
          Full Report <span className="text-[10px] text-text-muted font-normal ml-0.5">Revenue, team, decisions</span>
        </button>

        <button
          onClick={handleDownloadBrief}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-card hover:bg-bg-card-hover border border-border-color hover:border-gold/30 text-text-primary hover:text-gold rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          <FileText className="w-4 h-4 text-amber-600" />
          Daily Brief PDF <span className="text-[10px] text-text-muted font-normal ml-0.5">Download Report</span>
        </button>

        <button
          onClick={handleScheduleMeeting}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-card hover:bg-bg-card-hover border border-border-color hover:border-gold/30 text-text-primary hover:text-gold rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-blue" />
          Schedule meeting <span className="text-[10px] text-text-muted font-normal ml-0.5">Opens Google Calendar</span>
        </button>
      </div>
    </div>
  );
}
