'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  FileSearch,
  FileText,
  Gavel,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import {
  askLegalAssistant,
  createLegalBriefing,
  createLegalDraft,
  getLegalOverview,
  LegalDeadline,
  LegalOverview,
  LegalRisk,
  LegalSource,
  searchLegal,
} from '@/lib/legalClient';

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-bg-secondary border border-border-color rounded-2xl p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border-color pb-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-gold">{icon}</span>
        <div>
          <h2 className="text-sm font-semibold text-gold uppercase tracking-wide">
            {title}
          </h2>
          {detail && (
            <p className="text-xs text-text-muted mt-1">{detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone = 'gold',
}: {
  label: string;
  value: number;
  detail: string;
  tone?: 'gold' | 'red' | 'amber' | 'blue';
}) {
  const toneClass = {
    gold: 'bg-gold/10 text-gold',
    red: 'bg-red-500/10 text-red-600',
    amber: 'bg-amber-500/10 text-amber-700',
    blue: 'bg-blue-500/10 text-blue-700',
  }[tone];

  return (
    <div className={`rounded-xl border border-border-color p-4 ${toneClass}`}>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
      <div className="text-[11px] opacity-75 mt-1">{detail}</div>
    </div>
  );
}

function SourceLine({ item }: { item: LegalSource }) {
  return (
    <div className="mt-3 rounded-lg bg-bg-card border border-border-color p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">
            {item.title}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {item.path} · {item.category}
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-green font-semibold">
          {item.confidence || 'observed'}
        </span>
      </div>

      {item.dates_found.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {item.dates_found.slice(0, 5).map((date) => (
            <span
              key={date}
              className="rounded-full bg-gold/10 text-gold px-2 py-1 text-[10px] font-semibold"
            >
              {date}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-text-secondary leading-relaxed mt-3">
        {item.evidence}
      </p>
    </div>
  );
}

function RiskCard({ risk }: { risk: LegalRisk }) {
  const isHigh = risk.severity === 'high';

  return (
    <div
      className={`rounded-xl border p-4 ${
        isHigh
          ? 'border-red-300 bg-red-50/60'
          : 'border-amber-200 bg-amber-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert
          className={`w-4 h-4 mt-0.5 shrink-0 ${
            isHigh ? 'text-red-600' : 'text-amber-700'
          }`}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] uppercase tracking-wide font-bold ${
                isHigh ? 'text-red-700' : 'text-amber-800'
              }`}
            >
              {risk.severity} potential risk
            </span>

            <span className="text-[10px] text-text-muted">
              {risk.status}
            </span>
          </div>

          <p className="text-sm font-semibold text-text-primary mt-1">
            {risk.what_was_detected}
          </p>

          <div className="mt-3 space-y-2 text-xs leading-relaxed">
            <p>
              <strong>Why it may matter:</strong>{' '}
              {risk.why_it_may_matter}
            </p>
            <p>
              <strong>Recommended next step:</strong>{' '}
              {risk.recommended_next_step}
            </p>
            <p className="text-text-muted">
              <strong>Evidence:</strong> {risk.evidence}
            </p>
            <p className="text-text-muted">
              <strong>Source:</strong> {risk.source.path}
            </p>
          </div>

          {risk.counsel_review_recommended && (
            <div className="mt-3 inline-flex rounded-full bg-red-100 text-red-700 px-2 py-1 text-[10px] font-semibold">
              Qualified counsel review recommended
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeadlineRow({ deadline }: { deadline: LegalDeadline }) {
  const urgent =
    deadline.urgency === 'overdue' || deadline.urgency === 'urgent';

  return (
    <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 rounded-xl border border-border-color bg-bg-card p-4">
      <div className="md:col-span-2 flex items-center gap-2">
        <CalendarClock
          className={`w-4 h-4 ${
            urgent ? 'text-red-600' : 'text-gold'
          }`}
        />
        <div>
          <div className="text-sm font-bold text-text-primary">
            {deadline.date}
          </div>
          <div className="text-[10px] text-text-muted">
            {deadline.days_until < 0
              ? `${Math.abs(deadline.days_until)} days overdue`
              : `${deadline.days_until} days`}
          </div>
        </div>
      </div>

      <div className="md:col-span-3">
        <span
          className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
            urgent
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {deadline.urgency}
        </span>
      </div>

      <div className="md:col-span-4 text-xs text-text-secondary leading-relaxed">
        <strong className="text-text-primary">Fact:</strong>{' '}
        {deadline.fact}
        <div className="text-[11px] text-text-muted mt-1">
          {deadline.source.path}
        </div>
      </div>

      <div className="md:col-span-3 text-xs text-text-secondary leading-relaxed">
        <strong className="text-text-primary">Next step:</strong>{' '}
        {deadline.recommendation}
      </div>
    </div>
  );
}

export default function Legal() {
  const [overview, setOverview] = useState<LegalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Awaited<
    ReturnType<typeof searchLegal>
  > | null>(null);

  const [question, setQuestion] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  const [company, setCompany] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefing, setBriefing] = useState<Awaited<
    ReturnType<typeof createLegalBriefing>
  > | null>(null);

  const [draftPurpose, setDraftPurpose] = useState('');
  const [draftContext, setDraftContext] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draft, setDraft] = useState('');

  async function loadOverview() {
    try {
      setError(null);
      const result = await getLegalOverview();
      setOverview(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load legal intelligence.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setSearching(true);
      const result = await searchLegal(query.trim());
      setSearchResults(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Legal search failed.',
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleAsk(event: React.FormEvent) {
    event.preventDefault();

    if (!question.trim()) return;

    try {
      setAssistantLoading(true);
      const result = await askLegalAssistant(question.trim());
      setAssistantAnswer(result.response);
    } catch (err) {
      setAssistantAnswer(
        err instanceof Error
          ? err.message
          : 'The legal assistant could not answer.',
      );
    } finally {
      setAssistantLoading(false);
    }
  }

  async function handleBriefing(event: React.FormEvent) {
    event.preventDefault();

    try {
      setBriefingLoading(true);
      const result = await createLegalBriefing(company.trim());
      setBriefing(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not prepare the lawyer briefing.',
      );
    } finally {
      setBriefingLoading(false);
    }
  }

  async function handleDraft(event: React.FormEvent) {
    event.preventDefault();

    try {
      setDraftLoading(true);
      const result = await createLegalDraft(
        draftPurpose.trim(),
        draftContext.trim(),
      );
      setDraft(result.draft);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create draft.',
      );
    } finally {
      setDraftLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-6">
          <div className="animate-pulse h-6 w-48 bg-bg-card rounded mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse h-24 bg-bg-card rounded-xl"
              />
            ))}
          </div>
        </div>
        <div className="animate-pulse h-72 bg-bg-secondary border border-border-color rounded-2xl" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <div className="font-semibold">
              Legal intelligence unavailable
            </div>
            <div className="text-xs mt-1">{error}</div>
          </div>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            loadOverview();
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold text-white px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-gold/90 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </Card>
    );
  }

  if (!overview) return null;

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-gold/30">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-gold" />
              <h1 className="text-lg font-bold text-text-primary">
                Legal Intelligence
              </h1>
            </div>

            <p className="text-sm text-text-secondary mt-2 max-w-3xl leading-relaxed">
              A read-only legal operations view across connected company
              information. It identifies evidence, potential risks and
              recommended actions. It does not provide legal advice.
            </p>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              loadOverview();
            }}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-color px-3 py-2 text-xs font-semibold text-text-secondary hover:text-gold hover:border-gold/30 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <StatCard
          label="Urgent matters"
          value={overview.summary.urgent_matters}
          detail="High-severity potential risks requiring attention"
          tone="red"
        />
        <StatCard
          label="Upcoming deadlines"
          value={overview.summary.upcoming_deadlines}
          detail="Extracted dates requiring verification"
          tone="amber"
        />
        <StatCard
          label="Open matters"
          value={overview.summary.open_matters}
          detail="Potential legal issues found in source material"
          tone="gold"
        />
        <StatCard
          label="Contract records"
          value={overview.summary.contracts_requiring_attention}
          detail="Documents containing contract or agreement signals"
          tone="blue"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {error}
        </div>
      )}

      <Card>
        <SectionHeading
          icon={<FileSearch className="w-4 h-4" />}
          title="Legal document and email search"
          detail="Searches the existing vaults and cached Gmail data."
        />

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="legal-search" className="sr-only">
            Search legal documents
          </label>

          <input
            id="legal-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contracts, tax, renewal, counsel, employment..."
            className="min-h-11 flex-1 rounded-lg border border-border-color bg-bg-card px-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />

          <button
            type="submit"
            disabled={searching}
            className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-white hover:bg-gold/90 transition cursor-pointer disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </form>

        {searchResults && (
          <div className="mt-5">
            <div className="text-xs text-text-secondary mb-3">
              {searchResults.total} result
              {searchResults.total === 1 ? '' : 's'} for “
              {searchResults.query}”
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {searchResults.documents.map((item) => (
                <SourceLine key={item.id} item={item} />
              ))}
            </div>

            {searchResults.emails.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gold">
                  <Mail className="w-4 h-4" />
                  Email matches
                </div>

                {searchResults.emails.map((email) => (
                  <div
                    key={email.id || `${email.subject}-${email.date}`}
                    className="rounded-xl border border-border-color bg-bg-card p-3"
                  >
                    <div className="text-sm font-semibold text-text-primary">
                      {email.subject || 'Untitled email'}
                    </div>
                    <div className="text-[11px] text-text-muted mt-1">
                      {email.from} · {email.date} · {email.category}
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      {email.snippet}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {searchResults.total === 0 && (
              <p className="text-sm text-text-muted italic">
                No matching legal records were found in the connected sources.
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <SectionHeading
            icon={<Sparkles className="w-4 h-4" />}
            title="AI legal operations assistant"
            detail="Ask for evidence, context, risks and next actions."
          />

          <form onSubmit={handleAsk} className="space-y-3">
            <label
              htmlFor="legal-question"
              className="text-xs font-semibold text-text-secondary"
            >
              Question
            </label>

            <textarea
              id="legal-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="Which contracts expire in the next 60 days?"
              className="w-full rounded-lg border border-border-color bg-bg-card p-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-y"
            />

            <button
              type="submit"
              disabled={assistantLoading}
              className="min-h-11 inline-flex items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-white hover:bg-gold/90 transition cursor-pointer disabled:opacity-50"
            >
              {assistantLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              Ask assistant
            </button>
          </form>

          {assistantAnswer && (
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-border-color bg-bg-card p-4 text-sm text-text-secondary leading-relaxed">
              {assistantAnswer}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeading
            icon={<Gavel className="w-4 h-4" />}
            title="Prepare for a lawyer call"
            detail="Build an evidence pack from existing documents and emails."
          />

          <form onSubmit={handleBriefing} className="space-y-3">
            <label
              htmlFor="legal-company"
              className="text-xs font-semibold text-text-secondary"
            >
              Company or matter
            </label>

            <input
              id="legal-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Company X or specific matter"
              className="w-full min-h-11 rounded-lg border border-border-color bg-bg-card px-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />

            <button
              type="submit"
              disabled={briefingLoading}
              className="min-h-11 inline-flex items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-white hover:bg-gold/90 transition cursor-pointer disabled:opacity-50"
            >
              {briefingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarClock className="w-4 h-4" />
              )}
              Prepare briefing
            </button>
          </form>

          {briefing && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-border-color bg-bg-card p-4">
                <div className="font-semibold text-text-primary">
                  Background
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {briefing.background}
                </p>

                <div className="font-semibold text-text-primary mt-4">
                  Current issue
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {briefing.current_issue}
                </p>
              </div>

              <div className="rounded-xl border border-border-color bg-bg-card p-4">
                <div className="font-semibold text-text-primary">
                  Questions for counsel
                </div>
                <ul className="mt-2 space-y-1 text-xs text-text-secondary list-disc list-inside">
                  {briefing.questions_for_counsel.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border-color bg-bg-card p-4">
                <div className="font-semibold text-text-primary">
                  Recommended next steps
                </div>
                <ul className="mt-2 space-y-1 text-xs text-text-secondary list-disc list-inside">
                  {briefing.recommended_next_steps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeading
          icon={<Mail className="w-4 h-4" />}
          title="Draft legal communication"
          detail="Draft only. Nothing is sent automatically."
        />

        <form onSubmit={handleDraft} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="draft-purpose"
              className="text-xs font-semibold text-text-secondary"
            >
              Purpose
            </label>
            <input
              id="draft-purpose"
              value={draftPurpose}
              onChange={(event) => setDraftPurpose(event.target.value)}
              placeholder="Request contract review"
              className="mt-1 w-full min-h-11 rounded-lg border border-border-color bg-bg-card px-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>

          <div>
            <label
              htmlFor="draft-context"
              className="text-xs font-semibold text-text-secondary"
            >
              Verified context
            </label>
            <textarea
              id="draft-context"
              value={draftContext}
              onChange={(event) => setDraftContext(event.target.value)}
              rows={3}
              placeholder="Add source-backed facts and document references."
              className="mt-1 w-full rounded-lg border border-border-color bg-bg-card p-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-y"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={draftLoading}
              className="min-h-11 inline-flex items-center gap-2 rounded-lg border border-gold text-gold px-4 text-sm font-semibold hover:bg-gold/10 transition cursor-pointer disabled:opacity-50"
            >
              {draftLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Create draft
            </button>
          </div>
        </form>

        {draft && (
          <div className="mt-4 rounded-xl border border-border-color bg-bg-card p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wide font-bold text-amber-700">
              Draft only — review before sending
            </div>
            <pre className="whitespace-pre-wrap text-sm text-text-secondary font-sans leading-relaxed">
              {draft}
            </pre>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeading
          icon={<FileText className="w-4 h-4" />}
          title="Contracts requiring attention"
          detail="These are source records with contract or agreement signals, not confirmed signed contracts."
        />

        {overview.contracts.length === 0 ? (
          <p className="text-sm text-text-muted italic">
            No contract-like source records were found.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {overview.contracts.slice(0, 20).map((item) => (
              <SourceLine key={item.id} item={item} />
            ))}
          </div>
        )}
      </Card>

      {overview.unavailable_sources.length > 0 && (
        <Card>
          <SectionHeading
            icon={<AlertTriangle className="w-4 h-4" />}
            title="Unavailable or incomplete sources"
          />

          <div className="space-y-2">
            {overview.unavailable_sources.map((item) => (
              <div
                key={item.source}
                className="rounded-lg border border-border-color bg-bg-card p-3"
              >
                <div className="text-xs font-semibold text-text-primary">
                  {item.source}
                </div>
                <div className="text-[10px] uppercase text-amber-700 font-bold mt-1">
                  {item.status}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {item.note}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}