# CEO Dashboard — Audit #2

**Date:** 21 July 2026
**Audited against:** live localhost:3000 with real Hermes data (not mocks)
**Lens:** what John Davy actually needs at 7am, and what he'd resent at 11pm
**Relationship to [the 20 Jul audit](CEO-Dashboard-Audit-2026-07-20.md):** most of its P0/P1 list has shipped (meeting grouping, Projects auto-populate, traffic-light priorities, team status granularity, decision confidence badges, pace wording, department table). This audit is the next layer, plus bugs that only surface with live data.

---

## 0. The one-sentence verdict

The plumbing is now genuinely good and the data is real — but **the smartest thing in the app is buried, and the loudest thing in the app is noise.** Fix that inversion and this goes from "impressive dashboard" to "John opens it every morning."

---

## 1. What's genuinely good — protect these

| Thing | Why it works |
|---|---|
| **The Morning Brief's blockers/opportunities** | This is CEO-grade intelligence. *"Client Launchpad Webinar Replay VSL — six pushes since Jan"* is serial-slippage detection no human would spot. *"Suhail/Sheeraz pushing to meet THIS WEEK before both go on vacation"* is a time-boxed opportunity with a deadline. Nothing else in the app comes close. |
| **Honest degradation** | `dailyPending` → "Syncing…" instead of a confident AED 0. The stale-data banner. "Task data hasn't synced yet" instead of "0 of 0." Most dashboards lie when upstream breaks; this one refuses to. That's rare and it's the reason John can trust the numbers. |
| **"Needs +X/day to hit target"** | Still the best-designed metric in the app (caveat in §3.4). |
| **Flowly per-funnel economics** | Right altitude for a CEO overseeing a growth product. |
| **Projects page** | Fully recovered from the previous audit — live completion %, owners, overdue drill-down, and honest disclosure about the 100-task pagination limit. |
| **Visual design** | The cream/serif/maroon treatment reads expensive and calm. It deviates from the spec's "dark mode only," and that was the right call. |

---

## 2. Bugs found with live data (P0)

### B1 — Every recurring meeting is duplicated, +2h apart
"Today's Agenda (37)" is really ~18 meetings. Confirmed pairs in the live payload:

| Meeting | Shown at | And again at |
|---|---|---|
| Daily Team Call (Agenda Attached) | 09:00 | 11:00 |
| John / Laura - Daily Space | 09:30 | 11:30 |
| Flowly <> MP Team (Weekly) | 11:00 | 13:00 |
| Neil John Stephen Laura re: Tech / AI Builds | 11:45 | 13:45 |
| John's Brain FlowlyOS | 13:00 | 15:00 |
| ZVC - Meet Marisa | 16:00 | 18:00 |

An exact +2h offset on every pair means the same event is arriving from two sources (or one source resolved against two timezones) and neither copy is being deduped. **This is why the agenda feels overwhelming** — the previous audit's "35 meetings is too many" was half a data bug, not a scheduling reality.

Fix: dedupe on `(normalized title, attendees)` before render, and resolve the offset upstream in Hermes.

### B2 — Meeting times are ~1h off, and follow the viewer, not Dubai
The brief's own text says *"Ana & John updates (10am)"*; the agenda list renders it at **09:00**. Separately, the header renders "Dubai · 12:29 PM" while the hero directly beneath renders "Synced 01:29 PM" — because the header is Dubai-pinned and everything else uses `toLocaleTimeString()` with the viewer's local timezone.

This matters more than it looks: **John flies to Tallinn tonight** (Air Baltic BT872, 18:50). The moment he lands, every time on his dashboard silently shifts by 3 hours. Pin the whole app to `Asia/Dubai` (or make the timezone an explicit, visible toggle).

### B3 — `overview.todayEvents` is 0 while 37 events are present
The payload carries `todayEvents: 0` alongside a fully-populated `calendar.events`. Anything keying off `todayEvents` is wrong — including the QuickActions fallback that would tell John "Calendar shows 0 events today."

### B4 — "Blocked: None visible." is rendered *as a blocker*
`MorningBrief` shows `blockers.slice(0,2)`. Blocker #2 in the live payload is the literal string `"Blocked: None visible."`. So John's Blockers card currently reads:

> 🚧 BLOCKERS — 5 Items
> • Stephen is OOO for the next week…
> • Blocked: None visible.

The brief's prose is being split into bullets without checking whether a bullet is a negation. Filter these, and don't count them in the badge.

### B5 — Marisa Peer's name is misspelled in Team Pulse
Rendered as **"Marissa Peer"**, role "Team Member". This is the person the company is named after. Also in the list: **John Davy himself** ("Founder & CEO — Clear"). He does not need to monitor himself.

---

## 3. What shouldn't be there

