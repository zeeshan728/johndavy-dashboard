// Drives Hermes' `refresh_jobs` queue table instead of blocking on Hermes' own
// `/api/tasks/refresh` / `/api/revenue/refresh` REST endpoints, which run a cron job
// synchronously via subprocess for up to 240s — and, observed live, can starve other
// concurrent reads against the same Hermes host while that runs. Enqueuing here is a
// single fast Postgres insert; Hermes' own scheduler picks up queued rows and does the
// slow work asynchronously, on its own time, off this request entirely.
import { getSupabase } from './supabaseServer';

export type RefreshJobType = 'tasks' | 'revenue';

export interface RefreshJobRow {
  id: string;
  job_type: string;
  status: string;
  requested_at: string;
  finished_at: string | null;
  error: string | null;
}

// A job stuck in 'queued'/'running' past this age is treated as dead (Hermes' own
// processor crashed or was killed mid-job without ever writing 'done'/'failed') rather
// than genuinely in flight — comfortably above both the ~90s typical completion time
// and the 240s worst-case Hermes subprocess timeout observed live. Without this, a
// single stuck job would make every future refresh reuse — and time out on — that same
// dead row forever, since nothing else ever moves it out of 'running'.
const STALE_JOB_THRESHOLD_MS = 5 * 60 * 1000;

// Reuse an already in-flight job of the same type rather than piling on a duplicate
// row every time someone hits refresh — Hermes' scheduler only needs one queued
// request per type to know a refresh is wanted.
export async function enqueueRefreshJob(jobType: RefreshJobType): Promise<string> {
  const sb = getSupabase();
  const cutoff = new Date(Date.now() - STALE_JOB_THRESHOLD_MS).toISOString();
  const { data: existing } = await sb
    .from('refresh_jobs')
    .select('id, status')
    .eq('job_type', jobType)
    .in('status', ['queued', 'running'])
    .gte('requested_at', cutoff)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await sb
    .from('refresh_jobs')
    .insert({ job_type: jobType, status: 'queued' })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to enqueue ${jobType} refresh job: ${error?.message ?? 'unknown error'}`);
  }
  return data.id as string;
}

// Polls Supabase (fast reads) rather than holding open a single long HTTP call to
// Hermes — returns null on timeout (job may still be running; that's reported as a
// warning, not a hard failure, since the last-known Supabase data is never wrong,
// just possibly not the newest).
export async function waitForRefreshJob(
  jobId: string,
  timeoutMs: number,
  pollIntervalMs = 2000
): Promise<RefreshJobRow | null> {
  const sb = getSupabase();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await sb.from('refresh_jobs').select('*').eq('id', jobId).maybeSingle();
    if (data && (data.status === 'done' || data.status === 'failed')) {
      return data as RefreshJobRow;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return null;
}
