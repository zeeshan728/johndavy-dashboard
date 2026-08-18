// Live text from connected services can carry engineering terms (proxy, token, API,
// OAuth) — swap those for words a CEO doesn't have to translate.
export function humanize(text: string): string {
  return text
    .replace(/\bproxy\b/gi, 'connection')
    .replace(/\boauth\b/gi, 'account')
    .replace(/\btoken\b/gi, 'access key')
    .replace(/\bapi\b/gi, 'connection');
}

// John's business runs on Dubai time and he travels constantly — so every date and
// time the dashboard displays is pinned to Asia/Dubai rather than the viewer's
// machine. Without this the header (already Dubai-pinned) and the rest of the app
// disagree, and every timestamp silently shifts the moment he lands somewhere else.
export const DISPLAY_TZ = 'Asia/Dubai';

type DateInput = string | number | Date;

function toDate(value: DateInput): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTime(value: DateInput, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleTimeString('en-US', { timeZone: DISPLAY_TZ, hour: '2-digit', minute: '2-digit', ...opts });
}

// Pass opts to choose the fields explicitly; omit them for the common "5 Jul" short form.
export function formatDate(value: DateInput, opts?: Intl.DateTimeFormatOptions): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { timeZone: DISPLAY_TZ, ...(opts ?? { day: 'numeric', month: 'short' }) });
}

// "HH:mm" on a 24h clock — for the agenda, where times are scanned and compared
// rather than read as prose.
export function formatClock(value: DateInput): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleTimeString('en-GB', { timeZone: DISPLAY_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

// "YYYY-MM-DD" for the Dubai calendar day. This is the only correct basis for
// "is this today?" — comparing a UTC date prefix against a Dubai date mis-buckets
// everything in the Dubai 00:00–04:00 window.
export function dubaiDayKey(value: DateInput = new Date()): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-CA', { timeZone: DISPLAY_TZ });
}

// Minutes since Dubai midnight — for ordering and overlap checks that need
// arithmetic rather than a formatted string.
export function dubaiMinutes(value: DateInput): number {
  const clock = formatClock(value);
  if (!clock) return NaN;
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
}

export function timeGreeting(name: string): string {
  const hr = Math.floor(dubaiMinutes(new Date()) / 60);
  if (hr < 12) return `Good morning, ${name}!`;
  if (hr < 18) return `Good afternoon, ${name}!`;
  return `Good evening, ${name}!`;
}

// Hermes tags every data point with a raw system slug (e.g. "vault_email_archive",
// "composio_gmail_oauth") — translate those into plain names for the source badges.
const SOURCE_LABELS: Record<string, string> = {
  vault_email_archive: 'Email archive',
  vault_daily_notes: 'Daily notes',
  vault_people_notes: 'Team notes',
  morning_briefing_cron: 'Daily briefing sync',
  estimated: 'Estimated (derived)',
  flowly_mcp_api: 'Flowly platform',
  second_brain_code_snapshot: 'Codebase snapshot',
  second_brain_vault: 'Notes vault',
  hermes_cached_manual: 'Manually logged',
  dashboard_cache_filesystem: 'Dashboard cache',
  composio_gmail_oauth: 'Gmail',
  composio_asana_oauth: 'Asana',
  composio_drive_oauth: 'Google Drive',
  composio_github_oauth: 'GitHub',
  recallai_api: 'Recall.ai',
  asana_cached_tasks: 'Asana',
  hermes_config: 'Hermes configuration',
  unavailable: 'Not connected',
};

export function humanizeSource(source?: string): string {
  if (!source) return 'Unknown source';
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  // Composite sources like "asana_cached_tasks + vault_people_notes" — humanize each part.
  if (source.includes('+')) {
    return source
      .split('+')
      .map((part) => humanizeSource(part.trim()))
      .join(' + ');
  }
  if (/^[a-z0-9_]+$/.test(source)) {
    return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return source;
}

// Hermes reports the CRO block's currency rather than fixing one: spend is summed
// across Meta ad accounts in different currencies (observed live: a GBP account and
// an AED account) and converted, so the resulting figures came back as USD even
// though the top-level payload still says "GBP". Always render the symbol Hermes
// actually reports for the numbers — hardcoding £ mislabelled every CRO money value
// the moment a second ad account was connected.
const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  gbp: '£',
  eur: '€',
  aed: 'AED ',
};

export function currencySymbol(code?: string): string {
  if (!code) return '';
  return CURRENCY_SYMBOLS[code.toLowerCase()] ?? `${code.toUpperCase()} `;
}

export function relativeTimeFrom(iso?: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
