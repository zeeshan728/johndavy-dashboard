'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, CornerDownLeft, RefreshCw, MessageCircle, Search } from 'lucide-react';
import { SECTIONS, SectionId } from './Sidebar';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (id: SectionId) => void;
  onRefresh: () => void;
  onOpenChat: () => void;
}

interface PaletteItem {
  key: string;
  label: string;
  group: 'Go to' | 'Actions';
  icon: React.ElementType;
  run: () => void;
}

export default function CommandPalette({ open, onOpenChange, onNavigate, onRefresh, onOpenChat }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: PaletteItem[] = useMemo(
    () => [
      ...SECTIONS.map((s) => ({
        key: `section-${s.id}`,
        label: s.label,
        group: 'Go to' as const,
        icon: s.icon,
        run: () => onNavigate(s.id),
      })),
      {
        key: 'action-refresh',
        label: 'Refresh live data',
        group: 'Actions' as const,
        icon: RefreshCw,
        run: onRefresh,
      },
      {
        key: 'action-chat',
        label: 'Open Chief of Staff',
        group: 'Actions' as const,
        icon: MessageCircle,
        run: onOpenChat,
      },
    ],
    [onNavigate, onRefresh, onOpenChat]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  // Global shortcut — works whether or not the palette is currently open.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setHighlight(0), [query]);

  const runItem = (item: PaletteItem) => {
    item.run();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[highlight];
      if (item) runItem(item);
    }
  };

  let runningIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg glass-card rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-color">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Jump to a section or run an action..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-semibold text-text-muted bg-bg-card border border-border-color rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar py-2">
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-text-muted">No matches for &ldquo;{query}&rdquo;</div>
              )}

              {(['Go to', 'Actions'] as const).map((group) => {
                const groupItems = filtered.filter((i) => i.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group} className="px-2 py-1.5">
                    <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">{group}</div>
                    {groupItems.map((item) => {
                      runningIndex += 1;
                      const idx = runningIndex;
                      const Icon = item.icon;
                      const isActive = idx === highlight;
                      return (
                        <button
                          key={item.key}
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={() => runItem(item)}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                            isActive ? 'bg-gold/12 text-gold' : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gold' : 'text-text-muted'}`} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-gold shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-border-color text-[10px] text-text-muted">
              <Command className="w-3 h-3" />
              <span>K to toggle · Arrows to move · Enter to select</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
