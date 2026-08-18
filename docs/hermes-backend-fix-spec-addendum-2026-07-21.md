# Hermes Backend — Fix Spec Addendum (audit #2)

**For:** whoever operates the live Hermes agent behind `HERMES_API_BASE`
**Date:** 21 July 2026
**Relationship to the existing spec:** this is an **addendum to `docs/hermes-backend-fix-spec.md`**, not a replacement. That document's items 1–10 (LLM-backed `/api/ask`, empty `departments`, per-funnel spend, `confidence` hardcoding, `source_ref`, the 100-task cap, the inactivity threshold, Priority 4's unit label, `/api/briefing/refresh`, priority owners) all still stand. **Read it first.** Everything below is *new* — found in a second audit conducted against live data on 21 July, after those items were filed.

Everything here is a backend change. None of it can be fixed from the dashboard, though the frontend is adding defensive mitigations for A1/A2/A4 in the meantime (see `docs/frontend-fix-prompt-2026-07-21.md`) — those mitigations should be removable once these land.

---

## P0 — Actively wrong data reaching John

### A1. Every recurring calendar event is duplicated, exactly +2h apart
**Confirmed live** (`GET /api/dashboard/cache` → `cache.calendar.events`, 21 Jul): the dashboard shows "37 meetings today"; the real number is ~18. Confirmed pairs:

| Title | Instance 1 | Instance 2 |
|---|---|---|
| Daily Team Call (Agenda Attached) | 09:00 | 11:00 |
| John / Laura - Daily Space | 09:30 | 11:30 |
| Flowly <> MP Team (Weekly) | 11:00 | 13:00 |
| Neil John Stephen Laura re: Tech / AI Builds (Weekly) | 11:45 | 13:45 |
| John's Brain FlowlyOS | 13:00 | 15:00 |
| ZVC - Meet Marisa | 16:00 | 18:00 |

An exact, uniform +2h offset across every pair points at the same event being ingested from two sources, or one source resolved against two different timezone assumptions — not at genuine double-bookings.

**Ask:** find and fix the duplication at ingestion, and dedupe in the cache. This has a real cost beyond tidiness — the previous audit concluded "John has 35 meetings a day, the agenda is overwhelming," and built meeting categorisation to cope. Half of that problem was this bug.

### A2. Calendar event timestamps carry no timezone, and are ~1h off the brief
**Confirmed live:** `calendar.events[].start` is an ISO-ish string with no declared zone. The dashboard was reading wall-clock characters straight out of it (now being fixed to parse and convert properly) — but it has nothing to convert *from*, because the payload never states what zone these are in.

Concretely, today the brief's own generated prose says *"Ana & John updates (10am), Daily Team Call (11am), John/Laura Daily Space (11:30am)"* while `calendar.events` puts the same three meetings at **09:00, 09:00 and 09:30**. The briefing generator and the calendar cache disagree by about an hour about the same events.

**Ask:** two things.
1. Emit fully-qualified timestamps (RFC 3339 with offset, e.g. `2026-07-21T10:00:00+04:00`) or add an explicit `timezone` field to the calendar payload.
2. Reconcile the briefing generator and the calendar cache so they agree on what time a meeting is. Right now one of them is wrong and there's no way to tell which from the outside.

This is more than cosmetic: John travels constantly (he flies to Tallinn tonight). Times that are ambiguous about their zone become actively dangerous the moment he changes location.

### A3. `overview.today_events` is `0` while 37 events are present
**Confirmed live:** the same payload carries `overview.today_events: 0` and a fully-populated `calendar.events` array. Anything keying off the scalar is wrong — including a dashboard fallback that would have told John *"Calendar shows 0 events today"* while listing his meetings directly above it.

**Ask:** compute `today_events` from the same source as `calendar.events`, scoped to Dubai's calendar day.

### A4. Briefing `highlights.blockers` contains non-blockers
**Confirmed live:** `briefing.highlights.blockers[1]` is the literal string `"Blocked: None visible."`. The dashboard renders the first two blockers, so John's Blockers card currently reads:

