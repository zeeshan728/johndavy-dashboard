'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FolderKanban, Plus, Trash2, Smile, Meh, Frown, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { ProjectSummary } from '@/lib/dataService';
import {
  ProjectNote,
  ProjectStatus,
  ProjectSentiment,
  loadProjectNotes,
  saveProjectNotes,
  createProjectNote,
} from '@/lib/projectNotes';

import { formatDate as formatDubaiDate } from '@/lib/text';

interface ProjectsProps {
  projects: ProjectSummary[];
}

const STATUS_STYLES: Record<ProjectStatus, { label: string; dot: string; select: string }> = {
  on_track: { label: 'On track', dot: 'bg-emerald-500', select: 'text-green' },
  warning: { label: 'Needs attention', dot: 'bg-amber-500', select: 'text-amber' },
  critical: { label: 'Critical', dot: 'bg-red-500', select: 'text-red' },
};

const SENTIMENT_ICONS: Record<ProjectSentiment, React.ElementType> = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

function formatDate(date: string | null): string | null {
  if (!date) return null;
  return formatDubaiDate(date);
}

// Live completion/overdue data drives the visual status — the editable note's own
// status dropdown is a separate, optional annotation layered on top, not the source
// of truth for whether a project actually needs attention.
function liveStatusDot(p: ProjectSummary): string {
  if (p.overdueTasks.length >= 3) return 'bg-red-500';
  if (p.overdueTasks.length > 0) return 'bg-amber-500';
  if (p.completionPct >= 80) return 'bg-emerald-500';
  if (p.completionPct >= 40) return 'bg-amber-500';
  return 'bg-text-muted';
}

