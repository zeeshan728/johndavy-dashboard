'use client';

import React, { useMemo, useState } from 'react';
import { CalendarEvent } from '@/lib/dataService';
import { categorizeEvent, findConflicts } from '@/lib/categorizeMeetings';
import { TriangleAlert } from 'lucide-react';

type Tier = 'strategic' | 'strategic_ops' | 'all';

interface MeetingsListProps {
  events: CalendarEvent[];
}

export default function MeetingsList({ events }: MeetingsListProps) {
  const [tier, setTier] = useState<Tier>('strategic_ops');

  const categorized = useMemo(
    () => events.map((e) => ({ ...e, category: categorizeEvent(e.title) })),
    [events]
  );
  const strategicCount = categorized.filter((e) => e.category === 'strategic').length;
  const operationalCount = categorized.filter((e) => e.category === 'operational').length;
  const fyiCount = categorized.filter((e) => e.category === 'fyi').length;

  // Conflicts are computed across *all* of today's events, not just the visible tier —
  // a meeting colliding with a flight still matters when travel items are filtered out.
  const conflicts = useMemo(() => findConflicts(events), [events]);
  const conflictTitles = useMemo(
    () => new Set(conflicts.flatMap((c) => [c.a.title, c.b.title])),
    [conflicts]
  );

  const visible = categorized.filter((e) => {
    if (tier === 'strategic') return e.category === 'strategic';
    if (tier === 'strategic_ops') return e.category !== 'fyi';
    return true;
  });

  const pill = (active: boolean) =>
    `text-[9px] font-semibold px-1.5 py-0.5 rounded-full border transition cursor-pointer ${
      active
        ? 'bg-gold/15 border-gold/30 text-gold'
        : 'bg-bg-card border-border-color text-text-muted hover:text-text-secondary'
    }`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setTier('strategic')} className={pill(tier === 'strategic')}>
          Strategic only ({strategicCount})
        </button>
        <button onClick={() => setTier('strategic_ops')} className={pill(tier === 'strategic_ops')}>
          + Operational ({strategicCount + operationalCount})
        </button>
        <button onClick={() => setTier('all')} className={pill(tier === 'all')}>
          Show all ({events.length})
        </button>
      </div>
      {conflicts.length > 0 && (
        <ul className="flex flex-col gap-1 mt-0.5">
          {conflicts.slice(0, 3).map((c, idx) => (
            <li
              key={idx}
              className="flex items-start gap-1.5 text-[10px] leading-snug text-red bg-red-500/[0.07] border border-red-500/25 rounded-lg px-2 py-1.5"
            >
              <TriangleAlert className="w-3 h-3 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold">{c.travelRelated ? 'Clashes with travel' : 'Overlap'}:</strong>{' '}
                {c.a.time} {c.a.title} · {c.b.time} {c.b.title}
              </span>
            </li>
          ))}
          {conflicts.length > 3 && (
            <li className="text-[10px] text-text-muted pl-1">
              +{conflicts.length - 3} more overlap{conflicts.length - 3 === 1 ? '' : 's'} today
            </li>
          )}
        </ul>
      )}
      <ul className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar mt-1 pr-1">
        {visible.map((event, idx) => (
          <li key={idx} className="flex items-baseline gap-2 text-xs">
            <span className="text-text-muted shrink-0 w-11 tabular-nums">{event.time || 'All day'}</span>
            <span className="font-medium text-text-primary truncate">
              {conflictTitles.has(event.title) && (
                <TriangleAlert className="w-3 h-3 text-red inline-block mr-1 -mt-0.5" />
              )}
              {event.title}
            </span>
          </li>
        ))}
      </ul>
      {tier === 'strategic_ops' && fyiCount > 0 && (
        <span className="text-[10px] text-text-muted">{fyiCount} FYI item{fyiCount === 1 ? '' : 's'} hidden (holidays, birthdays, travel)</span>
      )}
      {tier === 'strategic' && operationalCount + fyiCount > 0 && (
        <span className="text-[10px] text-text-muted">{operationalCount + fyiCount} other item{operationalCount + fyiCount === 1 ? '' : 's'} hidden</span>
      )}
    </div>
  );
}
