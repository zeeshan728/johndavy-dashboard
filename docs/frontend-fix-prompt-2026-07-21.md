# Frontend Fix Prompt — CEO Dashboard

**Paste this to the agent/dev doing the work. It is self-contained.**

---

You are working on the John Davy CEO Dashboard — a Next.js 16 (App Router, Turbopack, React 19, Tailwind v4) app at the repo root, which consumes a read-only Hermes agent API. Your job is a prioritised set of frontend fixes from a live audit conducted 21 July 2026 against real data.

## Ground rules

1. **Read `AGENTS.md` first.** This Next.js version has breaking changes vs. your training data — check `node_modules/next/dist/docs/` before writing anything framework-touching.
2. **Surgical changes only.** Touch what the task requires. Don't refactor adjacent code, don't restyle things not listed, match the surrounding style and comment density (this codebase comments *why*, not *what* — follow that).
3. **Everything here is frontend-only.** Root-cause data problems are being fixed separately in Hermes (see `docs/hermes-backend-fix-spec-addendum-2026-07-21.md`). Where a fix below is a *defensive mitigation* for a backend bug, it is labelled as such — implement it anyway, but do not paper over the data problem silently: keep the mitigation obvious and commented so it can be removed once upstream is fixed.
4. **Never invent data.** This app's biggest strength is that it refuses to show fake numbers (see the `dailyPending` → "Syncing…" pattern). Preserve that. If a fix can't be made honestly, show nothing and say why.
5. Verify each change in the browser against the running dev server before moving on. Do not ask the user to check manually.

The full findings document is `docs/CEO-Dashboard-Audit-2026-07-21.md` — read it for context and evidence.

---

## P0 — This week

### 1. Dedupe calendar events (mitigation for a backend bug)
**File:** `src/lib/dataService.ts` (~line 959, the `calendar` mapping)

Live data returns every recurring meeting **twice, exactly 2 hours apart**. Confirmed pairs today: Daily Team Call 09:00 + 11:00; John / Laura - Daily Space 09:30 + 11:30; Flowly <> MP Team 11:00 + 13:00; Neil John Stephen Laura re: Tech / AI Builds 11:45 + 13:45; John's Brain FlowlyOS 13:00 + 15:00; ZVC - Meet Marisa 16:00 + 18:00. "37 meetings today" is really ~18.

Dedupe on normalised title (trim + lowercase + collapse whitespace) **+ attendee set**. When two entries collide, keep the later one only if you have a principled reason to; otherwise keep the first and drop the rest. Comment clearly that this is compensating for upstream duplication.

**Accept when:** today's agenda count drops to ~18 and no title appears twice.

### 2. Stop deriving times by string-slicing
**File:** `src/lib/dataService.ts` — currently `time: hasTime ? start.slice(11, 16) : ''` and `start.slice(0, 10) === todayDubai`

Both take raw characters out of the ISO string with **no timezone conversion**, then the UI labels the result as Dubai time. Two consequences: (a) times are displayed in whatever zone Hermes happens to emit — there is an observed ~1h discrepancy against the brief's own prose ("Ana & John updates (10am)" renders as 09:00); (b) the "is this today?" comparison tests a UTC date prefix against a Dubai calendar date, so events in the Dubai 00:00–04:00 window are mis-bucketed.

Parse to a real `Date` and format explicitly with `timeZone: 'Asia/Dubai'`. Do the same for the day-boundary comparison.

**Note:** Hermes does not currently declare its timezone in the payload — that's being requested backend-side. Until it does, assume the emitted timestamps are what they claim and convert honestly; do **not** hard-code a ±1h fudge to make it match the brief.

### 3. Pin the whole app to Dubai time
**Files:** every `toLocaleTimeString()` / `toLocaleDateString()` in `src/components/**` and `src/app/page.tsx`

`HeaderBar` is Dubai-pinned; everything else uses the viewer's local timezone. Result: the header reads "Dubai · 12:29 PM" while the hero directly beneath reads "Synced 01:29 PM". This is not cosmetic — **John flies to Tallinn tonight**; on landing, every timestamp in the app silently shifts by 3 hours.

Add a small shared helper (e.g. in `src/lib/text.ts`) that formats dates/times in `Asia/Dubai`, and route all display formatting through it.

**Accept when:** header and hero agree, and the displayed times don't change if you change the machine's timezone.

### 4. "Top Action" must be one action
**File:** `src/components/OverviewStats.tsx` (~line 500, the `/action|task|sign/i` section lookup)

It currently renders, verbatim: *"Ana & John updates (10am), Daily Team Call (11am), John/Laura Daily Space (11:30am), James catch-up (1pm), Flowly-MP weekly (2pm), Tech/AI Builds (2:45pm), Dev Deep Dive (3pm), John's Brain FlowlyOS (4pm), ZVC Meet Marisa (7pm), Marisa x Uare.ai Go Live (7:30pm)."*

