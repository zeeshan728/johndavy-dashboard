'use client';

import { FormEvent, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChiefOfStaffChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ChiefOfStaffChat({
  open,
  onOpenChange,
}: ChiefOfStaffChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    const message = input.trim();
    if (!message || isSending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: message },
    ];

    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_history: nextMessages.slice(-10),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Chat request failed');
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.response || 'The Chief of Staff returned no response.',
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'I could not reach the live data service.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gold px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-gold/90"
      >
        <MessageCircle size={18} />
        Chief of Staff
      </button>
    );
  }

  return (
    <aside className="fixed bottom-6 right-6 z-50 flex h-[min(680px,calc(100vh-48px))] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-border bg-bg-primary shadow-2xl">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-text-primary">
            Chief of Staff
          </h2>
          <p className="text-xs text-text-secondary">
            Live meetings, revenue, tasks and decisions
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg p-2 text-text-secondary transition hover:bg-bg-secondary hover:text-text-primary"
          aria-label="Close Chief of Staff chat"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm text-text-secondary">
            Ask me about today&apos;s meetings, revenue, overdue work,
            priorities, team activity or recent decisions.
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'ml-auto bg-gold text-white'
                : 'mr-auto border border-border bg-bg-secondary text-text-primary'
            }`}
          >
            {message.content}
          </div>
        ))}

        {isSending && (
          <div className="mr-auto rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
            Checking the live data…
          </div>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the Chief of Staff…"
          disabled={isSending}
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-gold"
        />

        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="rounded-lg bg-gold px-3 py-2 text-white transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </form>
    </aside>
  );
}