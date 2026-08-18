# Hermes Backend — Consolidated Fix Spec

**For:** whoever operates the live Hermes agent behind `HERMES_API_BASE`
**Compiled:** 2026-07-21, from a full frontend audit + live endpoint testing against the current production tunnel. Every "confirmed" item below was verified by hitting the real endpoint directly, not inferred from code.
**Context:** the CEO Dashboard (Next.js, this repo) consumes these endpoints read-only. Everything below is a backend change — nothing here can be fixed from the dashboard side.

---

## P0/P1 — Real gaps affecting what John sees today

### 1. `/api/ask` has no LLM behind it at all
**Confirmed live**: it's `ripgrep -il` across two vault dirs + a cron-status/cache dump. No synthesis, no memory, no reasoning.
**Full spec already written**: see `docs/hermes-chief-of-staff-llm-spec.md` in this repo — covers desired request/response shape (`conversation_history` in, `response` field out), system prompt, and context assembly. This is the single highest-value fix — the dashboard's "Chief of Staff" chat is fully wired to use `response` the moment it appears.

### 2. `/api/revenue` — `departments` is always an empty array
**Confirmed live** (`GET /api/revenue?days=30`): `"departments": []`, every time, regardless of range. The dashboard's Revenue Pulse table used to render a misleading single "Total" row under real column headers implying a breakdown existed — I've since patched the frontend to hide that table entirely when `departments` is empty, so it's no longer misleading, but the actual capability (revenue by department/segment: Certifications, PD, Inner Belief, Flowly, etc.) doesn't exist.
**Ask:** either implement real per-department revenue attribution (source is presumably the same Emirates NBD email parsing plus whatever categorizes a transaction to a program), or confirm this is intentionally not available and I'll leave the frontend as-is (summary-only, no table).

### 3. Flowly CRO — per-funnel `spend`/`roas` are always `0`/`null`
**Confirmed live** (`GET /api/flowly?days=30`): total-level `spend: 4261.53`, `roas: 0.65` are real (from Meta Ads). But every entry in `by_funnel[]` has `spend: 0, roas: null` — Meta Ads spend isn't attributed to individual funnels at all, only tracked in aggregate.
**Ask:** if Meta campaigns can be mapped to funnels (by UTM, campaign naming convention, or landing-page URL), populate `spend`/`roas` per funnel so ROAS-by-funnel becomes meaningful (right now Marisa Peer Big Five's 4.15% conv rate can't be judged against its actual ad cost). If that mapping doesn't exist yet, no urgency — the frontend already hides those two columns and shows a note instead of fake zeros.

