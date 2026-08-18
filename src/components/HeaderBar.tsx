'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Menu, Command } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface HeaderBarProps {
  lastUpdated: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  sectionTitle: string;
  onOpenMobileNav: () => void;
  // Set when the last refresh partially failed (e.g. the on-demand tasks/revenue
  // regenerate timed out) — the rest of the data is showing, just not force-fresh.
  refreshWarning?: string;
  onOpenCommandPalette: () => void;
}

export default function HeaderBar({ lastUpdated, isRefreshing, onRefresh, sectionTitle, onOpenMobileNav, refreshWarning, onOpenCommandPalette }: HeaderBarProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [agoStr, setAgoStr] = useState<string>('Just now');
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPod|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  // Dubai Time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Format time for Dubai
      const tFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dubai',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Format date for Dubai
      const dFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dubai',
        day: 'numeric',
        month: 'short',
      });

      setTimeStr(tFormatter.format(now));
      setDateStr(dFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Last Refreshed Ago Tracker
  useEffect(() => {
    const updateAgo = () => {
      if (!lastUpdated) return;
      const diffMs = new Date().getTime() - new Date(lastUpdated).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs < 60) {
        setAgoStr('Just now');
      } else if (diffMins === 1) {
        setAgoStr('1 min ago');
      } else {
        setAgoStr(`${diffMins} min ago`);
      }
    };

    updateAgo();
    const interval = setInterval(updateAgo, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <header className="sticky top-0 z-30 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-color px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden text-text-secondary hover:text-text-primary p-1.5 -ml-1.5 rounded-md hover:bg-bg-card cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-lg font-semibold tracking-tight text-text-primary truncate">{sectionTitle}</h1>
        <div className="h-4 w-px bg-border-color hidden md:block shrink-0"></div>
        <div className="text-xs text-text-secondary bg-bg-card px-2.5 py-1 rounded-md hidden md:flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Dubai <span className="text-text-primary font-semibold tabular-nums">{dateStr} · {timeStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-bg-card hover:bg-bg-card-hover border border-border-color rounded-full text-xs text-text-muted transition-colors cursor-pointer"
        >
          <Command className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd className="ml-1 text-[10px] font-semibold text-text-muted/80 border border-border-color rounded px-1">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>

        <span
          className="text-xs text-text-muted hidden sm:flex items-center gap-1.5"
          title={refreshWarning}
        >
          {refreshWarning && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
          Updated <span className="text-text-secondary font-medium">{agoStr}</span>
        </span>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 hover:bg-gold/15 text-gold rounded-full text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-12 transition-transform duration-200'}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <div className="h-5 w-px bg-border-color hidden sm:block"></div>
        <ThemeToggle />
      </div>
    </header>
  );
}
