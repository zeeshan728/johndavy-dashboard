'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { humanizeSource, relativeTimeFrom } from '@/lib/text';
import { DataSource } from '@/lib/dataService';

interface SourceBadgeProps {
  dataSource?: DataSource;
  className?: string;
}

export default function SourceBadge({ dataSource, className = '' }: SourceBadgeProps) {
  if (!dataSource?.source) return null;
  const isEstimated = dataSource.source.includes('estimated');
  const isUnavailable = dataSource.source === 'unavailable';
  const freshness = relativeTimeFrom(dataSource.fetchedAt);

  return (
    <span className={`group relative inline-flex items-center ${className}`}>
      <ShieldCheck
        className={`w-3 h-3 cursor-help ${
          isUnavailable ? 'text-text-muted' : isEstimated ? 'text-amber' : 'text-green'
        }`}
      />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-max max-w-[200px] rounded-lg bg-text-primary text-bg-primary text-[10px] font-medium px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-30 shadow-lg">
        Source: {humanizeSource(dataSource.source)}
        {freshness && (
          <>
            {' · '}
            {dataSource.fromCache ? 'cached' : 'live'} {freshness}
          </>
        )}
      </span>
    </span>
  );
}
