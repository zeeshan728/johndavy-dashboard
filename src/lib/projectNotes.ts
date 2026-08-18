'use client';

// Project tracking fields (headline, next steps, dependencies, sentiment) have no
// backend yet — persisted client-side, same pattern as the dashboardDataCache in
// page.tsx. Entries don't sync across devices/browsers.
const STORAGE_KEY = 'dashboardProjectNotes';

export type ProjectStatus = 'on_track' | 'warning' | 'critical';
export type ProjectSentiment = 'positive' | 'neutral' | 'negative';

export interface ProjectNote {
  id: string;
  name: string;
  status: ProjectStatus;
  headline: string;
  nextSteps: string;
  dependencies: string;
  sentiment: ProjectSentiment;
  updatedAt: string;
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `project-${Date.now()}`;
}

export function loadProjectNotes(): ProjectNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse stored project notes', e);
    return [];
  }
}

export function saveProjectNotes(notes: ProjectNote[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function createProjectNote(name: string): ProjectNote {
  return {
    id: slugify(name),
    name,
    status: 'on_track',
    headline: '',
    nextSteps: '',
    dependencies: '',
    sentiment: 'neutral',
    updatedAt: new Date().toISOString(),
  };
}