That's a re-listing of the calendar sitting directly above it, under a label promising *the one thing that matters*. The regex is matching the brief's deadlines section and taking its first line.

Prefer a genuine single action (first item from a decision-queue / action section). If you can't confidently identify one, **render nothing** — an absent card beats a misleading one. Never render more than one item here.

### 5. Promote the brief's intelligence to the Overview ⭐ highest-value change in this list
**File:** `src/components/OverviewStats.tsx`

The single biggest problem with this dashboard: the smartest content is buried behind a click, and a meeting list is the most prominent thing on screen. `data.briefing.highlights.blockers` and `.opportunities` are already in the payload and contain the real CEO-grade intelligence. Live examples:

> - Stephen is OOO Jul 20–27 — Tech/AI Builds weekly and Flowly syncs run without his input. No deputy named.
> - Client Launchpad Webinar Replay VSL — **six pushes since January** (last due Jul 24). Content Email #5 — six pushes since March.
> - Suhail/Sheeraz proposal — pushing to meet **this week**, both on vacation from Monday. Closing window.

Add a prominent block near the top of the Overview (above Today's Agenda) showing the top ~3, colour-coded by severity, each linking through to the Morning Brief. **No new data fetching required** — this is a `slice()` and a card.

### 6. Filter negation bullets out of Blockers
**File:** `src/components/MorningBrief.tsx` (~line 307 badge count, ~line 318 `blockers.slice(0, 2)`)

Blocker #2 in the live payload is the literal string `"Blocked: None visible."`, so the card currently reads "🚧 BLOCKERS — 5 Items / • Stephen is OOO… / • Blocked: None visible."

Filter out bullets that are negations (`/^(blocked|blockers?|risks?)\s*:?\s*(none|no\b|n\/a)/i` or similar) **before** both the slice and the count. Apply the same filter anywhere else `highlights.blockers` is consumed.

### 7. Fix truncation
**Files:** `src/components/StrategicPriorities.tsx`, `src/components/OverviewStats.tsx`

- **Priorities status badges** (`max-w-[170px] truncate`, ~line 418) — every one is cut mid-word: "1% of monthly target (es…", "5 active RTT/cert tasks i…", "18 active coaches from …", "Dashboard live at johns…", "Jorge + Laura engineeri…". These strings are never short. Allow two lines and drop the max-width, or move the detail into the card body.
- **Pace line** (~line 597) — "Needs +12,036.3 leads/day to hit target b…" also truncates. Same treatment.
- **Business Health criteria pills** (`OverviewStats.tsx` ~line 350, `grid-cols-2`) — at tablet/laptop width these render "Team **Ne…**" and "Pipeline **O.**". Stack to a single column below `xl`.

A badge you can't read is worse than no badge.

### 8. Flag the money-losing ad spend
**File:** `src/components/FlowlyOS.tsx` (and the CRO tile in `OverviewStats.tsx`)

Live 30d: **Spend £4,261.53 → Revenue £2,763.74, ROAS 0.65x.** Flowly is losing roughly £1,500/month on paid acquisition, and it renders as tile 6 of 8 with the same visual weight as "CPL £0.65".

When `roas < 1`, show a prominent warning stating the **loss in currency** ("Losing £1,498 over the last 30 days at 0.65x ROAS"), not just a ratio in small red text.

While you're there: suppress percentage deltas when the prior period is immaterial. "**+2,026%**" is computed off a £130 base — show "£130 → £2,764" instead.

### 9. Cosmetic data-quality fixes on Overview
**File:** `src/components/OverviewStats.tsx`

- Drop **John Davy himself** from Team Pulse counts/lists — he doesn't need to monitor himself. (The name-level fix for "Marissa Peer" is backend; don't hard-code a spelling correction here.)
- "Needs Your Sign-off" renders customer email addresses (`dianavogel@icloud.com`, `countanitha@gmail.com`) from Asana task titles. Strip email addresses from displayed task names. Also reconsider the label — these are other people's build tasks, not things awaiting John's signature. "Overdue across the team" is honest; "Needs Your Sign-off" is not.
- Drop `"Untitled section"` from the "Top section" / section-breakdown chips — it's Asana bookkeeping, not executive signal.

---

## P1 — This month

### 10. Cap mathematically dead pace numbers
**File:** `src/components/StrategicPriorities.tsx` (~line 531, `requiredPerDay`)

