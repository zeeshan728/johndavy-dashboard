# Hermes `/api/ask` — Add Real LLM Synthesis (Chief of Staff spec)

**For:** whoever operates the Hermes agent behind the dashboard's `HERMES_API_BASE` tunnel
**Confirmed live** (2026-07-21): `POST /api/ask` currently does **no LLM call at all**. It runs `ripgrep -il <question> <vault>` against John's Brain and the Second Brain, reads the first 500 chars of whatever files match, and bolts on a dump of cron job statuses + the cached dashboard overview. There is no synthesis, no reasoning, no conversation memory — it's a raw search index wearing a chat UI.

The CEO Dashboard's sidebar now has a "Chief of Staff" chat entry pointed at this endpoint. Right now it just shows John the unranked grep hits. This spec is what needs to change on the Hermes side to make it actually behave like a chief of staff.

---

## What "real" looks like

Researched how other AI chief-of-staff products behave (Cortex, Alfred, Alyna, and others) — the common thread across all of them:

1. **Synthesized, not dumped.** The answer is a written response that directly addresses the question, using retrieved context as evidence — not a list of file paths for the human to read themselves.
2. **Grounded, not hallucinated.** Every claim traces back to real vault content or real system state. If the context doesn't contain the answer, it says so plainly ("I don't see anything in the vaults or dashboard about X") instead of guessing.
3. **Conversational memory.** Follow-up questions ("what about the deadline on that one?") resolve against prior turns, not in isolation.
4. **Decisive and concise.** A chief of staff gives you the answer and the one thing to do about it — not a wall of hedged possibilities.
5. **Aware of live operational state**, not just static notes — decisions pending, overdue tasks, revenue pace, blockers.

## Current request/response shape

```json
// POST /api/ask
{ "question": "string" }

// Response
{
  "question": "string",
  "answer": {
    "vault_matches": 3,
    "vault_results": [{ "brain": "johns", "path": "...", "snippet": "..." }],
    "system_status": {
      "cron_jobs": [{ "id": "...", "name": "...", "status": "ok" }],
      "dashboard_overview": { "total_inbox": 10, "overdue_tasks": 5, "...": "..." }
    }
  },
  "timestamp": "ISO8601"
}
```

## Desired change

**1. Accept conversation history.** The dashboard now sends this (already implemented client-side):

```json
{
  "question": "string",
  "conversation_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Keep `conversation_history` optional — treat a missing/empty array as a fresh conversation. Only the current session's turns are sent (not persisted server-side), so no new storage is required unless you want cross-session memory later.

**2. Keep the existing retrieval step** (vault search across both brains, cron status, dashboard cache read) — that part is fine and cheap. It becomes the *context*, not the *answer*.

**3. Add an LLM call that synthesizes a real answer from that context**, and return it in a new `response` field:

```json
{
  "question": "string",
  "answer": {
    "response": "string — the actual conversational answer",
    "vault_matches": 3,
    "vault_results": [ /* unchanged — kept for debugging/transparency, frontend no longer renders this when `response` is present */ ],
    "system_status": { /* unchanged */ }
  },
  "timestamp": "ISO8601"
}
```

This is additive — `vault_matches`/`vault_results`/`system_status` stay exactly as they are today so nothing else that depends on this endpoint breaks. The dashboard frontend already prefers `answer.response` when present and falls back to the old grep-dump behavior when it's absent, so this can ship incrementally.

**4. Suggested system prompt** (adapt to whatever model/invocation Hermes already uses for its own cron-generated prose, e.g. the morning briefing — reuse that same LLM access rather than provisioning a new one):

```
You are John Davy's Chief of Staff for RTT/Marisa Peer and Flowly OS. You have access to:
- Vault search results from John's Brain and the Second Brain (his notes, meeting summaries, decisions)
- Live system status: cron job health, inbox/task/event counts

Answer the question directly and concisely, like a chief of staff briefing their CEO — not like a search engine.
Rules:
- Ground every claim in the provided context. Never invent facts, dates, names, or numbers that aren't in it.
- If the context doesn't contain enough to answer, say so plainly and suggest what to check instead.
- Be decisive: lead with the answer, then the one thing (if any) that needs John's attention or a decision.
- Use the conversation history to resolve follow-up questions and pronouns ("that one", "his deadline").
- Keep it to a few sentences unless the question genuinely needs a longer breakdown.
```

**5. Context assembly per request:**
- `conversation_history` (last ~10 turns is plenty)
- `vault_results` from the existing ripgrep search (as-is)
- `system_status.dashboard_overview` (as-is)
- Optionally: pull the same live sections the dashboard's `/api/dashboard/cache`, `/api/revenue`, `/api/strategic`, `/api/decisions` already expose, if the question seems to be about those (revenue, priorities, decisions) rather than vault notes — this is what makes it feel like it actually knows the dashboard, not just the notes.

## Not in scope for this change
- No new persistent chat-history storage — conversation memory is per-browser-session only, sent by the client each turn.
- No changes to vault_search itself (ripgrep-based retrieval is fine as the retrieval layer).
- No new auth — reuse `require_auth` as today.
