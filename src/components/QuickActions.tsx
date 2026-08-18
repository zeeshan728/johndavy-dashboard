'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Video, BarChart2, BookOpen, Search, RefreshCw, X } from 'lucide-react';
import { DashboardPayload } from '@/lib/dataService';
import { formatDate, dubaiMinutes } from '@/lib/text';
import { SectionId } from './Sidebar';

interface QuickActionsProps {
  data: DashboardPayload | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  sidebarCollapsed: boolean;
  activeSection: SectionId;
}

type ActionId = 'meeting' | 'report' | 'daily' | 'search';

const ACTION_CATALOG: Record<ActionId, { id: ActionId; label: string; icon: React.ElementType; iconClass: string }> = {
  meeting: { id: 'meeting', label: 'Meetings', icon: Video, iconClass: 'text-blue' },
  report: { id: 'report', label: 'Full Report', icon: BarChart2, iconClass: 'text-emerald-600' },
  daily: { id: 'daily', label: 'Daily Brief', icon: BookOpen, iconClass: 'text-amber-600' },
  search: { id: 'search', label: 'Search Notes', icon: Search, iconClass: 'text-teal' },
};

interface VaultSearchResult {
  brain: string;
  path: string;
  snippet: string;
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildFinancialPack(data: DashboardPayload): string {
  const date = formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' });
  const { revenue } = data;
  return `# Financial Pack - ${date}

## Revenue Summary
- Today's revenue: AED ${revenue.daily.toLocaleString()} (${revenue.dailyTrend >= 0 ? '+' : ''}${revenue.dailyTrend}% vs prior day)
- Month-to-date: AED ${revenue.monthToDate.toLocaleString()} of AED ${revenue.monthTarget.toLocaleString()} target (${revenue.monthPct}%)

## Department Breakdown
${revenue.departments.map((d) => `- **${d.name}**: AED ${d.monthly.toLocaleString()} (${d.pctTarget}% of target, ${d.trend >= 0 ? '+' : ''}${d.trend}% vs last month)`).join('\n')}

## Daily Trend (Last 7 Days)
${revenue.daily7Day.map((v, i) => `- ${revenue.daily7DayLabels[i]}: AED ${v.toLocaleString()}`).join('\n')}

---
Generated from live Hermes data at ${new Date().toISOString()}
`;
}

function buildMarketingPack(data: DashboardPayload): string {
  const date = formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' });
  const { flowly, strategic } = data;
  const marketingPriorities = strategic.priorities.filter((p) =>
    /lead|coach|conversion/i.test(p.name)
  );
  return `# Marketing Cohort Conversion Report - ${date}

## Flowly OS Snapshot
- Funnels active: ${flowly.funnelsActive.toLocaleString()}
- Leads captured: ${flowly.leadsCaptured.toLocaleString()}
- Conversion rate: ${flowly.conversionRatePct}%

## Recent Platform Activity
${flowly.recentActivity.map((a) => `- ${a}`).join('\n')}

${marketingPriorities.length > 0 ? `## Related Strategic Priorities
${marketingPriorities.map((p) => `- **${p.name}**: ${p.current.toLocaleString()} / ${p.target.toLocaleString()} ${p.metricLabel} (${p.percentage}%) — ${p.statusText}`).join('\n')}
` : ''}
${flowly.blockers.length > 0 ? `## Blockers
${flowly.blockers.map((b) => `- ${b}`).join('\n')}
` : ''}
---
Generated from live Hermes data at ${new Date().toISOString()}
`;
}

export default function QuickActions({ data, onRefresh, isRefreshing, sidebarCollapsed, activeSection }: QuickActionsProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [dockVisible, setDockVisible] = useState(true);

  // The dock is fixed to the viewport, so it inevitably sits on top of whatever
  // card happens to be scrolled underneath it — hide it on scroll-down (reading)
  // and bring it back on scroll-up (intent to act) so it stops covering content.
  React.useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY;
      const nearTop = y < 80;
      const nearBottom = y + window.innerHeight >= document.documentElement.scrollHeight - 80;
      setDockVisible(!goingDown || nearTop || nearBottom);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VaultSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  const [briefSending, setBriefSending] = useState(false);
  const [briefResult, setBriefResult] = useState<string | null>(null);

  const [dailyBriefText, setDailyBriefText] = useState('');
  const [dailyBriefLoading, setDailyBriefLoading] = useState(false);
  const [dailyBriefError, setDailyBriefError] = useState<string | null>(null);

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleActionClick = (actionId: string) => {
    if (actionId === 'refresh') {
      onRefresh();
      return;
    }

    setActiveModal(actionId);

    if (actionId === 'search') {
      setSearchResults([]);
      setSearchQuery('');
      setSearchError(null);
      setExpandedResult(null);
    }

    if (actionId === 'brief') {
      setBriefResult(null);
    }

    if (actionId === 'daily') {
      setCopyStatus('idle');
    }

    if (actionId === 'daily') {
      setDailyBriefError(null);
      setDailyBriefLoading(true);
      fetch('/api/actions/daily-brief', { method: 'POST' })
        .then(async (res) => {
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error || 'Failed to generate daily brief');
          setDailyBriefText(payload.markdown);
        })
        .catch((err) => setDailyBriefError(err instanceof Error ? err.message : 'Failed to generate daily brief'))
        .finally(() => setDailyBriefLoading(false));
    }
  };