Priority 1 shows *"Needs +12,036 leads/day"* against a current run rate of ~6,512/**month** — a 55× step change. Priority 4 shows *"Needs +6.5 integration milestones/day"* with 10 days left at 35%. These are arithmetic on impossible constraints, and the number grows every day John looks at it.

When required pace exceeds a sane multiple of demonstrated pace (~3× is a reasonable threshold), stop printing the number and print the decision instead: **"Unreachable at current pace — reset the target or the date."** That's the CEO action; the number isn't.

### 11. "Clear" must not mean "no data"
**File:** `src/lib/dataService.ts` (~line 1294)

`overdue_tasks === 0 && pending_tasks === 0` currently maps to **"Clear"**, which reads as a positive all-clear. 17 of 22 people hit this branch — including the CTO, the Chief of Staff, and Marisa Peer. It doesn't mean they're fine; it means *they have no Asana tasks and we have no signal on them at all*. A green-adjacent label on 17 invisible people is the most misleading element in the app.

Split the branch: if the person never appears in the Asana assignee map (`m.id` absent from `knownAssignees`), label **"No data"** with neutral/grey styling. Only label "Clear" when they demonstrably had tasks and closed them. Backend is adding a proper signal for this — until then the assignee-map heuristic is the honest approximation.

### 12. Schedule-conflict detection
**File:** `src/lib/categorizeMeetings.ts` / `src/components/MeetingsList.tsx`

Tonight the dashboard renders **"Marisa x Uare.ai (Go Live)" at 18:30** and **John's flight to Tallinn at 18:50** — calmly, 20 minutes apart, with no comment. Overlap detection across today's events (after dedupe — do #1 first, or every recurring meeting will "conflict" with its own duplicate) is ~30 lines and is exactly the "surface what needs a decision NOW" the product spec asks for. Flag overlapping events, and flag meetings that collide with travel/FYI-category events.

### 13. Fix the floating dock
**Files:** `src/components/QuickActions.tsx`, `src/components/ChiefOfStaffChat.tsx`

- The dock is `fixed bottom-6 left-1/2 -translate-x-1/2` — centred on the **viewport**, ignoring the 248px sidebar. It renders visibly off-centre and overlaps the sidebar edge on desktop. Centre it within the content column (account for the collapsed/expanded sidebar width).
- The Chief-of-Staff FAB is `fixed bottom-6 right-6` and sits **on top of** the dock's "Refresh All" button on mobile. Offset it above the dock, or move the dock.
- On mobile the dock covers the agenda list mid-scroll. The existing hide-on-scroll-down behaviour helps but doesn't fully solve it.

### 14. Make the dock contextual
**File:** `src/components/QuickActions.tsx`

The same 6 buttons appear on every page (flagged in the 20 Jul audit, still outstanding). "Search Notes" and "Daily Brief" don't belong on Revenue Pulse. Reduce to 2–3 page-relevant actions plus the universal ones (Refresh, Brief John).

### 15. Surface headline verdicts from the brief
**File:** `src/components/MorningBrief.tsx`

The brief contains a section literally headed **"9. OVERALL VERDICT: LEANING YES"** — something material is being decided, the AI has a position on it, and it's behind two expand clicks. Detect verdict//recommendation-style section headings and surface them at the top of the brief rather than in the accordion.

---

## P2 — Worth doing, lower urgency

16. **Business Health double-counts the leads goal.** `pipelineStatus` is derived from Priority 1 (500K leads), which *also* feeds `prioritiesStatus` — so one goal drives half the four-input score. Today's 46 is real but more pessimistic than the facts justify. Either drop Pipeline as a separate input or derive it from something independent (e.g. Flowly lead flow directly).
17. **Explain the health score.** 100/55/15 per input, equally weighted, no methodology shown (`OverviewStats.tsx` ~line 224). If John is going to quote "we're at 46," he needs to defend it. One tooltip in the expandable breakdown.
18. **Move local state to the server.** Health-score history, team trend snapshots, quick notes, and project annotations all live in `localStorage` — they reset on his phone, in a new browser, after a cache clear. The "↑ 4 vs 7d ago" trend is per-device fiction. Needs backend endpoints (being requested); wire up when available.
19. **Cap role descriptions** in Team Pulse at ~8 words. They currently range from "Team Member" (9 people) to a 40-word paragraph.
20. **Initials collide** — SS = Stephen Sutherland *and* Shaigan Shah; HB/HR = two Haseebs. Disambiguate.
21. **Fix the voice** on the Quick Note placeholder: *"Type a note, question, or instruction **for John**…"* — John is the user. It's written for his assistant.
22. **Consider dark mode.** The cream/serif treatment is genuinely good and the deviation from the spec's "dark mode only" was the right call — but John checks this at 11pm.
23. **Dead route:** `next.config.ts` rewrites `/automation` to `/`, but no such section exists in `SECTIONS`. Either build the Automation Health page (backend endpoint pending) or remove the rewrite.

---

## Explicitly NOT your scope

These are backend/Hermes fixes — don't work around them beyond the mitigations named above:

- Root-cause of the duplicated calendar events, and declaring a timezone in the payload
- `overview.today_events` returning `0` while `calendar.events` holds 37 entries
- "Marissa Peer" misspelling and John Davy's presence in the team roster
- Decision-vs-status-vs-incident classification, and `confidence` being hardcoded `"medium"`
- Costs / margin / runway (Xero), currency normalisation, per-funnel ad spend
- Automation health + Recall.ai credit alerting
