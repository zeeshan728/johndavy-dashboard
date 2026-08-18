# John's CEO Dashboard — Full Audit & Implementation Spec

**Audit date:** July 20, 2026
**App URL:** https://johns-dashboard.vercel.app
**Target user:** John Davy — CEO, RTT / Marisa Peer / Flowly OS
**Implementer:** Claude (or equivalent AI agent)
**Priority legend:** P0 = blocking, P1 = high value, P2 = nice to have

---

## Table of Contents

1. [App Architecture Overview](#1-app-architecture-overview)
2. [Page-by-Page Audit](#2-page-by-page-audit)
3. [Critical Bugs & Issues](#3-critical-bugs--issues)
4. [Improvement Specs (Ordered by Priority)](#4-improvement-specs-ordered-by-priority)
5. [New Feature Specs](#5-new-feature-specs)
6. [Removals](#6-removals)
7. [Implementation Notes](#7-implementation-notes)

---

## 2. Page-by-Page Audit

### 2.1 Login Page
- **Status:** ✅ Works
- **Issues:** Password hardcoded in env. No SSO, no MFA. Fine for MVP.
- **Change needed:** None for now.

### 2.2 Overview (Homepage)

**What's there:**
- Greeting + time ("Good evening, John! — 07:42 PM")
- Business Health card (score: 58/100, Operational Risk: Action Required)
- Revenue AED 10.3K | Team On track | Priorities Critical | Pipeline Off pace
- AI Morning Brief card (summary + "Read Morning Brief" button)
- Today's Agenda — 35 meetings listed chronologically (including "HR - Birthdays", "Annual leave - Stephen Sutherland")
- Top Action item
- Needs Your Sign-Off list (17+ items like "Weekly Analytics check — Sarah Benmoussa — 3d late")
- Bottom action bar: Brief John | Join Meeting | Full Report | Daily Brief | Search Notes | Refresh All

**What's good:**
- Business Health as a single-number glance is exactly right for a CEO
- Revenue snapshot at the top
- Needs Your Sign-Off is useful content

**What's bad:**
- **P1** 35 meetings in one flat list is overwhelming. Needs grouping/categorization.
- **P1** "Needs Your Sign-Off" has 17+ items — too many. Top 5 only.
- **P2** Business Health score (58) has no driver breakdown — what's dragging it down?
- **P2** "Join Meeting" is a dead button unless a meeting starts in 15min. Should be contextual.
- **P2** Same 6-button action bar appears on every page. Redundant. Consolidate to page-level actions only.

### 2.3 Morning Brief

**What's there:**
- Timestamp + freshness badge ("13.7h ago — Fresh")
- Revenue snapshot (AED 10,276.22 — down 27% vs yesterday)
- MTD progress (119% of target, AED 477,177.08)
- Decisions Pending (7 items)
- Blockers (6 items — including Stephen out all week with no deputy)
- Opportunities (2 items)
- "Show Full Strategy Report Details" expandable
- Buttons: Brief John | Regenerate | Full Report | Daily Brief PDF | Schedule Meeting | Search Notes

**What's good:**
- This is the single most useful page in the app. Keep everything.
- "Stephen out all week with no deputy" is the kind of specific risk a CEO needs surfaced.
- Revenue trend vs yesterday is actionable.

**What's bad:**
- **P1** Brief generated 13.7h ago. If it runs at ~6am UTC (10am Dubai), John might see it at 10pm. Should regenerate at John's first interaction of the day.
- **P2** Decisions Pending section just shows raw email snippets. No priority, no owner, no deadline.
- **P2** "Show Full Strategy Report Details" — did not test this expandable. Ensure it works.

### 2.4 Strategic Priorities

**What's there:**
- 5 priorities, each with: target, current, daily pace needed, days remaining, trend arrow
- Priority 1: 500K leads/month — 6,512/500,000 (1%) — Needs +11,749 leads/day — 42d remaining
- Priority 2: 150 RTT sales at $15K — 2/150 (1%) — 72d remaining
- Priority 3: 100 Inner Belief coaches at $8K/mo — 18/100 (18%) — 72d remaining
- Priority 4: Single source of truth (Mosaic) — 35% — 11d remaining
- Priority 5: Agentic AI buildouts — 55% — 26d remaining

**What's good:**
- "Needs +X/day to hit target" is the single best metric on the entire dashboard. Keep and double down.
- Days remaining creates urgency.
- Trend arrows (↑ 416% vs prior 30d on Priority 1) show momentum.

**What's bad:**
- **P1** No traffic-light visual. Priority 1 at 1% is critical-red but looks the same as Priority 5 at 55%.
- **P1** Priority 4 (Mosaic) has "11d remaining" and "Needs +5.9 units/day" — what's a "unit"? Needs clearer metric.
- **P2** Priorities don't link to relevant Asana projects or team members. If Priority 2 is about RTT sales, whose job is it?

### 2.5 Revenue Pulse

**What's there:**
- Today's revenue: AED 10,276.22 (↓ 27%)
- MTD: 119% of AED 400K target
- 11 days remaining, AED 0/day required (already on track)
- Yesterday comparison: AED 10,276 vs AED 14,015 (-26.7%)
- Projected month-end: AED 739,624 (+AED 339,624 above target)
- Department table (just "Total" row)
- 7-day bar chart

**What's good:**
- Projected month-end is the kind of forward-looking number a CEO needs.
- Clean, scannable layout.

**What's bad:**
- **P0** "Department" table has one row ("Total"). The column headers imply breakdown. Either remove the table or add real department data.
- **P1** "AED 0/day required" is technically correct but confusing. Rephrase to "On track — no catch-up needed" or similar.
- **P1** No cost/profit data. This shows revenue only — a CEO needs gross margin, OPEX, net.
- **P2** The bar chart day labels look wrong in the snapshot: "Wed, Thu, Tue, Wed, Thu, Fri, Mon" — probably misordered days of week.

### 2.6 Team Pulse

**What's there:**
- 21 team members listed alphabetically with initials avatar, name, role, status
- Statuses: On track (for most), "No recent activity" (Elise, James)
- Pending task badges (1-4 pending) on some members
- Source badge: "Asana · cached · 1m ago"

**What's good:**
- Clean per-person view
- Role descriptions are detailed and accurate (e.g., "has expanded from full-stack development/quiz result pages into building the Hermes AI-employee infrastructure")
- Shows who has pending tasks at a glance

**What's bad:**
- **P1** Every single person shows "On track" — including Elise (4 pending, No recent activity) and Stephen (2 pending, on holiday all week). The statuses are not meaningful — they default to "on_track" unless 5+ overdue tasks exist. Need more granularity.
- **P1** No week-over-week trend. Is Elise's pending count going up or down?
- **P2** "No recent activity" for Elise and James — what defines "recent"? Last Asana task completion? Last login?
- **P2** Role descriptions are inconsistent — some are short ("Team Member"), some are long paragraphs.

### 2.7 Flowly OS

**What's there:**
- CRO Dashboard (30d): Revenue £2,764, Sales 216, Leads 6,512, Conv 3.32%, Spend £4,262, ROAS 0.65x, CPA £19.73, CPL £0.65
- Per-funnel table (7 funnels):
  - Marisa Peer Big Five: £837 / 93 sales / 4.15% conv
  - The Belonging Code: £414 / 46 sales / 3.19% conv
  - Blood Sugar Willpower Audit: £345 / 17 sales / 5.57% conv
  - PCOS Hormonal Wellness: £255 / 22 sales / 5.88% conv
  - Self Sabotage: £99 / 11 sales / 6.63% conv
  - Hidden Mind Gift Quiz: £36 / 4 sales / 0.22% conv
  - Wealth Profile: £0 / 0 sales / 0% conv
- Prev 30d vs Now comparison (+2,026% growth)
- "Last 7 Days" toggle button

**What's good:**
- This is excellent. Per-funnel economics is the right level of detail for a CEO overseeing a growth product.
- ROAS of 0.65x flagged implicitly — that's the critical number.
- The +2,026% growth stat is powerful.

**What's bad:**
- **P1** Spend column shows £0.00 for every funnel — so ROAS shows "—" for all. If ad spend data isn't available, hide the column or add a note ("Ad spend not yet linked — ROAS at total level only").
- **P1** No trend line on the total KPIs. Did revenue go up this week vs last? Is CPA improving?
- **P2** "Last 7 Days" toggle button — does it work? Did not test.

### 2.8 Projects

**Current state:** Empty. Shows "No projects tracked yet — add one above" with a text input. Detects 3 Asana projects but doesn't auto-import them.

**What's bad:**
- **P0** Empty state with a manual text box is unusable. Either auto-populate or remove the nav entry.
- **P0** It detects Asana projects (Graphic Design for Socials, Inner Belief - Build/Profiles, Social Team) but doesn't import them. This is the worst state — it knows what to show but shows nothing.

### 2.9 Decision Log

**What's there:**
- 7 decisions listed, all from "Email archive" source
- Entries like "Catherine Shippey: Confirmed receipt of asset info" and "Stephen reviewed and approved"
- Date + relative time (1d ago, 2d ago, 3d ago)

**What's good:**
- Concept is right — tracking decisions is crucial for a CEO
- Date + relative time is well done

**What's bad:**
- **P1** Every source is "Email archive" with no confidence rating. All are keyword-matched ("decided", "approved", "confirmed"). Half may not be real decisions — "Catherine Shippey: Confirmed receipt of asset info" is not a decision, it's an acknowledgment.
- **P1** No link to source email or vault note. Can't verify or follow up.
- **P2** No filtering by person, project, or decision type.
- **P2** Only last 7 days shown. Should be configurable (7/14/30d).

### 2.10 Chief of Staff (Sidebar Chat)

**What's there:**
- Chat interface: "I'm the Chief of Staff — ask me anything and I'll search John's Brain, the Second Brain, and current system status for you."
- Text input + send button

**What's good:**
- Useful idea — searched knowledge base
- Clean UI mimicking Claude/chat interface

**What's bad:**
- **P2** Did not test actual responses. Ensure it's wired to Hermes API correctly.
- **P2** Send button appears disabled in snapshot — confirm it enables on text input.

---

## 3. Critical Bugs & Issues

| ID | Severity | Issue | Page |
|----|----------|-------|------|
| B1 | P0 | Projects page empty — detects Asana projects but won't auto-import | Projects |
| B2 | P1 | "Department" table in Revenue shows only "Total" row | Revenue |
| B3 | P1 | 35 meetings in flat list — no grouping/filtering | Overview |
| B4 | P1 | "Required daily pace: AED 0/day" is misleading | Revenue |
| B5 | P1 | All team statuses show "On track" — not granular enough | Team Pulse |
| B6 | P1 | Decision Log has no confidence rating — all entries look equal | Decision Log |
| B7 | P2 | Business Health score (58) has no driver breakdown | Overview |
| B8 | P2 | Strategic Priorities have no traffic-light colors | Strategic |
| B9 | P2 | "Join Meeting" button on every page is dead | All |
| B10 | P2 | Spend column shows £0.00 on every Flowly funnel | Flowly OS |

---

## 4. Improvement Specs (Ordered by Priority)

### P0: Auto-populate Projects from Asana

**File:** `app/projects/page.tsx` (or equivalent)

**Current behavior:** Text input + "No projects tracked yet" message. Shows "Detected in Asana, not yet tracked" buttons for 3 projects but clicking does nothing meaningful.

**Desired behavior:**
1. On page load, fetch the projects list already returned by the Asana API
2. Display each as a card with:
   - Project name
   - Completion % (from Asana tasks done / total tasks)
   - Last activity date (latest task update)
   - Owner/responsible person (if assigned in Asana)
3. Cards are clickable to expand details (top 5 overdue tasks)
4. Text input for manual projects remains but is secondary

**API call:** Already hitting Hermes API. The `/api/dashboard/tasks` endpoint returns Asana task data — use it to derive project completion.

**Mock data:**

```json
{
  "projects": [
    {
      "gid": "1215591091351618",
      "name": "Inner Belief - Build/Profiles",
      "completion_pct": 34,
      "total_tasks": 12,
      "done_tasks": 4,
      "last_activity": "2026-07-19",
      "owner": "Ali",
      "overdue_tasks": 2
    }
  ]
}
```

---

### P1: Group 35 meetings into categories

**File:** `app/components/meetings-list.tsx` (create if doesn't exist)

**Current behavior:** Flat chronological list of 35 calendar items including HR admin, annual leave, birthdays. All items are equal visual weight.

**Desired behavior:**
1. Auto-categorize into 3 groups at render time:
   - **Strategic** (1:1s with key people, external meetings, decisions required) — show in full
   - **Operational** (team standups, weekly check-ins, recurring) — collapse by default, expandable
   - **Passive/FYI** (annual leave, birthdays, hotel bookings, tickets) — hide by default with count badge
2. Add toggle: "Show all 35" / "Show strategic only (4)" / "Show operational + strategic (15)"
3. Categorization rules (implement as a simple function):
   - Strategic keywords: "Nick Mennell", "Platinum", "Driven", "MindValley", "CEO", "partnership", "decision"
   - FYI keywords: "Holiday", "Birthday", "Tickets", "Hotel", "Annual leave"
   - Everything else: Operational

**Heuristic rules (server-side or client-side, your choice):**

```python
def categorize_event(title: str) -> str:
    strategic_kw = ["nick mennell", "ceo", "partner", "platinum", "driven",
                    "mindvalley", "board", "investor", "strategic", "decis"]
    fyi_kw = ["holiday", "birthday", "hotel", "ticket", "annual leave",
              "presidential suite", "focus - no calls"]
    title_lower = title.lower()
    if any(k in title_lower for k in strategic_kw):
        return "strategic"
    if any(k in title_lower for k in fyi_kw):
        return "fyi"
    return "operational"
```

---

### P1: "Department" table fix in Revenue Pulse

**File:** `app/revenue-pulse/page.tsx`

**Current behavior:** Table shows "DEPARTMENT" | "THIS MONTH" | "VS TARGET" headers but only one row: "Total — AED 477,177.08 — 119%".

**Options (pick one):**
- **Option A (preferred):** Add real department breakdown via separate Hermes endpoint. If not available yet, remove the table entirely.
- **Option B:** Keep total row but change header to "OVERVIEW" and merge cells to span 3 columns.

**Implementation (Option A):** Change table to show:

```
Total Revenue     AED 477,177     119% of target
RTT Programs      AED 312,000     85% of segment target
Flowly OS         AED 165,177     210% of segment target
```

If segment data isn't available, just show Total as a summary card, not a table.

---

### P1: "Required daily pace" wording fix

**File:** `app/revenue-pulse/page.tsx`

**Current:** "AED 0/day" with label "To hit AED 400,000 target"

**Desired:** When already ahead of pace, show:

```
✅ On track — no catch-up needed
Projected: AED 739,624 (+AED 339,624 above target)
```

When behind pace, show the current "AED X/day needed" format with a red highlight.

---

### P1: Team Pulse granular statuses

**File:** `app/team-pulse/page.tsx`

**Current:** All 21 members show "On track" regardless of pending/overdue tasks.

**Desired status mapping (change the backend logic or add client-side override):**

```
pending_tasks == 0 AND overdue_tasks == 0  → "Clear" (green)
pending_tasks 1-2 OR recent_activity <7d   → "On track" (green)
pending_tasks 3-5 OR overdue == 1          → "Slipping" (amber)
pending_tasks 6+ OR overdue >= 2           → "Blocked" (red)
no_activity > 14d                          → "Inactive" (gray)
```

Also add a small trend arrow per person: ↑ tasks decreased / ↓ tasks increased / → no change. This requires storing the previous snapshot count.

---

### P1: Decision Log confidence badges

**File:** `app/decision-log/page.tsx`

**Current:** All entries look identical. Source is always "Email archive."

**Desired:**
Add a confidence badge to each entry:

| Badge | Meaning | Color |
|-------|---------|-------|
| ✅ High | Exact match on "Decided:" or "Decision:" in vault note | Green |
| ⚠️ Medium | Keyword match on "approved", "confirmed", "signed off" | Amber |
| 🤖 Low | LLM-extracted from email archive (most current entries) | Gray |

Also add "View source" link that opens the original email or vault note if available.

**Backend change needed:** The Hermes API `/api/decisions` endpoint should return a `confidence` field per entry.

---

### P2: Traffic-light colors for Strategic Priorities

**File:** `app/strategic-priorities/page.tsx`

**Current:** All 5 priorities have identical visual weight — same card, same border, same everything.

**Desired:** Apply left-border color based on status:

```
pct < 5%          → Red (#DC2626) — "Critical"
pct 5-25%         → Amber (#F59E0B) — "Behind"
pct 25-50%        → Yellow (#EAB308) — "At risk"
pct 50-75%        → Blue (#3B82F6) — "Progressing"
pct >= 75%        → Green (#22C55E) — "On track"
days_remaining < 30 AND pct < 50% → Red + "🚨" prefix
```

---

## 5. New Feature Specs

### F1: Xero Integration (P0 — Highest Priority)

**Why:** Revenue Pulse shows incoming cash from Emirates NBD credit emails only. No costs, no margins, no net profit. A CEO cannot run a business on revenue alone.

**Implementation:**
1. Connect Xero API (via Composio — search for Xero toolkit)
2. Create a new Hermes API endpoint: `/api/financials`
3. Return: Revenue, COGS, Gross margin, OPEX, Net profit, Cash balance, Runway
4. Add new page or section: "Financials" in sidebar nav

**Schema:**

```json
{
  "month": "2026-07",
  "revenue": 477177,
  "cogs": 85000,
  "gross_margin": 392177,
  "gross_margin_pct": 82.2,
  "opex": 280000,
  "net_profit": 112177,
  "net_margin_pct": 23.5,
  "cash_balance": 1850000,
  "monthly_burn": 365000,
  "runway_months": 5.1,
  "source": "xero",
  "fetched_at": "2026-07-20T..."
}
```

**Note:** If Xero isn't available yet (Priority 4 milestone is pending), add a placeholder card saying "Xero integration — coming soon" rather than showing nothing.

---

### F2: Automated Morning Briefing Delivery (P1)

**Why:** John shouldn't have to open the dashboard to get his briefing. Push it to WhatsApp every morning.

**Implementation:**
1. Create a Hermes cron job: `0 4 * * *` (7am Dubai = 3am UTC during summer) or test with `0 3 * * *`
2. Job calls the same briefing generator, formats for WhatsApp, posts to John's chat
3. Dashboard Morning Brief page shows the latest push with a "Last sent: Today 7:01 AM" timestamp
4. "Brief John" button becomes secondary — the primary delivery is automated

**Backend:**

```python
# Cron job prompt:
"Generate the CEO morning briefing from the latest data. Format as WhatsApp-friendly markdown (no tables, no code blocks). Key sections: revenue snapshot, top 3 blockers, decisions pending, strategic priority update. Deliver to John's WhatsApp."
```

---

### F3: Meeting Bot Summary Cards (P1)

**Why:** John has 35 meetings/day. After each meeting, a 2-line summary + action items on the dashboard would save hours of follow-up.

**Implementation:**
1. Recall.ai meetings already have transcript summaries stored in Second Brain
2. Create `/api/meetings/recent` endpoint returning last 5 meetings with:
   - Title, date, duration
   - 2-line AI summary
   - Top 3 action items (extracted)
   - Link to full notes
3. Display on Overview as a "Recent Meetings" section between Business Health and Today's Agenda

---

### F4: Cash Runway Card (P1)

**Why:** The single most important number for a founder.

**Implementation:**
- Add as a small card on Overview (next to Business Health)
- Shows: "Cash: AED 1.85M | Burn: AED 365K/mo | Runway: 5.1 months"
- Red if < 6 months, amber if 6-12, green if > 12
- Pulls from Xero integration (F1) — without Xero, show "Coming soon"

---

### F5: OKR / Quarterly Goal Tracking (P2)

**Why:** The 5 Strategic Priorities are static. John needs to set quarterly OKRs and see % complete with confidence indicators.

**Implementation:**
1. Add OKR tab or section within Strategic Priorities
2. Allow John to set: Objective → 3-5 Key Results → weekly confidence (on track / at risk / off track)
3. Auto-calculate progress from connected data sources where possible

---

## 6. Removals

| Item | Reason | When |
|------|--------|------|
| Projects page (current form) | Empty with manual text box is worse than no page | **Immediately** — replace with auto-populated version or remove from nav |
| "Join Meeting" button | Dead button on every page — no meeting context awareness | Remove from action bar on non-Meeting pages |
| "Systems connected: 5/8" in sidebar | Infrastructure detail, not CEO info. Alert when something's disconnected | Move to settings/admin page |
| Bottom 6-button action bar on every page | Redundant. "Brief John" and "Refresh All" make sense everywhere. "Join Meeting" and "Search Notes" don't | Reduce to 2-3 context-aware actions per page |

---

## 7. Implementation Notes

### File Structure (assumed Next.js App Router)

```
/pages
  /index.tsx              — Overview
  /morning-brief.tsx      — Morning Brief
  /strategic-priorities.tsx — Strategic Priorities
  /revenue-pulse.tsx      — Revenue Pulse
  /team-pulse.tsx         — Team Pulse
  /flowly-os.tsx          — Flowly OS
  /projects.tsx           — Projects (needs rewrite)
  /decision-log.tsx       — Decision Log
/components
  /meetings-list.tsx      — Meetings grouping component (NEW)
  /business-health.tsx    — Business Health card (needs driver breakdown)
  /priority-card.tsx      — Strategic priority card (needs colors)
  /team-member.tsx        — Team member card (needs trend)
  /decision-entry.tsx     — Decision entry (needs confidence badge)
  /action-bar.tsx         — Bottom action bar (needs contextual reduction)
/lib
  /api.ts                 — Hermes API client
  /categorize-meetings.ts — Meeting categorization logic (NEW)
  /constants.ts           — Colors, thresholds
```

### Hermes API Backend Dependencies

Before implementing frontend changes, ensure these endpoints return complete data:

- `GET /api/strategic` — ✅ Working (fixed 20s hang to 5ms)
- `GET /api/revenue` — ✅ Working (AED 10,276, 119% MTD)
- `GET /api/flowly` — ✅ Working (£2,764, 6,512 leads, 0.65x ROAS)
- `GET /api/team/members` — ✅ Working (21 members)
- `GET /api/decisions` — ✅ Working (7 decisions) — needs `confidence` field added
- `GET /api/meetings/recent` — ❌ Not yet built (F3)
- `GET /api/financials` — ❌ Not yet built (F1, requires Xero)

### Design Tokens (Match existing)

```css
--bg-dark: #0a0a0f;
--bg-card: #12121a;
--bg-card-hover: #1a1a24;
--text-primary: #f0f0f5;
--text-secondary: #8888a0;
--accent-green: #22c55e;
--accent-amber: #f59e0b;
--accent-red: #dc2626;
--border-color: #2a2a3a;
--border-radius: 12px;
```

---

## Appendix: Quick Stats

| Metric | Value |
|--------|-------|
| Total pages | 8 (+ login + chat sidebar) |
| Pages fully working | 6 |
| Pages with issues | 2 (Projects broken, Revenue table misleading) |
| Active team members | 21 |
| Daily meetings | 35 |
| Last 30d Flowly revenue | £2,764 |
| 7-day revenue trend | AED 4.0K - AED 14.0K |
| MTD revenue | AED 477,177 (119% of 400K) |
| Cash balance | Not tracked yet (needs Xero) |
| Monthly burn | Not tracked yet |
