'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

interface VaultResult {
  brain: string;
  path: string;
  snippet: string;
}

interface AskAnswer {
  // New, real-synthesis field — once Hermes' /api/ask implements it (see the
  // chief-of-staff-llm-spec prompt), this carries an actual conversational
  // answer instead of a raw search-results dump.
  response?: string;
  vault_matches: number;
  vault_results: VaultResult[];
  system_status: {
    cron_jobs: { id: string; name?: string; status?: string }[] | null;
    dashboard_overview?: Record<string, unknown>;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  results?: VaultResult[];
}

interface ChiefOfStaffChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChiefOfStaffChat({ open, onOpenChange }: ChiefOfStaffChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: "I'm the Chief of Staff — ask me anything and I'll search John's Brain, the Second Brain, and current system status for you.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Once Hermes' /api/ask returns a real synthesized `response`, that's shown
  // directly (no more raw results dump). Until then, this is the honest fallback —
  // it says plainly that these are unranked file matches, not an answer.
  const formatAnswer = (answer: AskAnswer): string => {
    if (answer.response) return answer.response;
    if (answer.vault_matches === 0) {
      return "I didn't find anything in the vaults for that, and Hermes' /ask endpoint doesn't yet synthesize answers — try rephrasing, or use Search Notes for a broader search.";
    }
    const overview = answer.system_status?.dashboard_overview;
    const overviewLine = overview
      ? `Current overview — inbox: ${overview.total_inbox ?? '—'}, overdue tasks: ${overview.overdue_tasks ?? '—'}, today's events: ${overview.today_events ?? '—'}.\n\n`
      : '';
    return `${overviewLine}Hermes hasn't been upgraded to answer in natural language yet — here are the raw vault matches (${answer.vault_matches}) closest to your question:`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/actions/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, conversation_history: history }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to reach Hermes');
      const answer: AskAnswer = payload.answer;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: formatAnswer(answer), results: answer.response ? undefined : answer.vault_results },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err instanceof Error ? `Error: ${err.message}` : 'Something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Sits above the floating dock rather than on top of it — at bottom-6 this button
          landed directly over the dock's "Refresh All" on narrow screens. From lg up the
          dock is centred in the content column, so the FAB returns to its corner. */}
      <button
        onClick={() => onOpenChange(true)}
        className={`fixed bottom-28 right-6 lg:bottom-6 z-40 w-12 h-12 rounded-full bg-gold text-white shadow-lg flex items-center justify-center hover:bg-gold/90 transition cursor-pointer ${
          open ? 'scale-0' : 'scale-100'
        }`}
        title="Chief of Staff"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      <div
        className={`fixed inset-0 z-50 transition-opacity ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div onClick={() => onOpenChange(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

        <div
          className={`absolute top-0 right-0 h-full w-full max-w-sm bg-bg-secondary/95 backdrop-blur-xl border-l border-border-color shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-border-color px-5 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gold" />
              <h3 className="font-semibold text-gold tracking-tight">Chief of Staff</h3>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-text-muted hover:text-text-primary transition p-1 hover:bg-bg-card rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-gold text-white rounded-br-sm'
                      : 'bg-bg-card border border-border-color text-text-primary rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
                {m.results && m.results.length > 0 && (
                  <div className="max-w-[85%] flex flex-col gap-1.5 mt-1">
                    {m.results.map((r, i) => (
                      <div key={i} className="px-3 py-2 bg-bg-card border border-border-color rounded-lg text-[11px]">
                        <div className="font-semibold text-text-primary truncate">[{r.brain}] {r.path}</div>
                        <p className="text-text-muted mt-0.5 line-clamp-2">{r.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-xs text-text-muted italic">Asking Hermes…</div>}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border-color p-3 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Chief of Staff…"
              className="flex-1 px-3 py-2 bg-bg-card border border-border-color rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 bg-gold text-white hover:bg-gold/90 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
