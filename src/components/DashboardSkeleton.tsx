'use client';

import React from 'react';

function Box({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded-lg ${className}`} />;
}

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex">
      <div className="ambient-mesh" />
      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex flex-col w-[248px] h-screen bg-bg-secondary/95 backdrop-blur-xl border-r border-border-color shrink-0">
        <div className="flex items-center gap-2.5 h-16 px-4 border-b border-border-color">
          <Box className="w-8 h-8 rounded-lg shrink-0" />
          <Box className="h-3.5 w-28" />
        </div>
        <div className="flex-1 py-4 px-3 space-y-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Box key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="border-t border-border-color p-3">
          <Box className="h-9 w-full" />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header skeleton */}
        <header className="sticky top-0 z-30 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-color px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <Box className="h-4 w-32" />
          <Box className="h-6 w-24 rounded-full" />
        </header>

        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
          {/* RAG health bar */}
          <Box className="h-[92px] w-full rounded-2xl" />

          {/* Morning brief teaser */}
          <Box className="h-[104px] w-full rounded-2xl" />

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Box className="h-[140px] col-span-2 rounded-2xl" />
            <Box className="h-[140px] rounded-2xl" />
            <Box className="h-[110px] rounded-2xl" />
            <Box className="h-[110px] rounded-2xl" />
            <Box className="h-[110px] col-span-2 sm:col-span-3 rounded-2xl" />
          </div>

          {/* Today at a glance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Box className="h-[160px] rounded-2xl" />
            <Box className="h-[160px] rounded-2xl" />
            <Box className="h-[160px] rounded-2xl" />
          </div>
        </main>
      </div>
    </div>
  );
}
