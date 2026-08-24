'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Sidebar, { SECTIONS, SectionId } from '@/components/Sidebar';
import OverviewStats from '@/components/OverviewStats';
import MorningBrief from '@/components/MorningBrief';
import StrategicPriorities from '@/components/StrategicPriorities';
import RevenuePulse from '@/components/RevenuePulse';
import TeamPulse from '@/components/TeamPulse';
import FlowlyOS from '@/components/FlowlyOS';
import DecisionLog from '@/components/DecisionLog';
import Projects from '@/components/Projects';
import Meetings from '@/components/Meetings';
import QuickActions from '@/components/QuickActions';
import ChiefOfStaffChat from '@/components/ChiefOfStaffChat';
import CommandPalette from '@/components/CommandPalette';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import { DashboardPayload } from '@/lib/dataService';
import Legal from '@/components/Legal';

export default function DashboardPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  // Set whenever we're showing something other than a fresh live payload: the last
  // real sync (hasRealData), fully fabricated sample data (isFabricated — Hermes down,
  // nothing real ever loaded here), or a real-but-mostly-empty payload (neither —
  // Hermes returned honest per-section "unavailable" placeholders and nothing to
  // fall back to yet).
  const [staleInfo, setStaleInfo] = useState<{ hasRealData: boolean; since: string | null; isFabricated: boolean } | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [commandOpen, setCommandOpen] = useState<boolean>(false);

  // Derive active section from the pathname
  const activeSection = (pathname.replace(/^\//, '') || 'overview') as SectionId;

  const setActiveSection = (id: SectionId) => {
    if (id === 'overview') {
      router.push('/');
    } else {
      router.push('/' + id);
    }
  };

  // Applies a freshly-fetched payload. If it's real, it becomes the new "last known
  // good" cache. If Hermes fell back to sample data — OR came back "real" but with
  // every section empty because Hermes itself was unreachable — we deliberately do
  // NOT let that overwrite a real cached payload. A transient upstream failure
  // shouldn't make a CEO glancing at the dashboard mistake fabricated (or all-zero)
  // numbers for real ones.
  const applyPayload = (payload: DashboardPayload) => {
    if (!payload.meta.isMockData && !payload.meta.hermesLargelyUnreachable) {
      setData(payload);
      setStaleInfo(null);
      localStorage.setItem('dashboardDataCache', JSON.stringify(payload));
      return;
    }
    const cachedReal = localStorage.getItem('dashboardDataCache');
    if (cachedReal) {
      try {
        const parsed: DashboardPayload = JSON.parse(cachedReal);
        setData(parsed);
        setStaleInfo({ hasRealData: true, since: parsed.overview.lastUpdated, isFabricated: false });
        return;
      } catch (e) {
        console.error('Failed to parse cached dashboard data', e);
      }
    }
    // Nothing real has ever loaded in this browser. If Hermes fell all the way back to
    // sample data, the banner says so explicitly. If it's the hermesLargelyUnreachable
    // case, this is still a real (just mostly-empty) payload — each card already shows
    // its own honest "Syncing…" / "Data unavailable" state, so the banner should say
    // that rather than falsely claiming everything on screen is fabricated.
    setData(payload);
    setStaleInfo({ hasRealData: false, since: null, isFabricated: payload.meta.isMockData });
  };

  // Load dashboard data from API
  const fetchDashboardData = async (showLoadingState = false) => {
    if (showLoadingState) setLoading(true);
    try {
      const res = await fetch(`/api/data?live=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const payload: DashboardPayload = await res.json();
      applyPayload(payload);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard payload:', err);
      setError('Failed to fetch real-time dashboard data. Please check connections.');
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  // Paint instantly from the localStorage cache (survives page reloads) if one
  // exists, then always kick off a background fetch for the current data —
  // applyPayload() swaps it in once it lands, or falls back to the cache on
  // failure. Without this, a browser with anything cached would show that exact
  // snapshot forever and never learn the backend has moved on.
  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Refresh request failed');
      applyPayload(payload);
    } catch (err) {
      console.error('Error executing data refresh:', err);
      alert(err instanceof Error ? err.message : 'Error triggering cache refresh command.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // The morning briefing is only regenerated by Hermes' own cron (typically early
  // morning UTC) — if John's first visit of the day comes hours later, the
  // "Fresh" badge (Hermes considers anything under 26h fresh) still shows but the
  // content itself is stale for his day. POST /api/briefing/refresh triggers that
  // cron directly (a dedicated endpoint, no longer riding on revenue/refresh's side
  // effect). Fire-and-forget — the cron takes a few minutes, so this doesn't block
  // or immediately change what's on screen, but it means the brief is fresh by the
  // time John's likely to check back. Do this at most once per calendar day.
  useEffect(() => {
    if (!data?.briefing?.available) return;
    if ((data.briefing.age_hours ?? 0) <= 6) return;
    const flagKey = 'briefAutoRegenDate';
    const todayStr = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(flagKey) === todayStr) return;
    localStorage.setItem(flagKey, todayStr);
    fetch('/api/briefing/refresh', { method: 'POST' }).catch((e) => {
      console.warn('Briefing auto-regen trigger failed:', e);
    });
  }, [data?.briefing?.available, data?.briefing?.age_hours]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <span className="text-red font-bold text-xl">!</span>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-text-primary">Couldn&apos;t load your dashboard</h2>
          <p className="text-sm text-text-secondary max-w-sm leading-relaxed">{error}</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          className="px-4 py-2 bg-gold text-white hover:bg-gold/90 transition text-sm font-semibold rounded-lg cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  const sectionTitle = SECTIONS.find((s) => s.id === activeSection)?.label || 'Overview';

  const renderSection = () => {
    if (!data) return null;
    switch (activeSection) {
      case 'overview':
        return <OverviewStats data={data} onNavigate={setActiveSection} onRefresh={handleRefresh} isRefreshing={isRefreshing} />;
      case 'brief':
        return <MorningBrief data={data} onRefresh={handleRefresh} isRefreshing={isRefreshing} />;
      case 'priorities':
        return <StrategicPriorities priorities={data.strategic.priorities} dataSource={data.strategic.dataSource} />;
      case 'revenue':
        return <RevenuePulse />;
      case 'team':
        return <TeamPulse data={data.teamPulse} />;
      case 'flowly':
        return <FlowlyOS data={data.flowly} />;
      case 'projects':
        return <Projects projects={data.projects} />;
      case 'decisions':
        return <DecisionLog data={data.decisions} />;
      case 'meetings':
        return <Meetings />;
      case 'legal':
        return <Legal />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-gold/20 selection:text-gold">
      <div className="ambient-mesh" />
      <Sidebar
        active={activeSection}
        onSelect={setActiveSection}
        connections={data?.overview.connections}
        connectionSources={data?.overview.connectionSources}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onOpenChat={() => setChatOpen(true)}
      />

      <div className={`flex flex-col min-h-screen transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'}`}>
        {data && (
          <HeaderBar
            lastUpdated={data.overview.lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            sectionTitle={sectionTitle}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            refreshWarning={data.meta.refreshWarnings?.join(' ')}
            onOpenCommandPalette={() => setCommandOpen(true)}
          />
        )}

        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
          {staleInfo && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              {staleInfo.hasRealData
                ? `Live data unavailable right now — showing the last real sync from ${new Date(staleInfo.since!).toLocaleString()}. Numbers below may be out of date.`
                : staleInfo.isFabricated
                ? "Live data unavailable and nothing has synced yet — showing sample data so the layout isn't empty. Numbers below are not real."
                : "Hermes hasn't finished syncing yet and this is the first load in this browser — most cards below will fill in as data arrives. Nothing shown is fabricated."}
            </div>
          )}
          {renderSection()}
        </main>
      </div>

      {/* Bottom Floating Quick Actions */}
      <QuickActions
        data={data}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        sidebarCollapsed={sidebarCollapsed}
        activeSection={activeSection}
      />
      <ChiefOfStaffChat open={chatOpen} onOpenChange={setChatOpen} />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={setActiveSection}
        onRefresh={handleRefresh}
        onOpenChat={() => setChatOpen(true)}
      />
    </div>
  );
}