> 🚧 BLOCKERS — 5 Items
> • Stephen is OOO for the next week…
> • Blocked: None visible.

The brief's prose is being split into bullets without checking whether a given line is a *negation* of the category it's being filed under. The same array also mixes genuine blockers with forward-looking items ("Next 48 hours: …") and project-status prose.

**Ask:** in the briefing parser, drop lines that negate their own heading, and ideally separate `blockers` from `risks` and `upcoming` rather than flattening all three into one array. The frontend is adding a filter as a stopgap, but it's guessing at intent from the outside.

### A5. Team roster data errors
**Confirmed live** (`GET /api/team/pulse`):

- **"Marissa Peer"** — the founder the company is named after, misspelled with a double-s, and given the role "Team Member". This is the single most embarrassing string in the app.
- **John Davy is in his own team roster** ("Founder & CEO"). The dashboard is his; he doesn't need to monitor himself. Either exclude him or flag him so the frontend can.
- **Role descriptions vary wildly in length** — from `"Team Member"` (9 of 22 people) to a 40-word paragraph for one engineer. This was flagged in the 20 Jul audit as item 7-adjacent and hasn't moved. A short canonical `role` (≤ 8 words) plus an optional long-form `role_detail` would let the frontend render consistently.

---

## P1 — Signal quality

### A6. Distinguish "no tasks" from "no data" per team member
**Related to existing spec item 7** (undocumented inactivity threshold) but distinct and more urgent.

The dashboard maps `overdue_tasks === 0 && pending_tasks === 0` to a status of **"Clear"** — which reads as a green all-clear. **17 of 22 people currently hit that branch**, including the CTO, the Chief of Staff and Marisa Peer. But zero tasks doesn't mean they're on top of things; it means they don't appear in Asana at all and we have no signal on them whatsoever.

**Ask:** expose a field that distinguishes these — e.g. `tracked_in_asana: bool`, or `total_tasks_ever` — so "Clear" can be reserved for people who demonstrably had work and closed it, and everyone else can be honestly labelled "No data". Also please expose the raw `days_since_last_activity` requested in existing item 7; it's the natural companion to this.

### A7. Classify decisions vs statuses vs incidents
**Extends existing spec items 4 and 5** (`confidence` hardcoded, no `source_ref`) — the classification problem is separate from the confidence problem.

`/api/decisions` currently returns a flat list where these three sit side by side, indistinguishable:

- *"Zeeshan clarified: PDF was intended as preliminary review — full package to follow now direction is approved"* — a genuine **decision**
- *"Status: 🔴 Zero candidates approved. Need fresh sourcing strategy."* — a **status update**
- *"Catherine Shippey: Confirmed receipt of asset info."* — an **acknowledgment**, not a decision at all
- *"Jorge confirmed the domain was deleted from the Google Workspace account… Loss of ~20 days of emails (25 Jun – 14 Jul)."* — an **incident**, and arguably the most urgent item in the entire payload, currently filed under "Decisions" where it will be scrolled past

**Ask:** add a `type` field (`decision` | `status` | `incident` | `acknowledgment`) so the frontend can route these to the right place. Incidents in particular should not be buried in a decision log — losing 20 days of company email is not a decision.

### A8. Revenue is labelled as revenue but is bank credits
**Related to existing item 2** (empty `departments`), but a naming/semantics issue in its own right.

`/api/revenue` feeds a card headed "Today's Revenue (Emirates NBD)" with the sub-label "Figures are estimated". As far as I can tell these are parsed inbound credit notifications — i.e. **cash received**, not recognised revenue, and with no costs on the other side.

**Ask:** confirm what this number actually represents, and name the field accordingly (`cash_received` vs `revenue`). A CEO making decisions on a number labelled "revenue" that's actually gross bank inflow is a real risk, and the honest label costs nothing.