  const handleBriefJohn = async () => {
    setBriefSending(true);
    try {
      const res = await fetch('/api/actions/brief-john', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to send briefing');
      setBriefResult(payload.message);
    } catch (err) {
      setBriefResult(err instanceof Error ? `Error: ${err.message}` : 'Error sending briefing');
    } finally {
      setBriefSending(false);
    }
  };

  const parseEventMinutes = (t: string) => {
    if (!t) return NaN;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  // Event times are Dubai-local, so "now" has to be too — otherwise "next meeting"
  // and the "in Nm" badge are wrong for any viewer outside Dubai.
  const nowMinutes = dubaiMinutes(new Date());
  // dataService already scopes calendar.events to today (Dubai time) and sorts by time.
  const todaysEvents = data?.calendar?.events || [];
  const nextEvent = todaysEvents
    .filter((e) => parseEventMinutes(e.time) >= nowMinutes)
    .sort((a, b) => parseEventMinutes(a.time) - parseEventMinutes(b.time))[0];
  // Calendar events carry no conferencing link, so this dock button can't actually
  // join a call — it opens today's meeting list instead. Only flag urgency when
  // something is genuinely imminent, rather than always implying "join now."
  const minutesToNext = nextEvent ? parseEventMinutes(nextEvent.time) - nowMinutes : null;
  const nextEventImminent = minutesToNext != null && minutesToNext >= 0 && minutesToNext <= 15;

  // "Search Notes" and "Daily Brief" don't belong on Revenue Pulse. Each page gets the
  // one or two actions that make sense there; Brief John and Refresh are universal and
  // are rendered separately after the divider.
  const SECTION_ACTIONS: Partial<Record<SectionId, ActionId[]>> = {
    overview: ['meeting', 'daily'],
    brief: ['daily', 'search'],
    revenue: ['report'],
    flowly: ['report'],
    priorities: ['report', 'search'],
    team: ['meeting', 'search'],
    decisions: ['search'],
    projects: ['search'],
  };

  const contextualActions = (SECTION_ACTIONS[activeSection] ?? ['meeting', 'daily']).map(
    (id) => ACTION_CATALOG[id]
  );

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/actions/search-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Search failed');
      setSearchResults(payload.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Dock — the wrapper spans the content column (matching the
          page's own sidebar padding) and centres the dock inside it. Centring on the
          viewport instead left it visibly off-centre and overlapping the sidebar edge.
          The wrapper is click-through so it doesn't block the page either side. */}
      <div
        className={`fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'
        }`}
      >
        <div
          className={`pointer-events-auto max-w-full overflow-x-auto custom-scrollbar glass-card rounded-full px-5 py-3 shadow-lg flex items-center gap-2 md:gap-4 transition-all duration-300 ${
            dockVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
          }`}
        >
          {contextualActions.map(({ id, label, icon: Icon, iconClass }) => (
            <button
              key={id}
              onClick={() => handleActionClick(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-bg-card rounded-full text-xs font-semibold text-text-primary transition cursor-pointer shrink-0 ${
                id === 'meeting' && nextEventImminent ? 'bg-blue/10' : ''
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
              <span className="hidden sm:inline">{label}</span>
              {id === 'meeting' && nextEventImminent && (
                <span className="text-[9px] font-bold text-blue bg-blue/15 px-1.5 py-0.5 rounded-full">
                  in {minutesToNext}m
                </span>
              )}
            </button>
          ))}

          <div className="w-px h-5 bg-border-color hidden sm:block shrink-0"></div>

          <button
            onClick={() => handleActionClick('brief')}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-bg-card rounded-full text-xs font-semibold text-text-primary transition cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-gold" />
            <span className="hidden sm:inline">Brief John</span>
          </button>

          <button
            onClick={() => handleActionClick('refresh')}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 hover:bg-gold/15 text-gold rounded-full text-xs font-semibold transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh All</span>
          </button>
        </div>
      </div>

      {/* Action Modals */}
      <AnimatePresence>
      {activeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-color px-5 py-4">
              <h3 className="font-semibold text-gold tracking-tight capitalize flex items-center gap-2">
                {activeModal === 'brief' && <Send className="w-4 h-4" />}
                {activeModal === 'meeting' && <Video className="w-4 h-4 text-blue" />}
                {activeModal === 'report' && <BarChart2 className="w-4 h-4 text-emerald-600" />}
                {activeModal === 'daily' && <BookOpen className="w-4 h-4 text-amber-600" />}
                {activeModal === 'search' && <Search className="w-4 h-4 text-teal" />}
                {activeModal === 'meeting' ? "Today's Meetings" : `${activeModal} Actions`}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-text-muted hover:text-text-primary transition p-1 hover:bg-bg-card rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-sm text-text-secondary leading-relaxed space-y-4">
              {activeModal === 'brief' && (
                <div>
                  <p className="mb-4">
                    Ask Hermes to send a live briefing on RTT® and Flowly performance to John's primary WhatsApp line.
                  </p>
                  {briefResult && (
                    <div className="bg-bg-card border border-border-color p-4 rounded-xl text-xs text-text-primary whitespace-pre-wrap mb-4">
                      {briefResult}
                    </div>
                  )}
                  <button
                    onClick={handleBriefJohn}
                    disabled={briefSending}
                    className="w-full py-2.5 bg-gold text-white hover:bg-gold/90 font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {briefSending ? 'Sending via Hermes…' : 'Send Briefing via WhatsApp'}
                  </button>
                </div>
              )}

              {activeModal === 'meeting' && (
                <div className="space-y-4">
                  {todaysEvents.length > 0 ? (
                    <>
                      <div className="bg-bg-card border border-border-color p-4 rounded-xl text-xs flex justify-between items-center text-left">
                        <div>
                          <div className="font-semibold text-text-primary">Recall.ai Meeting Bot</div>
                          <div className="text-text-muted text-[11px] mt-0.5">Joins, records, and transcribes your calls automatically — no action needed</div>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                        {todaysEvents.map((event, idx) => {
                          const isNext = event === nextEvent;
                          const isPast = !Number.isNaN(parseEventMinutes(event.time)) && parseEventMinutes(event.time) < nowMinutes;
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 ${isNext ? 'border-gold/50 bg-gold/5' : 'border-border-color bg-bg-card'} ${isPast ? 'opacity-50' : ''}`}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-text-primary truncate">{event.title}</div>
                                <div className="text-text-muted text-[11px] mt-0.5">
                                  Attendees: {event.attendees.join(', ') || 'None listed'}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-semibold text-text-primary">{event.time || 'All day'}</div>
                                {isNext && <div className="text-[10px] text-gold font-semibold uppercase">Next</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (data?.overview?.todayEvents ?? 0) > 0 ? (
                    <p className="text-text-muted text-center py-4">
                      Calendar shows {data!.overview.todayEvents} event{data!.overview.todayEvents === 1 ? '' : 's'} today, but Hermes hasn&apos;t synced meeting times/titles yet — check Google Calendar directly.
                    </p>
                  ) : (
                    <p className="text-text-muted text-center py-4">No meetings scheduled today.</p>
                  )}
                </div>
              )}

              {activeModal === 'report' && (
                <div className="space-y-4">
                  <p>
                    Download a performance packet covering revenue and marketing conversion data, generated live from Hermes.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => data && downloadMarkdown(`Financial_Pack_${new Date().toISOString().slice(0, 10)}.md`, buildFinancialPack(data))}
                      disabled={!data}
                      className="p-3 bg-bg-card border border-border-color hover:border-gold/30 hover:bg-bg-card-hover text-left rounded-xl group transition cursor-pointer disabled:opacity-50"
                    >
                      <div className="font-semibold text-text-primary group-hover:text-gold">Financial Pack</div>
                      <div className="text-text-muted text-[11px] mt-0.5">Markdown • Revenue breakdown</div>
                    </button>
                    <button
                      onClick={() => data && downloadMarkdown(`Marketing_Pack_${new Date().toISOString().slice(0, 10)}.md`, buildMarketingPack(data))}
                      disabled={!data}
                      className="p-3 bg-bg-card border border-border-color hover:border-gold/30 hover:bg-bg-card-hover text-left rounded-xl group transition cursor-pointer disabled:opacity-50"
                    >
                      <div className="font-semibold text-text-primary group-hover:text-gold">Marketing Pack</div>
                      <div className="text-text-muted text-[11px] mt-0.5">Markdown • Flowly conversion data</div>
                    </button>
                  </div>
                </div>
              )}

              {activeModal === 'daily' && (
                <div className="space-y-4">
                  <p>
                    Your CEO Daily Brief, generated by Hermes and ready to copy into your notes.
                  </p>
                  {dailyBriefLoading ? (
                    <div className="text-center text-text-muted py-6 text-xs">Asking Hermes for today's brief…</div>
                  ) : dailyBriefError ? (
                    <div className="text-center text-red py-6 text-xs">{dailyBriefError}</div>
                  ) : (
                    <textarea
                      readOnly
                      value={dailyBriefText}
                      rows={10}
                      className="w-full p-3 bg-bg-card border border-border-color rounded-xl text-xs text-text-primary focus:outline-none custom-scrollbar"
                    />
                  )}
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(dailyBriefText);
                        setCopyStatus('copied');
                      } catch (err) {
                        console.error('Clipboard write failed:', err);
                        setCopyStatus('error');
                      }
                    }}
                    disabled={dailyBriefLoading || !!dailyBriefError || !dailyBriefText}
                    className="w-full py-2.5 bg-gold text-white hover:bg-gold/90 font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {copyStatus === 'copied' ? 'Copied ✓' : copyStatus === 'error' ? 'Copy failed — select text manually' : 'Copy to Clipboard'}
                  </button>
                </div>
              )}

              {activeModal === 'search' && (
                <div className="space-y-4">
                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search your notes (e.g. BTT launch, Lora)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40"
                    />
                    <button
                      type="submit"
                      disabled={searchLoading}
                      className="px-4 bg-gold text-white hover:bg-gold/90 font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      {searchLoading ? '…' : 'Search'}
                    </button>
                  </form>

                  {searchLoading ? (
                    <div className="text-center text-text-muted py-6 text-xs">Asking Hermes to search your notes…</div>
                  ) : searchError ? (
                    <div className="text-center text-red py-6 text-xs">{searchError}</div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2 border-t border-border-color pt-4 max-h-64 overflow-y-auto custom-scrollbar">
                      {searchResults.map((result, idx) => {
                        const isExpanded = expandedResult === idx;
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-bg-card border border-border-color hover:border-gold/30 hover:bg-bg-card-hover rounded-lg text-xs text-text-primary cursor-pointer"
                            onClick={() => setExpandedResult(isExpanded ? null : idx)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold truncate">[{result.brain}] {result.path}</span>
                              <span className="text-[10px] text-gold font-semibold shrink-0">{isExpanded ? 'Collapse ▲' : 'Expand ▼'}</span>
                            </div>
                            <p className={`text-text-secondary mt-1 ${isExpanded ? '' : 'truncate'}`}>
                              {result.snippet}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center text-text-muted py-6">No results found for "{searchQuery}"</div>
                  ) : (
                    <div className="text-center text-text-muted py-6 text-xs">Search across your meeting notes, emails, and documents.</div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
