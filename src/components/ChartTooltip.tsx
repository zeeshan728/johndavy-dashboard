'use client';

import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; color?: string }[];
  formatValue?: (value: number, name: string) => string;
}

// Shared tooltip renderer for recharts <Tooltip content={...}> across the dashboard's
// area/bar charts — keeps every chart's hover card in the same glass/token styling
// instead of recharts' unstyled default box.
export default function ChartTooltip({ active, label, payload, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass-card rounded-xl px-3.5 py-2.5 shadow-lg text-xs min-w-[140px]">
      {label && <div className="text-text-muted font-semibold mb-1.5">{label}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-text-secondary">
              {p.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
              {p.name}
            </span>
            <span className="font-semibold text-text-primary tabular-nums">
              {formatValue ? formatValue(p.value, p.name) : p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