### A9. No costs, margin, or runway anywhere
This is the biggest *content* gap in the product and was raised as F1/F4 in the 20 Jul audit without a backend counterpart being filed. The dashboard can currently tell John what came in and nothing about what went out.

**Ask:** a `/api/financials` endpoint — revenue, COGS, gross margin, OPEX, net profit, cash balance, monthly burn, runway months. Xero is the presumed source and is already tracked as a milestone under Strategic Priority 4 (Mosaic, "Xero integration: pending, due 2026-07-31"). If that milestone slips, say so explicitly rather than leaving the dashboard silently revenue-only.

### A10. Three currencies, never reconciled
**Confirmed live:** revenue in **AED** (`/api/revenue`), Flowly CRO in **£** (`/api/flowly`), strategic priorities in **$** (`"150 RTT Integrated at $15,000 each"`, `"100 coaches at $8K/month"`). John cannot add up his own business from one screen.

**Ask:** pick a reporting currency, return normalised values alongside the originals (`amount`, `currency`, `amount_reporting`, `reporting_currency`, `fx_rate`, `fx_as_of`), so the frontend can show one currency with the original on hover. Please don't normalise destructively — the source currency matters for audit.

---

## P2 — Infrastructure visibility

### A11. No automation-health endpoint, and Recall.ai is quietly dying
The original product spec (§3.5) called for a cron-health and system-alerts view. It was never built, and there's no endpoint to build it from — `next.config.ts` still rewrites a dead `/automation` route as evidence of the intent.

Meanwhile `/api/connections` reports `recallAi: "low_credits"`, and the *entire* surfacing of that fact in the UI is one coloured dot inside a "5/8 systems connected" line in the sidebar. **If Recall.ai runs out, John silently loses every meeting transcript** — which is the input to the Decision Log, the meeting summaries, and a good chunk of the brief's intelligence.

**Ask:**
1. An endpoint exposing per-cron-job health (last run, status, last error) — the data exists in `~/.hermes/cron/output/`.
2. Quantified credit/quota state for the services that have it (Recall.ai especially — remaining credits, burn rate, estimated days left), not just a `low_credits` enum.
3. A severity field so the dashboard can escalate "you have ~3 days of meeting-bot credits left" out of a sidebar dot and into an alert.

### A12. Briefing verdict sections have no subject
**Observed:** today's brief contains a section headed **`"9. OVERALL VERDICT: LEANING YES"`**. Leaning yes on *what*? The heading carries a recommendation with no visible subject, sitting behind two expand clicks in the UI.

**Ask:** either make verdict-style headings self-describing (`"OVERALL VERDICT — Suhail/Sheeraz partnership: LEANING YES"`), or add structured fields (`subject`, `verdict`, `confidence`) so the frontend can surface it prominently instead of hiding a recommendation in an accordion.

### A13. Strategic Priority 1's target may simply be wrong
**Observed:** Priority 1 is "500,000 leads/month", current 6,512, 41 days remaining — the dashboard is therefore computing *"needs +12,036 leads/day"*, against a demonstrated run rate of ~6,512/**month**. That's a 55× step change, and the required-pace number grows every day it isn't hit.

The frontend is being changed to stop printing impossible pace figures and say "unreachable at current pace — reset the target or the date" instead. But **the underlying question is a business one**: is 500K/month genuinely the Q3 target, or is this a stale/aspirational number in John's Brain that's now poisoning both the priorities page and the Business Health score (it drives two of the four health inputs)?

**Ask:** confirm the target and deadline with John, and update the source. No amount of frontend work fixes a wrong goal.

---

## Suggested order

1. **A1, A2, A3** — calendar duplication and timezones. Wrong times on a travelling CEO's dashboard is the most consequential class of bug here.
2. **A5, A4** — cheap, embarrassing, visible today.
3. **A6, A7** — signal quality; these determine whether John trusts the team and decision views at all.
4. **A11** — before Recall.ai actually runs out.
5. **A8, A13** — both are "confirm what this number means" conversations, not code.
6. **A9, A10, A12** — larger builds.