### 3.1 "Top Action" is not an action
Live value:

> **TOP ACTION:** Ana & John updates (10am), Daily Team Call (11am), John/Laura Daily Space (11:30am), James catch-up (1pm), Flowly-MP weekly (2pm), Tech/AI Builds (2:45pm), Dev Deep Dive (3pm), John's Brain FlowlyOS (4pm), ZVC Meet Marisa (7pm), Marisa x Uare.ai Go Live (7:30pm)

It's a re-listing of the calendar sitting directly above it, under a label promising *the one thing that matters*. The `/action|task|sign/i` heading regex is matching the brief's deadlines section and taking its first line. **Top Action must be exactly one item, or it must be absent.**

### 3.2 "Clear" is a false all-clear
17 of 22 team members show **"Clear"** — including the CTO, the Chief of Staff, and Marisa. "Clear" doesn't mean they're fine; it means *they have no Asana tasks*, i.e. we have no signal on them at all. A green-adjacent label on 17 people who are invisible to our data is the most misleading thing on the page. Split it: **"Clear"** (had tasks, closed them) vs **"No data"** (never appears in Asana). Elise's "No recent activity" is the honest pattern — extend it.

### 3.3 Decisions that aren't decisions
Live entries include *"Catherine Shippey: Confirmed receipt of asset info."* (an acknowledgment), *"Status: 🔴 Zero candidates approved."* (a status), and *"Jorge confirmed the domain was deleted… loss of ~20 days of emails"* (an **incident** — arguably the most urgent item in the payload, filed under "Decisions" where it will be ignored). Every entry carries `confidence: "medium"`, so the badge conveys zero information. Either make confidence discriminate, or drop the badge and instead classify: Decision / Status / Incident.

### 3.4 Pace numbers that are mathematically dead
- Priority 1: *"Needs +12,036 leads/day"* against a current run rate of ~6,512/month. That is a 55× step change. It will read ~12,000 tomorrow and ~13,000 next week.
- Priority 4: *"Needs +6.5 integration milestones/day"* with 10 days left, at 35%.

These aren't targets, they're arithmetic on an impossible constraint. When required pace exceeds current pace by more than ~3×, stop printing a number and print the actual decision: **"Unreachable at current pace — reset the target or the date."** That's the CEO action. The number isn't.

### 3.5 Internal noise surfaced as insight
"Top section: **Untitled section** (8)". "Busiest: Kim Calipes (11)". Asana bookkeeping, not executive signal. Also: customer emails (`dianavogel@icloud.com`, `countanitha@gmail.com`) are rendered on the Overview under "Needs Your Sign-off" — which is both a privacy smell and a mislabel, since these are other people's build tasks, not things awaiting John's signature.

### 3.6 Vanity growth
Flowly: **"+2,026%"** — off a £130 base. Suppress percentage deltas when the prior period is below a materiality floor; show "£130 → £2,764" instead.

---

## 4. What's missing that would make this indispensable

### 4.1 Promote the brief's intelligence to the Overview ⭐ highest ROI
Today the Overview's most prominent content is a meeting list, and the brief's blockers sit behind a click. Invert it. The Overview's hero row should be the 3 things the brief actually found:

> 🔴 **Stephen OOO Jul 20–27** — Tech/AI Builds weekly and Flowly syncs run without him. No deputy named.
> 🟡 **Client Launchpad VSL — 6th push since January.** Pattern, not a slip.
> 🟢 **Suhail/Sheeraz want to meet this week** — both on vacation from Monday. Closing window.

This requires no new data. It is already in the payload, one `slice()` away, and it is the difference between a dashboard and a chief of staff.

### 4.2 Flag the money-losing ad spend like it's an emergency
Flowly 30d: **Spend £4,262 → Revenue £2,764. ROAS 0.65x.** Flowly is losing roughly £1,500/month on paid acquisition, and this is rendered as tile 6 of 8, the same visual weight as "CPL £0.65". It should be a red banner with the loss in currency, not a ratio.

Sitting right next to it, unremarked:
- **Hidden Mind Gift Quiz — 1,855 leads → 4 sales (0.22%).** Second-highest lead volume, broken conversion.
- **Self Sabotage — 166 leads → 6.63% conv.** Best converter, starved of volume.

The table shows this. Nobody says it. Add a two-line "Scale / Fix / Kill" read-out under the funnel table.

### 4.3 Schedule conflict + travel awareness
Tonight: **"Marisa x Uare.ai (Go Live)" at 18:30** and **John's flight to Tallinn at 18:50.** The dashboard renders both, calmly, 20 minutes apart, with no comment. Overlap detection on today's events is maybe 30 lines of code and is exactly the "surface what needs a decision NOW" the spec asks for.

