# CEO Dashboard — John Davy
## Product Requirements & Technical Specification

**Version:** 1.0  
**Date:** July 14, 2026  
**Audience:** AI agent (or developer) to build the dashboard  
**Purpose:** A single-pane-of-glass web app that gives John Davy (Founder & CEO of The Marisa Peer Organisation and Flowly OS) real-time visibility over every business system, automated workflow, team activity, and strategic priority — in one place.

---

## Table of Contents

1. [Philosophy & Design Principles](#1-philosophy--design-principles)
2. [Data Sources & Integrations](#2-data-sources--integrations)
3. [Dashboard Sections (The Views)](#3-dashboard-sections-the-views)
4. [Real-Time Data Pipeline](#4-real-time-data-pipeline)
5. [UI / UX Specification](#5-ui--ux-specification)
6. [Technical Architecture](#6-technical-architecture)
7. [Alerting & Notification System](#7-alerting--notification-system)
8. [Deployment & Hosting](#8-deployment--hosting)
9. [User Flows](#9-user-flows)
10. [Future Enhancements](#10-future-enhancements)
11. [Appendix: Current System Inventory](#11-appendix-current-system-inventory)

---

## 1. Philosophy & Design Principles

### 1.1 Core Beliefs

- **One screen, one truth.** Every number on this dashboard is pulled from a live data source — not entered manually, not stale.
- **John doesn't hunt for information.** The dashboard surfaces what matters: what changed, what's overdue, what needs a decision. If he has to dig three clicks deep, it's broken.
- **Time is the only scarce resource.** Organize everything by: What needs my attention NOW → Today → This Week → This Month.
- **Progress against goals, not activity.** The dashboard tracks the 5 strategic priorities (500K leads, 150 certs, 100 IB coaches, Mosaic, Agentic AI) — not how many emails were sent.
- **Mobile-first for WhatsApp/telegram, but desktop-rich for deep dives.** John operates from his phone 80% of the time.

### 1.2 Design Principles

| Principle | Meaning |
|-----------|---------|
| **Pulse, not noise** | Every card must answer "so what?" If it's data without context, kill it |
| **Red/yellow/green at a glance** | The first thing John sees should tell him what's on fire and what's fine |
| **Trends over snapshots** | A single number is useless. Show direction: ↑ better / ↓ worse / → flat vs last week |
| **Actionable** | Every alert has a "do this" button or link. Never surface a problem without a path to fix it |
| **Dark mode only** | John's a CEO, not a designer. Dark background, gold accents, clean typography |

---

## 2. Data Sources & Integrations

The dashboard ingests from **ALL** of the following (some already wired via cron jobs, some need new connections):

| # | Source | Integration Method | Data Pulled | Status |
|---|--------|-------------------|-------------|--------|
| 1 | **Hermes Cron Jobs** | Read cron output files from `~/.hermes/cron/output/<job_id>/` | Job status, last run time, last output, error state | ✅ Cron outputs exist |
| 2 | **Gmail (john@rtt.com)** | Composio GMAIL API | Inbox count, important unread, flagged emails, sales reports | ✅ Active connection |
| 3 | **Google Calendar** | Composio CALENDAR API | Today's events, upcoming meetings, schedule conflicts | ✅ Active cron |
| 4 | **Asana (marisapeer.com)** | Composio ASANA API | Tasks: overdue, due today, assigned to John/Stephen/Laura. Projects: status | ✅ Active connection |
| 5 | **John's Brain (Obsidian Vault)** | Read files from `~/johns-brain/RTT/` | Task counts, project status, strategic priorities, daily/weekly notes | ✅ Local filesystem |
| 6 | **Second Brain (Obsidian Vault)** | Read files from `~/second-brain/` | Flowly tasks, projects, ideas, daily notes, emails archive | ✅ Local filesystem |
| 7 | **Meeting Bot (Recall.ai)** | Read meeting ingestion outputs from vault | Recent meetings, key decisions, action items from transcripts | ⚠️ Needs credit top-up |
| 8 | **Google Drive** | Composio DRIVE API | New/modified documents, strategy briefs | ✅ Active |
| 9 | **Slack** | Channel reader (via context farmers or Slack API) | Blockers, decisions, team pulse from #sales, #flowly, #team | ❌ Needs integration |
| 10 | **Flowly Platform (MCP)** | Flowly MCP API queries | Active funnels, leads captured, quiz completions, analytics | ⚠️ Needs stable API key |
| 11 | **Meta Ads** | Meta Graph API (or CAPI) | Campaign performance: CPL, ROAS, CTR, spend, impressions | ❌ Proxy blocked |
| 12 | **GitHub (funnelweave-studio)** | GitHub API via Composio | Recent commits, PRs, deployment status, code activity | ✅ Active |
| 13 | **Recall.ai Bot Credits** | Recall.ai API | Remaining credits, credit usage rate, estimated days until empty | ✅ Can query |

### 2.1 Connection Health

The dashboard MUST show a **Connection Status** bar at the top:

```
🔴 Asana — Connected ✅        |  🔴 Gmail — Connected ✅
🔴 Google Calendar — Connected ✅ |  🔴 Slack — Not Connected ❌
🔴 Meta Ads — Proxy Blocked ❌   |  🔴 Recall.ai — Credits Low ⚠️ (3 days left)
```

---

## 3. Dashboard Sections (The Views)

### 3.1 The Header Bar

Fixed at the top. Always visible.

```
┌──────────────────────────────────────────────────────────┐
│  ⚡ CEO DASHBOARD      📅 14 Jul 2026  •  06:42 Dubai   │
│                          Last refreshed: 2 min ago 🔄    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🔴 Gmail  🔴 Asana  🔴 Calendar  ◉ Slack  ⚠️ Ads│   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Section 1 — The Morning Brief (Top Priority)

This is the expanded version of what the daily morning briefing cron currently sends. It's the **first thing John sees**.

```
┌──────────────────────────────────────────────────────────┐
│ ☀️ GOOD MORNING, JOHN                        [View Full] │
│──────────────────────────────────────────────────────────│
│                                                        │
│ 🔴 3 OVERDUE TASKS                        ⚠️ since yesterday│
│   • Change Zoom Webinar Name    due 10 Jul  [Marisa]   │
│   • Review Q3 Budget Draft      due 12 Jul  [Finance]  │
│   • Approve BTT Launch Copy     due 13 Jul  [Stephen]  │
│                                                        │
│ 🟡 2 DECISIONS PENDING                                 │
│   • Laura: "Approve LMS go-live date?"  [Reply →]     │
│   • Stephen: "BTT pricing final?"       [Reply →]     │
│                                                        │
│ 🟢 TODAY'S MEETINGS (3)                                │
│   09:00  Team Standup (30m)                            │
│   11:00  Stephen — BTT Launch Review (1h)               │
│   15:00  Neil Bannister — Founder Hub Update (30m)     │
│                                                        │
│ 💰 YESTERDAY'S REVENUE: $12,450  ↑ 8% vs last Tue      │
│    Certifications: $9,750  |  PD: $2,200  |  IB: $500  │
└──────────────────────────────────────────────────────────┘
```

**Data sources:** Gmail (flagged/important), Asana (overdue tasks), Google Calendar (today's events), cron output (briefing data), Gmail sales reports.

### 3.3 Section 2 — Strategic Priority Progress

Tracks the 5 strategic priorities with actual vs target. This is the **most important section** for John as a CEO — it doesn't exist anywhere currently.

```
┌──────────────────────────────────────────────────────────┐
│ 🎯 STRATEGIC PRIORITIES — Q3 2026               [Detail]│
│──────────────────────────────────────────────────────────│
│                                                        │
│ ═══ 1. 500,000 LEADS/MONTH ════════════════════════    │
│   This Month:  324,500 / 500,000  ████████░░ (65%)     │
│   Trend:  ↑ 12% vs last month  •  On track for Aug     │
│                                                        │
│ ═══ 2. 150 RTT INTEGRATED @ $15K ═══════════════════   │
│   This Year:  62 / 150  ████░░░░░░ (41%)               │
│   Revenue:  $589,000  •  Avg: $9,500 (target: $15K)   │
│   Trend:  → flat  •  🔴 Behind pace by 14 units       │
│                                                        │
│ ═══ 3. 100 COACHES @ $8K/MO (INNER BELIEF) ═════════   │
│   Active coaches:  18 / 100  ██░░░░░░░░ (18%)          │
│   Avg earnings:  $3,200  •  Rev share: $17,280/mo     │
│   Trend:  ↑ 3 coaches this month  •  🟡 Needs pace    │
│                                                        │
│ ═══ 4. SINGLE SOURCE OF TRUTH (MOSAIC) ══════════════  │
│   Status:  🟡 In progress  •  Data integration stage  │
│   Next milestone:  Xero sync  (due 31 Jul)            │
│                                                        │
│ ═══ 5. AGENTIC AI BUILDOUTS ═══════════════════════    │
│   Status:  🟢 On track  •  Jorge + Laura engineering  │
│   Hermes meeting bot:  🟢 Live  •  Flowly MCP: 🟡 Beta│
│   Next:  Automated task triage (due 15 Aug)            │
└──────────────────────────────────────────────────────────┘
```

**Data sources:** Asana (cert sales tracking), Second Brain tasks (coach counts), John's Brain business profile (targets), Gmail sales reports (revenue), Hermes cron history (AI projects).

### 3.4 Section 3 — Revenue Pulse

Real-time revenue snapshot for the current day/week/month.

```
┌──────────────────────────────────────────────────────────┐
│ 💰 REVENUE PULSE — July 2026                   [Details]│
│──────────────────────────────────────────────────────────│
│                                                        │
│ ┌─────────┬────────────┬───────────┬──────────┐        │
│ │ Dept    │ This Month │ vs Target │ vs Last  │        │
│ ├─────────┼────────────┼───────────┼──────────┤        │
│ │ Certs   │  $87,500   │ ████░62%  │ ↑ 15%   │        │
│ │ PD      │  $42,300   │ ███░░42%  │ ↓ 3%    │        │
│ │ IB      │  $17,280   │ ██░░░29%  │ ↑ 8%    │        │
│ │ Alumni  │  $8,400    │ ████░55%  │ ↑ 2%    │        │
│ │ Hidden  │  $12,100   │ ███░░40%  │ ↓ 5%    │        │
│ │ Events  │  $0        │ ░░░░░ 0%  │ —       │        │
│ ├─────────┼────────────┼───────────┼──────────┤        │
│ │ TOTAL   │  $167,580  │ ███░░42%  │ ↑ 4%    │        │
│ │ Target  │  $400,000  │           │         │        │
│ └─────────┴────────────┴───────────┴──────────┘        │
│                                                        │
│ Daily Revenue (last 7 days):                           │
│ Mon ████  Tue █████  Wed ███  Thu ████  Fri ██████     │
│ Sat ██  Sun █                                            │
└──────────────────────────────────────────────────────────┘
```

**Data sources:** Gmail (daily sales report ingestion), Asana (deal tracking), Delenta/CRM (if accessible). For the MVP, parse the sales reports from Gmail.

### 3.5 Section 4 — Cron Job Health & Automation Status

A diagnostic view showing every automated system and whether it's working.

```
┌──────────────────────────────────────────────────────────┐
│ 🤖 AUTOMATION HEALTH                         [All Jobs] │
│──────────────────────────────────────────────────────────│
│                                                        │
│ 🔴 DAILY CRON JOBS                                      │
│   ✅ Morning Briefing (6am)          — Sent ✅          │
│   ✅ Stephen Overdue Tasks (6am)     — Sent ✅          │
│   ❌ Email-to-Brain Scan (2am)       — Errored ⚠️      │
│   ✅ Drive Ingestion (midnight)      — Complete ✅      │
│                                                        │
│ 🟡 CONTEXT FARMERS                                      │
│   ✅ Gmail Farmer (5am)              — Ran ✅           │
│   ◌ Slack Farmer                     — Not configured  │
│   ✅ GitHub Farmer (5am)             — Ran ✅           │
│   ❌ Meta Ads Farmer                 — Proxy blocked   │
│   ✅ Claude Conversations (8pm)      — Ran ✅           │
│                                                        │
│ ⚠️ SYSTEM ALERTS                                        │
│   • Recall.ai credits: 14% remaining  [Top up →]       │
│   • Meta Ads proxy: blocked 7 days  [Fix →]           │
│   • GitHub token: expires 26 Jul     [Refresh →]      │
│   • Composio credits: 62% remaining                    │
└──────────────────────────────────────────────────────────┘
```

**Data sources:** Cron output files (`~/.hermes/cron/output/`), Hermes cron API (`list`), memory/stored facts about system status.

### 3.6 Section 5 — Executive Team Pulse

Who's doing what, who's blocked, who needs attention.

```
┌──────────────────────────────────────────────────────────┐
│ 👥 TEAM PULSE                                  [Details] │
│──────────────────────────────────────────────────────────│
│                                                        │
│ Laura Gort (COO)          🟢 On track                   │
│   • LMS testing complete — go-live 1 Aug               │
│   • Inner Belief app: design review this week           │
│                                                        │
│ Stephen Sutherland (CMO)  🟡 2 overdue tasks            │
│   • 🔴 Change Zoom Webinar Name (3 days overdue)        │
│   • 🟡 BTT Launch Copy (1 day overdue)                  │
│   • 58 open tasks without due dates                     │
│                                                        │
│ James Hopkins (Comm)      🟢 On track                   │
│   • No flagged items                                    │
│                                                        │
│ Elise McDonald (PR)       ◌ No recent activity          │
│   • $20K/mo — no deliverables tracked this week         │
│                                                        │
│ Jorge Garcia (AI/Eng)     🟢 On track                   │
│   • Meeting bot optimized                               │
│   • Working on automated task triage                    │
│                                                        │
│ Zeeshan (Flowly CEO)      🟡 56 pending tasks           │
│   • 🔴 Meta Ads proxy blocked — blocking 6+ tasks      │
│   • Weekly standup summary available                   │
└──────────────────────────────────────────────────────────┘
```

**Data sources:** Asana (overdue tasks per assignee), John's Brain (people notes), Second Brain (Flowly tasks), Gmail (recent important threads).

### 3.7 Section 6 — Flowly OS Snapshot

The Flowly-specific view for the SaaS business.

```
┌──────────────────────────────────────────────────────────┐
│ 🚀 FLOWLY OS                                   [Details] │
│──────────────────────────────────────────────────────────│
│                                                        │
│ Funnels Active:  184,273  │ Leads Captured:  9.47M     │
│                                                        │
│ Recent Activity (last 24h):                             │
│   • 3 new funnels created                               │
│   • 847 new leads captured                              │
│   • 1 bug reported (Big Five CTA missing on share)     │
│                                                        │
│ Dev Activity (last 48h):                                │
│   • 14 commits to main (Lovable)                        │
│   • 2 edge functions updated                            │
│   • 0 PRs open                                          │
│                                                        │
│ Task Backlog:  56 pending  │  Stale (>7d):  23         │
│                                                        │
│ ⚠️ BLOCKERS                                             │
│   • Meta Ads proxy blocked (6+ tasks blocked)           │
│   • Stripe live mode not fully enabled                  │
│   • Twilio SMS not yet connected                        │
└──────────────────────────────────────────────────────────┘
```

**Data sources:** Flowly MCP API, GitHub API, Second Brain tasks.

### 3.8 Section 7 — Recent Decisions & Action Items

A feed of decisions captured across all channels.

```
┌──────────────────────────────────────────────────────────┐
│ 📋 DECISION LOG — Last 7 Days                  [All]    │
│──────────────────────────────────────────────────────────│
│                                                        │
│ 📌 14 Jul  — Approved: LMS go-live date set for 1 Aug  │
│              Source: Laura → Gmail thread              │
│                                                        │
│ 📌 13 Jul  — Decided: BTT pricing at $5,950           │
│              Source: Stephen → WhatsApp → Hermes       │
│                                                        │
│ 📌 12 Jul  — Deferred: Napoleon Hill co-brand pricing │
│              Source: Meeting note (Recall.ai)           │
│                                                        │
│ 📌 11 Jul  — Approved: New Wu event dates (Oct 27-29) │
│              Source: Calendar → Marisa                 │
└──────────────────────────────────────────────────────────┘
```

**Data sources:** Second Brain (emails archive decisions), Gmail (important threads), Meeting bot transcripts, WhatsApp messages via Hermes.

### 3.9 Section 8 — Quick Actions (Floating Button Bar)

```
┌──────────────────────────────────────────────────────────┐
│ ⚡ QUICK ACTIONS                                         │
│──────────────────────────────────────────────────────────│
│                                                        │
│ [📧 Brief John]  [📞 Join Meeting]  [📊 Full Report]    │
│ [📋 Daily Brief] [🔍 Search Vault]  [🔄 Refresh All]    │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Real-Time Data Pipeline

### 4.1 Architecture Overview

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│ DATA SOURCES│───▶│ CACHE LAYER  │───▶│  DASHBOARD APP   │
│             │    │              │    │                  │
│ Gmail API   │    │ emails.json  │    │ React SPA        │
│ Asana API   │    │ tasks.json   │    │ (dark theme)     │
│ Calendar    │    │ calendar.json│    │                  │
│ cron/       │    │ overview.json│    │ Express API      │
│ vaults/     │    │ _meta.json   │    │ (static serving) │
│ Recall.ai   │    │              │    │                  │
│ Flowly MCP  │    │              │    │                  │
│ GitHub API  │    │              │    │                  │
└─────────────┘    └──────────────┘    └──────────────────┘
```

### 4.2 Cache Refresh Strategy

| Data Type | Refresh Frequency | Method | Priority |
|-----------|-------------------|--------|----------|
| Overview stats | Every 15 min | Lightweight API calls | P0 |
| Inbox count | Every 15 min | Gmail API (count only) | P0 |
| Today's events | Every 30 min | Calendar API | P0 |
| Task status | Every 30 min | Asana API | P0 |
| Cron health | Every hour | Read cron output files | P0 |
| Revenue data | Every hour | Parse sales report emails | P0 |
| Full email list | Every 2 hours | Gmail API (full) | P1 |
| Team pulse | Every 4 hours | Asana + vault + email | P1 |
| Flowly stats | Every 4 hours | Flowly MCP / GitHub | P1 |
| Decision log | Every 6 hours | Aggregate from all sources | P1 |
| Strategic KPIs | Daily (6am) | Computed from aggregated data | P0 |

### 4.3 Cache File Format

All cache files live under `/home/node/sites/ceo-dashboard/cache/`. Namespaced by type.

**`overview.json`** — The summary card data:
```json
{
  "inboxUnread": 47,
  "overdueTasks": 3,
  "todayEvents": 3,
  "monthRevenue": 167580,
  "monthTarget": 400000,
  "cronErrors": 1,
  "systemAlerts": 4,
  "lastUpdated": "2026-07-14T02:30:00Z",
  "dailyBriefStatus": "sent",
  "connections": {
    "gmail": "connected",
    "asana": "connected",
    "calendar": "connected",
    "slack": "disconnected",
    "metaAds": "blocked",
    "recallAi": "low_credits"
  }
}
```

**`strategic.json`** — The 5 priorities:
```json
{
  "priorities": [
    {
      "id": 1,
      "name": "500,000 leads/month",
      "current": 324500,
      "target": 500000,
      "trend": "up",
      "trendValue": 12,
      "status": "on_track",
      "eta": "August 2026"
    },
    {
      "id": 2,
      "name": "150 RTT Integrated @ $15K",
      "current": 62,
      "target": 150,
      "revenue": 589000,
      "avgPrice": 9500,
      "trend": "flat",
      "status": "behind",
      "gap": 14
    }
  ]
}
```

**`tasks.json`** — All tasks from Asana + vaults:
```json
{
  "overdue": [
    {"name": "Change Zoom Webinar Name", "due": "2026-07-10", "assignee": "Stephen", "project": "Marisa", "permalink": "https://...", "daysOverdue": 4}
  ],
  "dueToday": [],
  "pending": 92,
  "noDueDate": 58,
  "byAssignee": {
    "john": 12,
    "stephen": 24,
    "laura": 8,
    "other": 48
  }
}
```

**`revenue.json`** — Revenue breakdown:
```json
{
  "daily": 12450,
  "dailyTrend": 8,
  "monthToDate": 167580,
  "monthTarget": 400000,
  "monthPct": 42,
  "departments": [
    {"name": "Certifications", "monthly": 87500, "pctTarget": 62, "trend": 15},
    {"name": "PD", "monthly": 42300, "pctTarget": 42, "trend": -3},
    {"name": "Inner Belief", "monthly": 17280, "pctTarget": 29, "trend": 8},
    {"name": "Alumni", "monthly": 8400, "pctTarget": 55, "trend": 2},
    {"name": "Hidden Gem", "monthly": 12100, "pctTarget": 40, "trend": -5}
  ],
  "daily7Day": [9800, 12450, 9200, 11200, 15100, 5400, 2100]
}
```

**`cron-health.json`** — Automation health:
```json
{
  "jobs": [
    {"name": "Morning Briefing", "id": "4436dba3e96e", "lastRun": "2026-07-14T02:04:45Z", "status": "ok"},
    {"name": "Stephen Overdue Tasks", "id": "ea4a2ac31a52", "lastRun": "2026-07-14T06:01:35Z", "status": "ok"},
    {"name": "Email-to-Brain Scan", "id": "2b39a4332f46", "lastRun": "2026-07-14T02:03:47Z", "status": "ok"},
    {"name": "Meeting Ingestion", "id": "2f4395cd72e9", "lastRun": "2026-07-14T11:02:27Z", "status": "ok"}
  ],
  "farmers": [
    {"name": "Gmail", "status": "ok", "lastRun": "2026-07-14T05:00:00Z"},
    {"name": "Slack", "status": "not_configured"},
    {"name": "Meta Ads", "status": "blocked", "detail": "Proxy blocked for 7 days"},
    {"name": "GitHub", "status": "ok", "lastRun": "2026-07-14T05:00:00Z"}
  ],
  "systemAlerts": [
    {"severity": "warning", "source": "recall.ai", "message": "14% credits remaining", "action": "Top up credits"},
    {"severity": "error", "source": "meta-ads", "message": "Proxy blocked for 7 days", "action": "Set up OAuth integration"},
    {"severity": "warning", "source": "github", "message": "Token expires 26 Jul", "action": "Refresh token"}
  ]
}
```

### 4.4 The Hermes Cron That Feeds the Cache

The existing `john-dashboard-refresh` cron (job ID `01ab2059d95b`) already refreshes cache files every hour. **Keep this cron** but expand it to write the additional cache files (`strategic.json`, `revenue.json`, `cron-health.json`, `team-pulse.json`, `decisions.json`, `flowly.json`).

The cron prompt should be updated to:

```
1. Fetch emails + tasks + calendar (existing)
2. Read cron output dirs for status (new)
3. Compute strategic KPIs from vault + Asana data (new)
4. Parse revenue data from Gmail sales reports (new)
5. Read team pulse from people notes + Asana tasks (new)
6. Compile decisions from vault + email archive (new)
7. Query Flowly MCP for platform stats (new)
8. Write ALL cache files (expanded)
```

---

## 5. UI / UX Specification

### 5.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0a0b0e` | Page background |
| `--bg-secondary` | `#111318` | Card backgrounds |
| `--bg-card` | `#16181f` | Inner card backgrounds |
| `--bg-card-hover` | `#1c1f28` | Card hover |
| `--border` | `#1e2230` | Borders, dividers |
| `--text-primary` | `#e8e9ed` | Body text |
| `--text-secondary` | `#8b8fa3` | Dim text |
| `--text-muted` | `#565a6e` | Labels, timestamps |
| `--accent-gold` | `#d4a853` | Primary accent (John's brand) |
| `--accent-green` | `#22c55e` | Good / on track |
| `--accent-red` | `#ef4444` | Bad / overdue / error |
| `--accent-amber` | `#f59e0b` | Warning / needs attention |
| `--accent-blue` | `#3b82f6` | Info / neutral |
| `--accent-purple` | `#8b5cf6` | Flowly-specific |

### 5.2 Typography

- **Headers:** Inter (font-weight 700, 800)
- **Body:** Inter (font-weight 400, 500)
- **Monospace:** JetBrains Mono (for task IDs, dates, code)
- **Scale:** 11px (labels) → 13px (body) → 15px (cards) → 18px (section headers) → 24px (page title)

### 5.3 Layout

```
┌─────────────────────────────────────────────────────┐
│ ⚡ CEO DASHBOARD          🤖 John Davy    🔄 14 Jul │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─ GOOD MORNING ────────────────────────── [Full] ─┐│
│ │ [3 overdue tasks] [2 decisions pending]          ││
│ │ [Today's meetings] [Yesterday's revenue]         ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ STRATEGIC PRIORITIES ──────────────── [Detail] ─┐│
│ │ [5 priority bars with actual vs target]          ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ REVENUE PULSE ────────────────────── [Details] ─┐│
│ │ [Department table + 7-day sparkline]             ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ AUTOMATION HEALTH ─────────────────── [Details] ─┐│
│ │ [Cron statuses] [Farmer statuses] [Alerts]       ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ ┌───────────────────┐ ┌──────────────────────────┐  │
│ │ TEAM PULSE        │ │ FLOWLY OS                │  │
│ │ [6 people cards]  │ │ [Stats + blockers]       │  │
│ └───────────────────┘ └──────────────────────────┘  │
│                                                     │
│ ┌─ DECISION LOG ───────────────────────────────────┐│
│ │ [Last 7 decisions with source + date]            ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.4 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 480px | Single column, stack everything (phone) |
| 480-768px | Single column, cards full width (large phone) |
| 768-1024px | 2-column grid for bottom sections (tablet) |
| 1024-1440px | 2-column grid, full width header sections (desktop) |
| > 1440px | 3-column grid for bottom sections (wide) |

### 5.5 Animations & Microinteractions

- Cards fade in with 200ms stagger on load
- Hover state: card lifts 1px, border highlights in gold
- Data refreshes: pulse animation on the "last updated" timestamp
- Alerts: soft slide-in from the right
- Status changes: brief yellow flash on the changed card

### 5.6 Empty States

Every section must handle empty/null data gracefully:

- "No overdue tasks 🎉" — celebration state
- "No meetings scheduled today" — neutral state
- "Slack not connected — [Connect →]" — setup action state
- "No decisions captured yet this week" — no-data state

---

## 6. Technical Architecture

### 6.1 Stack Recommendation

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Vanilla HTML/CSS/JS or React (CDN build) | No build step needed for MVP. If React, use Vite. |
| **CSS** | Tailwind via CDN | Rapid prototyping, consistent design system |
| **Backend API** | Express.js (Node) | Already exists as `server.js` in the current dashboard |
| **Cache** | JSON files on disk | Simple, no DB needed. Already proven. |
| **Data Pipeline** | Hermes cron job (hourly refresh) | Already exists (`john-dashboard-refresh`) |
| **Hosting** | Agent37 Host (agent37-host CLI) | Native hosting, auto-restart, https |

### 6.2 Express API Endpoints

The existing `server.js` already serves `/api/data` and `/api/data/:type`. Keep these and add:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/data` | GET | All cached data (existing) |
| `/api/data/:type` | GET | Single data type (existing) |
| `/api/refresh` | POST | Trigger immediate cache refresh |
| `/api/health` | GET | Connection status for all sources |
| `/api/alert/:id/dismiss` | POST | Dismiss a system alert |
| `/` | GET | Serve `index.html` (existing) |

### 6.3 File Structure

```
/ceo-dashboard/
├── public/
│   └── index.html          # The full SPA
├── cache/                   # Hermes cron writes here
│   ├── overview.json
│   ├── strategic.json
│   ├── tasks.json
│   ├── revenue.json
│   ├── calendar.json
│   ├── emails.json
│   ├── cron-health.json
│   ├── team-pulse.json
│   ├── decisions.json
│   ├── flowly.json
│   ├── _meta.json
│   └── .gitkeep
├── server.js                # Express API
├── package.json
└── node_modules/
```

### 6.4 Performance Targets

| Metric | Target |
|--------|--------|
| Initial page load | < 2 seconds |
| API response time | < 200ms |
| Cache refresh time | < 30 seconds |
| Time to interactive | < 3 seconds |
| Lighthouse score | > 85 (all categories) |

---

## 7. Alerting & Notification System

### 7.1 In-Dashboard Alerts

Alerts appear at the top of the dashboard, grouped by severity:

```
🔴 CRITICAL                🟡 WARNING                🟢 INFO
- Proxy blocked 7 days     - Credits 14%             - Briefing sent
- Task cron errored        - Token expires 26 Jul    - All systems ok
```

### 7.2 Push Notifications (Future)

For critical alerts, the dashboard should also push to John via:

- **WhatsApp** — for 🔴 and 🟡 alerts that need action
- **Email** — for daily digest of system health

### 7.3 Alert Severity Matrix

| Severity | Color | Definition | Example | Action |
|----------|-------|------------|---------|--------|
| 🔴 Critical | Red | Revenue or reputation at risk | Meta Ads proxy blocked, sales data can't be tracked | Immediate fix needed |
| 🟡 Warning | Amber | Degradation or risk building | Credits low, token expiring soon | Fix within 24h |
| 🟢 Info | Blue | Status change, no action needed | Briefing sent, system recovered | Acknowledge |
| Successful | Green | Everything okay | Cron ran fine, no overdue tasks | Celebration "🎉" |

---

## 8. Deployment & Hosting

### 8.1 Deploy Command

```bash
cd /home/node/sites/ceo-dashboard
npm install
# Start dev server
cd /home/node/sites/ceo-dashboard && node server.js  # runs on port 3100

# Expose via Agent37
/usr/local/bin/agent37-host add --port 3100 --dir /home/node/sites/ceo-dashboard --cmd "node server.js"
```

The Agent37 `add` command bundles: start the dev server exposed, register it to auto-restart on container restart.

The returned URL is public — anyone with the link can open it.

### 8.2 Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `3100` | Express server |
| `CACHE_DIR` | `./cache` | JSON cache path |
| `TZ` | `Asia/Dubai` | Default timezone |

---

## 9. User Flows

### 9.1 John's Morning Routine

```
06:00  →  Hermes sends WhatsApp briefing (existing cron)
06:01  →  John opens the Dashboard → sees Morning Brief section
06:02  →  Checks overdue tasks → taps one → sent to Asana
06:03  →  Sees revenue number → taps → sees department breakdown
06:05  →  Checks Automation Health → sees 1 error → taps to investigate
06:10  →  Door opens, John is fully briefed.
```

### 9.2 Mid-Day Check-In

```
12:00  →  John opens dashboard (mobile) → sees updated data
12:01  →  Decision log shows 2 new items added since morning
12:02  →  Revenue pulse updated from morning sales reports
12:03  →  Sees "CREDITS LOW" warning → taps "Top up →"
```

### 9.3 End of Day Review

```
18:00  →  John opens dashboard → checks "Today vs Yesterday" revenue
18:01  →  Reviews decisions made today
18:02  →  Checks cron health — everything ran ✅
18:03  →  Sees tomorrow's calendar at a glance
```

---

## 10. Future Enhancements

| Feature | Value | Priority |
|---------|-------|----------|
| **AI Chat on Dashboard** | "How are cert sales this quarter?" — answers from live data | P1 |
| **PDF/CSV Export** | Generate weekly board pack with one click | P1 |
| **Multi-user** | Laura sees ops view, Stephen sees marketing view | P2 |
| **Historical Trends** | 3-month revenue chart, task completion velocity | P2 |
| **Goal Setting** | John can set/update strategic targets from the dashboard | P2 |
| **Meeting Transcript Search** | Search across all Recall.ai meetings from dashboard | P2 |
| **Slack Integration** | Post daily digest to #leadership channel | P2 |
| **Custom Dashboard Themes** | RGB accent color picker | P3 |

---

## 11. Appendix: Current System Inventory

### 11.1 All Cron Jobs

| Name | ID | Schedule | Purpose | Status |
|------|----|----------|---------|--------|
| Daily Chat Dump | `1741abde70f1` | 5:00 UTC | Archives Hermes chats to vault | ✅ Running 26x |
| Second Brain Daily Sync | `b98b69776e57` | 5:00 UTC | Syncs Flowly Brain from GitHub | ✅ Running 25x |
| Email-to-Brain Scan | `2b39a4332f46` | 2:00 UTC | Archives Gmail to vault | ✅ Running 24x |
| RTT Morning Briefing | `1c2fa05eadfe` | 6:00 UTC | WhatsApp briefing for John | ✅ Running 26x |
| Stephen Overdue Tasks | `ea4a2ac31a52` | 6:00 weekdays | Emails Stephen his overdue tasks | ✅ Fixed, 10x |
| Dashboard Refresh | `01ab2059d95b` | Every hour | Refreshes cache files | ✅ Running 293x |
| Second Brain Sync | `ec87efe4f91c` | 5:55 UTC | Syncs Claude work log | ✅ Running 7x |
| Morning Briefing (Email) | `4436dba3e96e` | 2:00 UTC | HTML email briefing | ✅ Running 17x |
| Drive Ingestion | `72ce7db309ee` | Midnight | Imports Drive files to vault | ✅ Running 7x |
| Meeting Ingestion | `2f4395cd72e9` | Every 30 min | Processes Recall.ai recordings | ✅ Running 286x |

### 11.2 Connected Systems (Composio)

| System | Account | Status |
|--------|---------|--------|
| Gmail | john@rtt.com | ✅ Active |
| Google Calendar | john@rtt.com | ✅ Active |
| Google Drive | john@rtt.com | ✅ Active |
| Asana | marisapeer.com + myosin.io + Product | ✅ Active (3 workspaces) |
| GitHub | haseeb008/second-brain | ✅ Active |

### 11.3 Context Farmers

| Farmer | Watches | Writes To | Frequency |
|--------|---------|-----------|-----------|
| Slack | RTT channels + Flowly channel | John's Brain + Second Brain | 5am daily |
| Gmail | People to Track list | Second Brain emails/ | 5am daily |
| Drive | John's Brain folder | John's Brain ideas/ | midnight daily |
| Asana | marisapeer.com workspace | Second Brain asana/ | 5am daily |
| GitHub | funnelweave-studio | Second Brain flowly-code/ | 5am daily |
| Fireflies | Meeting transcripts | Second Brain meetings/ | 5am daily |
| Claude Conversations | Git cos: commits | John's Brain John and Claude/ | 8pm daily |
| Meta Ads | Challenges By Marisa | Second Brain ads-data/ | Daily (blocked) |

### 11.4 The 5 Strategic Priorities

1. **500,000 leads/month** at 7-day break-even
2. **150 RTT Integrated sales** at $15,000 each
3. **100 coaches** earning $8K/month on Inner Belief (15% net margin)
4. **Single source of truth** with live dashboards (Mosaic)
5. **Agentic AI** end-to-end buildouts

### 11.5 Key People (Team)

| Person | Role | GID (Asana) | Email |
|--------|------|-------------|-------|
| John Davy | Founder & CEO | 1202552918721716 | john@rtt.com |
| Laura Gort | COO | — | laura@marisapeer.com |
| Stephen Sutherland | CMO | 1199205604072140 | stephen.sutherland@marisapeer.com |
| James Hopkins | Communications | — | james@marisapeer.com |
| Elise McDonald | PR | — | elise@marisapeer.com |
| Jorge Garcia | AI/Engineering | — | jorge.garcia@marisapeer.com |
| Jayne Packer | Chief of Staff | — | jayne.packer@tullon.com |
| Zeeshan Jillani | Flowly CEO | — | zeeshan@flowly.com |
| Haseeb Rehman | Flowly CTO | — | haseeb@flowly.com |

---

## 12. Build Prompt (for AI Agent)

When you're ready to build this, use this as the kickoff prompt:

> Build the John Davy CEO Dashboard. Create the full app at `~/sites/ceo-dashboard/`. Use Express.js backend serving a single-page HTML/CSS/JS frontend (dark theme, gold accents, Inter font). All data comes from JSON cache files at `./cache/*.json` refreshed by the existing `john-dashboard-refresh` cron job. The dashboard has 8 sections: Morning Brief, Strategic Priorities, Revenue Pulse, Automation Health, Team Pulse, Flowly OS, Decision Log, and Quick Actions. Every number is a live cache read — no hardcoded data. Full spec is in `CEO-Dashboard-Spec.md`. Deploy with agent37-host on port 3100.

---

*End of specification. This document is the single source of truth for building the CEO Dashboard.*
