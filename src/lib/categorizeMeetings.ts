export type MeetingCategory = 'strategic' | 'operational' | 'fyi';

// Keyword-based heuristic — the calendar gives us a title and nothing else
// (no attendee roles, no event type), so this is a best-effort sort rather
// than a real classification.
const STRATEGIC_KEYWORDS = [
  'nick mennell', 'ceo', 'partner', 'platinum', 'driven', 'mindvalley',
  'board', 'investor', 'strategic', 'decis', 'uare.ai', 'go live', 'go-live',
];

const FYI_KEYWORDS = [
  'holiday', 'birthday', 'hotel', 'ticket', 'annual leave', 'ooo',
  'out of office', 'presidential suite', 'focus', 'flight', 'travel',
];

export function categorizeEvent(title: string): MeetingCategory {
  const t = title.toLowerCase();
  if (STRATEGIC_KEYWORDS.some((k) => t.includes(k))) return 'strategic';
  if (FYI_KEYWORDS.some((k) => t.includes(k))) return 'fyi';
  return 'operational';
}

// Two events that overlap in time need a decision from John *today* — which is exactly
// what the dashboard is for. Travel/FYI entries (flights, transfers) are included on
// purpose: a meeting that runs into a flight is the collision that actually costs him
// something, and it's the one the calendar renders most calmly.
//
// Depends on calendar events already being deduped upstream (dataService), otherwise
// every duplicated recurring meeting would "conflict" with its own copy.
interface TimedEvent {
  time: string;
  title: string;
  startsAt: string;
  endsAt: string;
}

// John deliberately books long holding blocks that are *meant* to be filled with other
// meetings ("Call Block", "Focus - NO CALLS", "Emails / Prioritising"). Treating those as
// commitments turns every real meeting into a false conflict, so they're excluded as
// containers rather than clashes.
const HOLDING_BLOCK_KEYWORDS = [
  'call block', 'focus', 'emails', 'prioritis', 'home', 'annual leave', 'ooo', 'out of office',
];

// Anything spanning 4h+ is a multi-day conference or someone else's leave — it swallows
// the day and would collide with everything. A 3h flight stays under this on purpose.
const CONTAINER_SPAN_HOURS = 4;

function isContainer(e: TimedEvent): boolean {
  const t = e.title.toLowerCase();
  if (HOLDING_BLOCK_KEYWORDS.some((k) => t.includes(k))) return true;
  return (new Date(e.endsAt).getTime() - new Date(e.startsAt).getTime()) / 3600000 >= CONTAINER_SPAN_HOURS;
}

export function findConflicts<T extends TimedEvent>(events: T[]): { a: T; b: T; travelRelated: boolean }[] {
  const timed = events
    .filter((e) => e.startsAt && e.endsAt && !isContainer(e))
    .sort((x, y) => x.startsAt.localeCompare(y.startsAt));

  const conflicts: { a: T; b: T; travelRelated: boolean }[] = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      // Sorted by start, so once b starts at/after a ends nothing later can overlap a.
      if (b.startsAt >= a.endsAt) break;
      conflicts.push({
        a,
        b,
        travelRelated: [a.title, b.title].some((t) => categorizeEvent(t) === 'fyi'),
      });
    }
  }
  // A meeting running into travel is the collision that actually costs him a flight,
  // so those lead regardless of when they fall in the day.
  return conflicts.sort((x, y) =>
    x.travelRelated === y.travelRelated ? x.a.startsAt.localeCompare(y.a.startsAt) : x.travelRelated ? -1 : 1
  );
}