### 4.4 Costs, margin, runway
Still revenue-only, still "Figures are estimated," still parsed from Emirates NBD credit emails. The prior audit's Xero recommendation (F1/F4) remains the single biggest content gap — a CEO cannot run a business on gross inflows. Until Xero lands, label the revenue card honestly as **"Cash received (bank credits)"** rather than "Revenue."

### 4.5 One currency
AED (revenue), £ (Flowly), $ (priorities: "$15,000 each", "$8K/month") — three currencies on one screen, never reconciled. Pick a reporting currency, convert, and show the original on hover.

### 4.6 The Automation Health page that was specced and never built
Spec §3.5 called for cron health + system alerts. It doesn't exist — though `next.config.ts` still rewrites a dead `/automation` route to `/`. Meanwhile `recallAi: "low_credits"` is communicated solely as one dot inside "5/8 systems connected" in the sidebar. If Recall.ai dies, John silently loses every meeting transcript. That deserves an alert, not a dot.

### 4.7 "OVERALL VERDICT: LEANING YES"
That's a real section heading in today's brief, sitting behind two expand clicks. Something material is being decided and the dashboard's own AI has an opinion on it. Surface headline verdicts; don't bury them in an accordion.

---

## 5. UI / UX

**P1 — Truncation is pervasive at desktop widths.** On Strategic Priorities every status badge is cut: "1% of monthly target (es…", "5 active RTT/cert tasks i…", "18 active coaches from …", "Dashboard live at johns…". The pace line too: "Needs +12,036.3 leads/day to hit target b…". These are `max-w-[170px] truncate` and `truncate` on content that is never short. Wrap to two lines instead of truncating — a badge you can't read is worse than no badge.

**P1 — Business Health criteria pills truncate at tablet width.** "Team **Ne…**", "Pipeline **O.**" — a 2-col grid inside a 4-col hero column. Stack to one column below `xl`.

**P1 — The floating dock is misaligned and collides.** It's `fixed left-1/2 -translate-x-1/2`, centred on the *viewport*, ignoring the 248px sidebar — so it sits visibly off-centre and overlaps the sidebar edge on desktop. On mobile it covers the agenda list mid-scroll, and the Chief-of-Staff FAB (`bottom-6 right-6`) sits on top of the "Refresh All" button. Centre it within the content column and offset the FAB above the dock.

**P1 — The dock is the same 6 buttons on every page.** Flagged in the previous audit, not addressed. "Search Notes" and "Daily Brief" don't belong on Revenue Pulse.

**P2 — Business Health double-counts the leads goal.** Four inputs: Revenue, Team, Priorities, Pipeline. But `pipelineStatus` is derived from Priority 1 (500K leads), which is also one of the five priorities feeding `prioritiesStatus`. The leads goal therefore drives half the score. The current 46 is real, but it's more pessimistic than the underlying facts justify.

**P2 — The health score is unexplained.** 100/55/15 per input, equally weighted, no methodology shown. If John is ever going to quote "we're at 46," he needs to be able to defend it. One tooltip.

**P2 — Health history is per-browser localStorage.** The "↑ 4 vs 7d ago" trend resets on his phone, in a new browser, after a cache clear. Same for team trends, notes, and project annotations. Persist server-side.

**P2 — Role descriptions are wildly inconsistent.** Team Pulse runs from "Team Member" (9 people) to a 40-word paragraph. Cap at ~8 words.

**P2 — Initials collide.** SS = Stephen Sutherland *and* Shaigan Shah. HB/HR = two Haseebs.

**P2 — No dark mode.** Defensible, but John checks this at 11pm.

**P2 — Wrong voice.** The Quick Note placeholder reads *"Type a note, question, or instruction **for John**…"* — John is the user. It's written for his assistant.

---

## 6. Priority order

**This week**
1. Dedupe calendar events + pin the app to Dubai time (B1, B2)
2. Promote brief blockers/opportunities to the Overview hero (4.1)
3. Fix "Top Action" to be one action (3.1)
4. Red-flag the 0.65x ROAS in currency terms (4.2)
5. Fix truncation on Priorities + health pills (§5)
6. Filter "Blocked: None visible." (B4); fix "Marissa Peer" and drop John from Team Pulse (B5)

**This month**
7. "Clear" → "Clear" vs "No data" (3.2)
8. Schedule-conflict detection (4.3)
9. Cap unreachable pace numbers with a reset prompt (3.4)
10. Dock: centre in content column, make contextual, de-collide the FAB (§5)
11. Classify decisions vs statuses vs incidents (3.3)
12. Move local state to the server (§5)

**Next quarter**
13. Xero → costs, margin, runway (4.4)
14. Single reporting currency (4.5)
15. Automation Health page + Recall.ai credit alerting (4.6)
