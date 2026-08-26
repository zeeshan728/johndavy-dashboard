'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  Target,
  DollarSign,
  Users,
  Rocket,
  ClipboardList,
  FolderKanban,
  Video,
  Luggage,
  Gavel,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  X,
  MessageCircle,
  Landmark,
} from 'lucide-react';
import { ConnectionStatus, DataSource } from '@/lib/dataService';
import { humanizeSource } from '@/lib/text';

export type SectionId =
  | 'overview'
  | 'brief'
  | 'priorities'
  | 'revenue'
  | 'team'
  | 'flowly'
  | 'projects'
  | 'decisions'
  | 'meetings'
  | 'logistics'
  | 'legal'
  | 'finance';

export const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'brief', label: 'Morning Brief', icon: Sparkles },
  { id: 'priorities', label: 'Strategic Priorities', icon: Target },
  { id: 'revenue', label: 'Revenue Pulse', icon: DollarSign },
  { id: 'finance', label: 'Finance', icon: Landmark },
  { id: 'team', label: 'Team Pulse', icon: Users },
  { id: 'flowly', label: 'Flowly OS', icon: Rocket },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'decisions', label: 'Decision Log', icon: ClipboardList },
  { id: 'meetings', label: 'Meetings', icon: Video },
  { id: 'logistics', label: 'Logistics', icon: Luggage },
  { id: 'legal', label: 'Legal', icon: Gavel },
];

interface SidebarProps {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  connections?: ConnectionStatus;
  connectionSources?: Record<string, DataSource>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenChat: () => void;
}

const CONNECTION_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  asana: 'Asana',
  calendar: 'Calendar',
  slack: 'Slack',
  metaAds: 'Meta Ads',
  recallAi: 'Recall.ai',
};

export default function Sidebar({
  active,
  onSelect,
  connections,
  connectionSources,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  onOpenChat,
}: SidebarProps) {
  const router = useRouter();
  const [connectionsList, setConnectionsList] = useState<{ name: string; status: string; reason?: string }[] | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(true);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch('/api/connections');
        if (!res.ok) throw new Error('Failed to fetch connections');
        const data = await res.json();
        setConnectionsList(data.connections || []);
      } catch (err) {
        console.error('Error fetching connections:', err);
        setConnectionsList(null);
      } finally {
        setConnectionsLoading(false);
      }
    }
    fetchConnections();
  }, []);

  const connectedCount = connectionsList
    ? connectionsList.filter((c) => c.status === 'connected').length
    : 0;
  const totalCount = connectionsList ? connectionsList.length : 0;

  const connectionsTooltip = connectionsList
    ? connectionsList
        .map((c) => {
          const reasonStr = c.reason ? ` (${c.reason})` : '';
          return `${c.name}: ${c.status}${reasonStr}`;
        })
        .join('\n')
    : '—/— systems connected';

  const handleSelect = (id: SectionId) => {
    onSelect(id);
    onCloseMobile();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-bg-secondary/95 backdrop-blur-xl border-r border-border-color flex flex-col transition-all duration-200
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-[248px]'}
          w-[248px] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border-color shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative shrink-0">
              <svg viewBox="0 0 100 90" className="w-7 h-7 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 56 L35 24 Q43 18, 50 30 Q57 18, 65 24 L75 56 Q50 60, 25 56Z" fill="var(--accent-red)" />
                <path d="M50 30 Q49 40, 48 50" stroke="#00000030" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <rect x="25" y="48" width="50" height="7" rx="2" fill="#00000025" />
                <path d="M6 60 Q26 54, 50 53 Q74 54, 94 60 Q82 72, 50 74 Q18 72, 6 60Z" fill="var(--accent-red)" />
              </svg>
            </div>
            <div className={`flex flex-col leading-none whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="font-brush text-xl text-text-primary">
                John <span className="text-gold">Davy</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wide text-text-secondary uppercase -mt-0.5">
                CEO Dashboard
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-text-muted hover:text-text-primary p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = active === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleSelect(section.id)}
                title={collapsed ? section.label : undefined}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                  ${
                    isActive
                      ? 'text-gold bg-gradient-to-r from-gold/12 to-transparent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                  }
                  ${collapsed ? 'lg:justify-center' : ''}`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gold shadow-[0_0_10px_rgb(var(--accent-gold-rgb)/0.6)]" />
                )}
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-gold' : 'group-hover:scale-110'}`} />
                <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{section.label}</span>
              </button>
            );
          })}

          <div className="pt-1 mt-1 border-t border-border-color/60">
            <button
              onClick={() => {
                onOpenChat();
                onCloseMobile();
              }}
              title={collapsed ? 'Chief of Staff' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm font-medium transition-all cursor-pointer text-text-secondary hover:text-gold hover:bg-bg-card ${
                collapsed ? 'lg:justify-center' : ''
              }`}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>Chief of Staff</span>
            </button>
          </div>
        </nav>

        {/* Footer: connections + collapse toggle */}
        <div className="border-t border-border-color p-3 space-y-2 shrink-0">
          <div
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg bg-bg-card text-xs ${
              collapsed ? 'lg:justify-center' : ''
            }`}
            title={connectionsTooltip}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {!connectionsLoading && connectionsList !== null && connectedCount === totalCount && totalCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  connectionsLoading || connectionsList === null
                    ? 'bg-neutral-500/50'
                    : connectedCount === totalCount && totalCount > 0
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              />
            </span>
            <span className={`text-text-secondary truncate ${collapsed ? 'lg:hidden' : ''}`}>
              {connectionsLoading ? (
                <span>Loading systems...</span>
              ) : connectionsList === null ? (
                <span>—/— systems connected</span>
              ) : (
                <>
                  <span className="text-text-primary font-semibold">{connectedCount}</span>/{totalCount} systems connected
                </>
              )}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-red hover:bg-bg-card border border-transparent transition cursor-pointer ${
              collapsed ? 'lg:justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Log out</span>
          </button>

          <button
            onClick={onToggleCollapsed}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-2 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color transition cursor-pointer"
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