export default function Projects({ projects }: ProjectsProps) {
  const [notes, setNotes] = useState<ProjectNote[] | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setNotes(loadProjectNotes());
  }, []);

  const persist = (next: ProjectNote[]) => {
    setNotes(next);
    saveProjectNotes(next);
  };

  const noteByName = useMemo(() => {
    const map = new Map<string, ProjectNote>();
    for (const n of notes ?? []) map.set(n.name.toLowerCase(), n);
    return map;
  }, [notes]);

  // Fields are editable even before a note exists for a live-detected project —
  // the note is only created in storage on first edit, not just because Asana
  // happened to return the project this load.
  const updateNote = (name: string, patch: Partial<ProjectNote>) => {
    if (!notes) return;
    const existing = noteByName.get(name.toLowerCase());
    if (existing) {
      persist(notes.map((n) => (n.id === existing.id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)));
    } else {
      persist([...notes, { ...createProjectNote(name), ...patch }]);
    }
  };

  const clearNote = (name: string) => {
    if (!notes) return;
    const existing = noteByName.get(name.toLowerCase());
    if (!existing) return;
    persist(notes.filter((n) => n.id !== existing.id));
  };

  const addManualProject = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !notes) return;
    if (notes.some((n) => n.name.toLowerCase() === trimmed.toLowerCase())) return;
    persist([...notes, createProjectNote(trimmed)]);
    setNewProjectName('');
  };

  const removeManualProject = (id: string) => {
    if (!notes) return;
    persist(notes.filter((n) => n.id !== id));
  };

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Manual notes for names that never showed up among the live Asana projects —
  // e.g. non-Asana initiatives, or projects outside Hermes' recent-task window.
  const manualOnlyNotes = useMemo(() => {
    if (!notes) return [];
    const liveNames = new Set(projects.map((p) => p.name.toLowerCase()));
    return notes.filter((n) => !liveNames.has(n.name.toLowerCase()));
  }, [notes, projects]);

  if (!notes) {
    return <div className="text-text-muted text-sm">Loading project tracking…</div>;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-gold" />
          <h2 className="text-sm font-semibold text-gold tracking-wide uppercase">Project Tracking</h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Auto-populated from Asana — completion, overdue tasks and owner are live. Click a card to expand
          overdue tasks and add your own status notes.
        </p>
        <p className="text-[10px] text-text-muted/80 italic">
          Confirmed with Hermes: task data reflects the most recent 100 tasks synced from Asana (the API&apos;s
          default page size) — a large project&apos;s completion % may read lower than reality until pagination is added.
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="text-text-muted text-sm italic">No active Asana projects detected in the current task window.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((p) => {
            const note = noteByName.get(p.name.toLowerCase());
            const isOpen = expanded.has(p.name);
            const status = note?.status ?? 'on_track';
            const sentiment = note?.sentiment ?? 'neutral';
            const SentimentIcon = SENTIMENT_ICONS[sentiment];
            const latestDue = formatDate(p.latestDue);

            return (
              <div
                key={p.name}
                className="bg-bg-secondary border border-border-color rounded-2xl p-5 shadow-sm flex flex-col gap-3.5 gold-glow-hover"
              >
                <button
                  onClick={() => toggleExpanded(p.name)}
                  className="flex items-start justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${liveStatusDot(p)}`} />
                    <h3 className="font-semibold text-text-primary truncate">{p.name}</h3>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                </button>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex-1 h-1.5 bg-bg-card rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${p.completionPct}%` }} />
                  </div>
                  <span className="text-text-secondary w-10 text-right shrink-0 font-semibold">{p.completionPct}%</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
                  <span>{p.doneTasks}/{p.totalTasks} tasks done</span>
                  {p.owner && <span>· Owner: {p.owner}</span>}
                  {latestDue && <span>· Latest due: {latestDue}</span>}
                </div>

                {p.overdueTasks.length > 0 && (
                  <span className="text-[10px] font-semibold text-red bg-red-500/10 border border-red-500/25 rounded-full px-2 py-0.5 w-fit">
                    {p.overdueTasks.length} overdue task{p.overdueTasks.length === 1 ? '' : 's'}
                  </span>
                )}

                {isOpen && (
                  <div className="flex flex-col gap-3.5 pt-2 border-t border-border-color">
                    {p.overdueTasks.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">
                          Overdue tasks
                        </span>
                        {p.overdueTasks.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-bg-card border border-border-color rounded-lg px-2.5 py-1.5">
                            <span className="truncate text-text-primary">{t.name}</span>
                            <div className="flex items-center gap-2 shrink-0 text-text-muted">
                              <span>{t.assignee}</span>
                              <span>{t.daysOverdue}d late</span>
                              {t.permalink && (
                                <a href={t.permalink} target="_blank" rel="noreferrer" className="text-gold hover:text-gold/80">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs">
                      <label className="flex flex-col gap-1">
                        <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Status</span>
                        <select
                          value={status}
                          onChange={(e) => updateNote(p.name, { status: e.target.value as ProjectStatus })}
                          className={`bg-bg-card border border-border-color rounded-lg px-2 py-1.5 font-semibold cursor-pointer ${STATUS_STYLES[status].select}`}
                        >
                          {(Object.keys(STATUS_STYLES) as ProjectStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_STYLES[s].label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Team sentiment</span>
                        <div className="flex items-center gap-1 bg-bg-card border border-border-color rounded-lg px-2 py-1.5">
                          <SentimentIcon className="w-3.5 h-3.5 text-gold" />
                          <select
                            value={sentiment}
                            onChange={(e) => updateNote(p.name, { sentiment: e.target.value as ProjectSentiment })}
                            className="bg-transparent font-semibold cursor-pointer focus:outline-none"
                          >
                            <option value="positive">Positive</option>
                            <option value="neutral">Neutral</option>
                            <option value="negative">Negative</option>
                          </select>
                        </div>
                      </label>
                    </div>

                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Headline</span>
                      <input
                        type="text"
                        value={note?.headline ?? ''}
                        onChange={(e) => updateNote(p.name, { headline: e.target.value })}
                        placeholder="One-line summary of where this stands"
                        className="px-2.5 py-1.5 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Next steps</span>
                      <textarea
                        value={note?.nextSteps ?? ''}
                        onChange={(e) => updateNote(p.name, { nextSteps: e.target.value })}
                        rows={2}
                        placeholder="What happens next"
                        className="px-2.5 py-1.5 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Dependencies</span>
                      <textarea
                        value={note?.dependencies ?? ''}
                        onChange={(e) => updateNote(p.name, { dependencies: e.target.value })}
                        rows={2}
                        placeholder="What this is blocked on or waiting for"
                        className="px-2.5 py-1.5 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                      />
                    </label>

                    {note && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-muted">
                          Notes updated {formatDubaiDate(note.updatedAt)}
                        </span>
                        <button
                          onClick={() => clearNote(p.name)}
                          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-red cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Clear notes
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 shadow-sm flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Other tracked initiatives
        </h3>
        <p className="text-[11px] text-text-muted">
          For work that isn&apos;t an Asana project — tracked manually, on this device only.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addManualProject(newProjectName);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Add something to track…"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="flex-1 px-3 py-2 bg-bg-card border border-border-color rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-2 bg-gold text-white hover:bg-gold/90 font-semibold rounded-lg text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>

        {manualOnlyNotes.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {manualOnlyNotes.map((n) => {
              const SentimentIcon = SENTIMENT_ICONS[n.sentiment];
              return (
                <div
                  key={n.id}
                  className="bg-bg-card border border-border-color rounded-2xl p-5 flex flex-col gap-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_STYLES[n.status].dot}`} />
                      <h3 className="font-semibold text-text-primary truncate">{n.name}</h3>
                    </div>
                    <button
                      onClick={() => removeManualProject(n.id)}
                      className="text-text-muted hover:text-red p-1 rounded-md hover:bg-bg-secondary cursor-pointer shrink-0"
                      title="Stop tracking"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="flex flex-col gap-1">
                      <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Status</span>
                      <select
                        value={n.status}
                        onChange={(e) => updateNote(n.name, { status: e.target.value as ProjectStatus })}
                        className={`bg-bg-secondary border border-border-color rounded-lg px-2 py-1.5 font-semibold cursor-pointer ${STATUS_STYLES[n.status].select}`}
                      >
                        {(Object.keys(STATUS_STYLES) as ProjectStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_STYLES[s].label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Team sentiment</span>
                      <div className="flex items-center gap-1 bg-bg-secondary border border-border-color rounded-lg px-2 py-1.5">
                        <SentimentIcon className="w-3.5 h-3.5 text-gold" />
                        <select
                          value={n.sentiment}
                          onChange={(e) => updateNote(n.name, { sentiment: e.target.value as ProjectSentiment })}
                          className="bg-transparent font-semibold cursor-pointer focus:outline-none"
                        >
                          <option value="positive">Positive</option>
                          <option value="neutral">Neutral</option>
                          <option value="negative">Negative</option>
                        </select>
                      </div>
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Headline</span>
                    <input
                      type="text"
                      value={n.headline}
                      onChange={(e) => updateNote(n.name, { headline: e.target.value })}
                      placeholder="One-line summary of where this stands"
                      className="px-2.5 py-1.5 bg-bg-secondary border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-text-muted font-semibold uppercase tracking-wide text-[10px]">Next steps</span>
                    <textarea
                      value={n.nextSteps}
                      onChange={(e) => updateNote(n.name, { nextSteps: e.target.value })}
                      rows={2}
                      placeholder="What happens next"
                      className="px-2.5 py-1.5 bg-bg-secondary border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                    />
                  </label>

                  <span className="text-[10px] text-text-muted">
                    Updated {formatDubaiDate(n.updatedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