### 4. `/api/decisions` — `confidence` is hardcoded to `"medium"` for every entry
**Confirmed live** (`GET /api/decisions`): all 6 current entries return `"confidence": "medium"`, including things that are clearly not decisions at all (e.g. "Catherine Shippey: Confirmed receipt of asset info" — that's an acknowledgment, not a decision). The field exists in the schema but isn't actually computed.
**Ask:** implement the confidence tiers this field implies:
- `high` — exact match on "Decided:" / "Decision:" in a vault note
- `medium` — keyword match on "approved" / "confirmed" / "signed off"
- `low` — LLM-extracted from raw email archive text with no explicit decision language
This directly improves signal quality — right now every entry looks equally authoritative, so John can't tell "Zeeshan clarified direction is approved" (a real decision) from "confirmed receipt of asset info" (not one) without reading the text carefully.

### 5. `/api/decisions` — no link back to the source email/note
**Confirmed live**: `source` is just a string like `"Email archive"` — no message ID, permalink, or file path. John can't verify or follow up on a decision without manually searching his inbox.
**Ask:** add a `source_ref` (or similar) field — a Gmail message ID/link if the decision came from an email, or a vault file path if it came from a note — so the dashboard can add a "View source" link. Not urgent, but closes a real trust gap (decisions currently can't be double-checked from the dashboard at all).

---

## P2 — Clarity and data completeness

### 6. `/api/dashboard/cache` task list appears capped at ~100 items
**Confirmed live**: `cache.tasks.tasks` returns exactly 100 entries. Everything the dashboard computes from this (per-project completion %, team member overdue/pending counts, assignee/section breakdowns) is only as accurate as this window — if a project has more than ~100 tasks total across the workspace, its "done/total" ratio on the dashboard is silently wrong (undercounting both).
**Ask:** confirm whether 100 is a hard API limit or just what happened to be cached — if it's a limit, either raise it, paginate it, or expose a true `total_tasks_in_workspace` count separately so the frontend can show "(showing 100 of N)" honestly instead of implying completeness it doesn't have.

### 7. Team Pulse — "inactive" / "recent activity" threshold is undocumented
**Observed**: `/api/team/pulse` returns a `status` field that includes `"inactive"`, but there's no visibility into what triggers it (days since last completed task? last login? something else?). I built a more granular status ladder on the frontend (Clear/On track/Slipping/Blocked driven by `pending_tasks`/`overdue_tasks`), but I have no way to independently validate or extend the `inactive` signal itself.
**Ask:** document (or expose as a raw field, e.g. `days_since_last_activity`) what actually drives the inactive flag, so the frontend threshold can be tuned intentionally rather than trusted blindly.

### 8. Strategic Priority 4 (Mosaic) has an unclear unit label
**Observed**: `/api/strategic` returns this priority with a generic `unit` that renders as "Needs +5.9 units/day" on the dashboard — not meaningful to a reader. The other 4 priorities have clear units (leads, sales, coaches).
**Ask:** give Priority 4 (and any other milestone-based priority) a real unit label (e.g. "integration milestones" or whatever the actual tracked deliverable is).

### 9. Morning Brief regeneration is an undocumented side effect
**Confirmed live** (from `hermes-api/server.py`'s own comment, which — even though that file isn't the deployed code — describes real observed behavior): `POST /api/revenue/refresh` triggers the morning-briefing cron job as a side effect because "there is no dedicated revenue cron job." The dashboard now relies on this to auto-regenerate a stale brief on John's first visit each day, since there's no endpoint that does this directly.
**Ask:** add an explicit `POST /api/briefing/refresh` (or similar) that triggers the briefing cron on demand, independent of revenue. Purely a naming/clarity fix — functionally it already works, but depending on an undocumented side effect of an unrelated endpoint is fragile; if that revenue-refresh logic is ever changed, the briefing auto-regen silently breaks.

### 10. Strategic Priorities don't reference owners or related Asana projects
**Observed**: `/api/strategic` has no field connecting a priority to a person or project (e.g. Priority 2 "150 RTT Integrated @ $15K" — whose job is this?). I didn't attempt to fuzzy-match this from Asana project names on the frontend since a wrong guess would be worse than no answer.
**Ask:** if this ownership mapping exists in John's Brain notes, expose it as `owner` / `related_project` fields per priority.

---

## P3 — New capabilities (larger effort, lower urgency)

### 11. No financials endpoint (revenue only, no cost/margin/profit/cash)
The dashboard shows incoming revenue only. There's no COGS, gross margin, OPEX, net profit, cash balance, or runway anywhere. This needs a Xero (or equivalent accounting) integration and a new `/api/financials` endpoint returning something like:
```json
{
  "month": "2026-07", "revenue": 477177, "cogs": 85000, "gross_margin": 392177,
  "opex": 280000, "net_profit": 112177, "cash_balance": 1850000,
  "monthly_burn": 365000, "runway_months": 5.1, "source": "xero"
}
```
Until this exists, the frontend has nowhere honest to show cash/runway — I did not build a placeholder card for this since a fake "coming soon" tile adds clutter without value; happy to add one once there's a real timeline.

### 12. No `/api/meetings/recent` endpoint
The "Meeting Auto-Ingestion — Recall.ai + Vault" cron is already running and (per its name) storing meeting transcripts/summaries in the Second Brain — but there's no API surface exposing "last 5 meetings + 2-line summary + action items" for the dashboard to show. If that data genuinely exists in vault notes already, this is mostly a matter of exposing what's already being captured, not building new ingestion.

### 13. Confirm automated WhatsApp delivery of the morning briefing
The `Daily Morning Briefing — John Davy` and `rtt-morning-briefing` cron jobs both report `status: ok`, so brief *generation* is automated. What's unconfirmed is whether the brief is also *pushed* to John's WhatsApp automatically each morning, or whether WhatsApp delivery only happens when someone manually hits `POST /api/actions/brief-john` (which the dashboard's "Brief John" button does). If it's not yet automatic, wire the existing brief-john WhatsApp send into the same cron that generates the brief.

---

## Explicitly not asking for
- No changes to `vault_search`'s retrieval mechanism (ripgrep is fine as-is).
- No new auth model — everything above reuses `require_auth` as it exists today.
- No changes to cron scheduling/timing beyond what's called out above.
