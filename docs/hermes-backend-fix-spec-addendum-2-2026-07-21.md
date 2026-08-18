# Hermes Backend — Fix Spec, Addendum #2

**For:** whoever operates the live Hermes agent behind `HERMES_API_BASE`
**Date:** 21 July 2026 (later same day than addendum #1)
**Reads after:** `hermes-backend-fix-spec.md` (items 1–13), then `hermes-backend-fix-spec-addendum-2026-07-21.md` (items A1–A13).

This addendum does three things:

1. **Corrects the root-cause diagnosis of A1 and A2.** The previous addendum was wrong about *why* calendar events duplicate. Acting on it as written would fix the wrong thing.
2. **Acknowledges A6 as already shipped** — `tracked_in_asana` is live and the frontend is switching to it.
3. **Files new items (B1–B9)** found by inspecting raw endpoint responses rather than the rendered dashboard.

Every item below is scoped to **access Hermes demonstrably already has**, and says so explicitly. Where a fix needs access Hermes *doesn't* have, the ask is to **expose provenance so the dashboard can degrade honestly** — not to invent the number. Section 3 lists what's genuinely blocked.

---

## 0. Corrections to Addendum #1

### C1 — A1 was misdiagnosed. There is no "+2h offset bug."

Addendum #1 said recurring events are "duplicated, exactly +2h apart" and asked you to hunt a timezone-resolution bug. **The two copies are the same instant.** They only looked 2h apart because the dashboard was slicing wall-clock characters out of the ISO string and discarding the offset (now fixed frontend-side).

The real cause is visible in the `location` field, which carries the Google Calendar event URL. Base64-decoding its `eid` parameter:

```
2026-07-22T09:00:00+01:00 → 0tqcas2f0rju60uq95mr933knq_20260722T080000Z laura.gort@marisapeer.com
2026-07-22T11:00:00+03:00 → 0tqcas2f0rju60uq95mr933knq_20260722T080000Z john@rtt.com
```

**Same Google event ID. Same UTC instant (`20260722T080000Z`). Two different calendar accounts.**

`GET /api/dashboard/cache` is ingesting **six** calendars and never deduplicating shared meetings across them:

| Source account | Events |
|---|---|
| `john@rtt.com` | 107 |
| `laura.gort@marisapeer.com` | 59 |
| `stephen.sutherland@marisapeer.com` | 35 |
| `marisa.events@marisapeer.com` | 9 |
| `marisa@marisapeer.com` | 4 |
| `pv8i7u4tlu6numhfuv2eonnq5dutp5ol@i` (opaque) | 6 |

Every meeting with an internal attendee arrives once per attendee's calendar, each rendered in **that account's own display timezone** — which is why the offsets are `+01:00` (the UK accounts, correct BST) and `+03:00` (John's). It also explains why "Home" appears three times today: three different people each have a personal all-day "Home" event.

**Ask:** dedupe at ingestion on the canonical occurrence ID — the part of the decoded `eid` before the space (`<event_id>_<UTC instant>`). Prefer John's own copy when present, since it carries his response status. This requires no new access; the key is already in the payload you're returning.

**Please don't** dedupe on `(title, wall-clock time)` — that would merge genuinely distinct same-name blocks (there are two different "Call Block" entries today) and would still miss cross-account copies whose wall-clocks differ.

### C2 — A2: the timezone problem is a *calendar setting*, not a code bug

Related to the above. John's account, `john@rtt.com`, emits **`+03:00`**. Dubai is **`+04:00`**. The UK-based accounts correctly emit `+01:00`.

No event in the entire 220-event payload carries `+04:00`.

So John's Google Calendar display timezone appears to be set to a UTC+3 zone while he works from Dubai. That single setting is the most likely origin of the recurring "times are about an hour off" complaint — anything reading his calendar's wall-clock (including the briefing generator's prose) is an hour behind Dubai.

**Ask:** (a) check and correct the timezone setting on `john@rtt.com`; (b) still emit RFC 3339 with offset as A2 requested, plus an explicit `timezone` field on the calendar payload, so consumers never have to guess. The frontend now parses offsets correctly and converts to `Asia/Dubai`, so once the setting is right this resolves without further frontend work.

### C3 — A6 is done. Thank you.

`/api/team/pulse` now returns `tracked_in_asana`, `completed_tasks_7d`, and `days_since_last_activity` per member. The dashboard was using a fragile assignee-map heuristic to approximate this and is switching to the real fields. **No further action.**

---

## 1. Fixable with access Hermes already has

*(Google Calendar OAuth, Gmail, Asana, Flowly MCP, the notes vault, the cron output directory.)*

### B1 — `overview` has no `today_events`, and four keys compete to hold it
**Access needed:** none — this is a schema decision.
**This is the root cause of A3**, which addendum #1 filed as "the scalar is wrong." It isn't wrong; it doesn't exist.

`GET /api/dashboard/cache` returns:

```json
"overview": { "total_inbox": 10, "active_tasks": 70, "upcoming_events": 220, "team_count": 12 }
```

There is no `today_events` inside `overview` at all, so the dashboard reads `undefined` and coerces to `0`. Meanwhile the cache root holds **four** separate event collections:

- `today_events` — currently contains **2026-07-20** events (yesterday)
- `todays_events` — contains 2026-07-21 events (today)
- `today_events.prev`, `todays_events.prev`
- plus `calendar.events` (220) and `calendar.today`

Two spellings of the same concept holding **different days**, alongside two more copies in `calendar`. Six places to look for the same thing.

Also in that same object:
- `upcoming_events: 220` is the entire raw event list including past events and duplicates — it is not "upcoming."
- `team_count: 12`, but `/api/team/pulse` returns **24** members.

**Ask:** pick one canonical location, delete the others, and make `overview.today_events` an integer computed from the same deduplicated source as `calendar.events`, scoped to Dubai's calendar day. Fix `upcoming_events` to mean upcoming, and `team_count` to agree with the roster endpoint.

**Why it matters:** the dashboard has a branch that reads "Calendar shows N events today, but times haven't synced." With the scalar permanently `0`, that branch is unreachable, and if calendar sync ever fails John gets a confident **"No meetings scheduled today"** — a false all-clear, which is precisely the failure mode this product is otherwise good at avoiding.

### B2 — `/api/revenue` returns three mutually contradictory totals
**Access needed:** none — all three numbers are already computed in the same response.

A single response contains:

| Field | Value |
|---|---|
| `mtd_total` | **275,780.94** |
| `trailing_30d_revenue` | **52,012.59** |
| `daily_trend` (sum of July points) | **~84,819** |

Month-to-date covers 21 days. Trailing-30-days covers 30 days and **includes** those 21. It is arithmetically impossible for MTD to be 5.3× the trailing-30-day figure. And neither reconciles with the daily series.

The dashboard renders `mtd_total` as **"69% toward monthly target"** — the single most prominent number on the Revenue card — and plots `daily_trend` immediately beside it.

**Ask:** determine which is authoritative and reconcile. My guess is that they're computed from different Gmail queries or different account scopes, but that's a guess and you can see the code.

### B3 — `daily_trend` is a sparse series presented as a daily one
**Access needed:** none.

`daily_trend` has **17 points spanning 2026-06-15 → 2026-07-21** — 37 calendar days. Days with no Emirates NBD credit are **omitted**, not zero-filled. Consequences on screen:

- The "last 7 days" sparkline actually spans **13 calendar days** (Jul 9, 14, 15, 16, 17, 20, 21) and labels them `Thu Tue Wed Thu Fri Mon Tue`.
- "↓ 44% vs yesterday" compares the last two *points*. Today that happens to be Jul 20→21. On Jul 14 it would have compared against Jul 9 and still said "yesterday."

**Ask:** return a dense series — one entry per calendar day with `0.0` where there were no credits — and include an explicit `date` on every point (it's already there; keep it). Zero is a true statement about a day with no bank credits; omission is not.

### B4 — Two different values for Strategic Priority 1
**Access needed:** none — Flowly MCP, already connected.

`GET /api/strategic` returns Priority 1 as `current: 305, pct: 0.1`. The dashboard cache path renders the same priority as `current: 6512, pct: 1`. Both are live, both are "Priority 1", and they disagree by 21×.

Your own `note` on that priority already flags the underlying cause:

> `"Flowly all-time: 305 leads (24h: 305)"`

and `/api/flowly`'s blockers array says it outright:

> `"Flowly all-time leads (0) < 24h leads (305) — MCP query bug needs fix"`

An all-time total that is smaller than the 24-hour total is definitionally broken, and Hermes already knows it.

**Ask:** fix the Flowly MCP all-time leads query, then make `/api/strategic` and the dashboard cache derive Priority 1 from one source. Credit where due — the self-reported blocker is exactly the right behaviour; it just needs closing out.

### B5 — Flowly reports two conversion rates, 7× apart
**Access needed:** none — Flowly MCP.

- `/api/flowly` → `conversion_rate_pct: 24.4`
- `/api/flowly` → `cro.totals.convRatePct: 3.32`

Same product, same payload. 3.32% is consistent with the funnel table (216 sales ÷ 6,512 leads). 24.4% is not reconcilable with anything else in the response.

The dashboard doesn't currently render 24.4% — but it **does** ship it in the "Marketing Pack" markdown John downloads and forwards. So the report he sends people contradicts the dashboard he read it from.

**Ask:** establish which denominator 24.4% uses, and either fix it or remove the field.

### B6 — Team roster strings carry raw markdown from the vault
**Access needed:** none — the notes vault.

`members[0].role` is the literal string `"** Flowly Health SEO + blogs"`. The leading `**` is an unclosed bold marker leaking out of the notes file the role was parsed from. It renders verbatim on the Team page.

This sits alongside the still-open A5 items (John Davy still in his own roster; role lengths ranging from `"Team Member"` to a 40-word paragraph). Further roster pollution confirmed live in `/api/team/pulse` (24 members):

- **`"Contact: +92 766 9964343"` is returned as a team member.** A phone number parsed out of a note as if it were a person.
- **Partial-name duplicates:** both `"Stephen"` and `"Stephen Sutherland"`, and both `"Zeeshan"` and `"Zeeshan Jillani"`, are separate member records.
- **Roles truncated mid-sentence:** `"has expanded from full-stack development/quiz result pages into"`, `"Marketing — graphics design, ad copy, content creation,"` — sentence fragments lifted from prose, ending on a preposition or a comma.

Credit where due: **"Marisa Peer" is now spelled correctly** — that part of A5 has landed.

The dashboard currently masks the junk entries by deduplicating on its own, but it's guessing. These are roster records, not display strings.

**Ask:** strip markdown when parsing vault-derived strings, reject non-person records, merge partial-name duplicates on `id`, and land the rest of A5. A short canonical `role` (≤ 8 words) plus optional `role_detail` — as A5 originally asked — would solve the truncation cleanly.

### B7 — Ad spend renders as current while Meta Ads is `blocked`
**Access needed:** none for the fix; the *data* is what's blocked.

`/api/connections` reports `metaAds: "blocked"`, yet `cro.totals` returns `spend30d: 4261.53` and `roas: 0.65`. The dashboard now renders a prominent red banner off those figures — **"Losing £1,497.79 over the last 30d at 0.65x ROAS"** — with no indication of how old the spend number is.

If that connection has been blocked for a while, the dashboard is making a confident financial claim from stale data.

**Ask:** attach `spend_as_of` and `spend_source` (live vs cached) to `cro.totals`, so the frontend can date the claim or suppress it. This is the same provenance pattern you already apply elsewhere via `fetched_at` / `from_cache` — it just isn't on the spend fields.

---

## 2. Not fixable with current access — label honestly instead

These are the "showing fake" items. **The ask is not to go get real data.** It's to stop presenting estimates, manual entries and proxy metrics with the same confidence as measured ones, so the dashboard can render them honestly.

The frontend already has a strong pattern for this (`dailyPending` → "Syncing…", "Task data hasn't synced yet", hiding per-funnel ROAS rather than showing £0.00). It just needs the metadata to trigger on.

**Proposed shared shape** — add to every strategic priority:

```json
{
  "measurement": "live" | "proxy" | "manual" | "estimate",
  "measured_as_of": "2026-07-14T00:00:00+04:00",
  "measurement_note": "Counted from open Asana tasks, not from closed sales."
}
```

### B8 — Priorities 2–5 are proxies and manual entries rendered as measurements

| # | Goal | What's actually counted | Problem |
|---|---|---|---|
| **2** | "150 RTT Integrated sales at $15,000 each" | `current: 5`, `unit: "certifications YTD"`, note: *"5 active RTT/cert tasks in Asana pipeline"* | Counts **open Asana tasks** and labels them **certifications sold**. A $2.25M revenue goal tracked by a task count. `revenue: 0` and `avg_price: 0` sit unused right next to it. |
| **3** | "100 Inner Belief coaches earning $8K/month" | `current: 18`, note: *"18 active coaches from CEO notes. No live tracking system — update manually."* | Hand-maintained number rendered with a progress bar, a percentage, a traffic light **and a `trend_pct` of 3** — computed precision on top of a manual figure. |
| **4** | "Single source of truth (Mosaic)" | `current: 35` of 100 "integration milestones" | Subjective roll-up of items like "pending" / "in progress". Existing spec item 8 asked about this unit and it's still unclear. |
| **5** | "Agentic AI end-to-end buildouts" | `current: 55` of 100, `unit: ""` | **No unit at all.** Renders as "55/100" with a progress bar. |

**Ask, in priority order:**
1. **P2 is the most serious** — either point it at a real sales source (Stripe is listed as "pending" under P5; until then there is no live source) or set `measurement: "proxy"` with a note, and change `unit` to `"open cert tasks"` so the label stops claiming sales.
2. **P3** — set `measurement: "manual"` and `measured_as_of`, and **drop `trend_pct`**. A trend on a manually-updated number is fabricated precision.
3. **P4/P5** — give P5 a unit, and define what one "integration milestone" is.

### B9 — `confidence` is still `"medium"` on every decision

Existing spec item 4, re-confirmed live: all six decisions return `confidence: "medium"`. A badge with one possible value conveys nothing.

**Ask:** as originally filed — either make it discriminate, or remove it. Removing it is a perfectly good outcome and cheaper than faking a scale. A7's `type` field (decision / status / incident / acknowledgment) remains the higher-value change.

---

## 3. Genuinely blocked — please confirm status rather than stay silent

Nothing here can be built without new access. What the dashboard needs is an honest signal that it's unavailable, so it can say so instead of rendering a gap.

| Item | Blocked on | Ask |
|---|---|---|
| **A9** — costs, margin, runway | **Xero not connected.** Tracked as a P4 milestone, "pending, due 2026-07-31" | If that date slips, say so in the payload. The dashboard is silently revenue-only and a CEO cannot run a business on gross inflows. |
| **Per-funnel spend/ROAS** (spec item 3) | **Meta Ads `blocked`** | Confirm whether this is an auth expiry or a policy block, and roughly when it broke. See also B7. |
| **A11** — Recall.ai credits | Recall.ai API | `recallAi: "low_credits"` surfaces **nowhere** in the UI except one dot in "5/8 systems connected". Quantified credits + a severity field, as A11 asked. If it runs out, John silently loses every transcript — and transcripts feed the Decision Log and much of the brief. |
| **A10** — one currency | FX source | Partially shipped: `/api/revenue` now returns `currency`, `reporting_currency`, `fx_rate`, `fx_as_of`, `fx_note`. It's a no-op (AED→AED). Extend the same shape to `/api/flowly` (£) and `/api/strategic` ($) so the three can be added up. |

---

## Suggested order

1. **C1 + C2** — calendar dedupe on the decoded `eid`, and John's calendar timezone setting. Highest consequence, and C1 is a contained change with the key already in hand.
2. **B2** — the revenue contradiction. It's the most prominent number on the dashboard and it cannot currently be right.
3. **B1** — collapse the four event keys and make `overview.today_events` real. Removes a latent false all-clear.
4. **B8 (P2 first)** — a task count standing in for $2.25M of sales is the most misleading single element left in the product.
5. **B4, B5** — Flowly's self-reported query bug and the duplicate conversion rate.
6. **B3, B6, B7, B9** — cheap, contained.
7. **Section 3** — status confirmations, not code.

## Note on frontend mitigations

The dashboard currently carries deliberate, commented mitigations for the calendar duplication (dedupe on title + parsed instant) and briefing-blocker negations. **Both are marked for removal once C1 and A4 land** — please flag when they ship so the workarounds come out rather than silently double-handling the data.
