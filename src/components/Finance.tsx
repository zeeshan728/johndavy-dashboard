'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileSearch,
  Landmark,
  Loader2,
  MessageSquare,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  WalletCards,
} from 'lucide-react';

import {
  askFinance,
  FinanceAskResponse,
  FinanceInvoice,
  FinanceOverview,
  getFinanceOverview,
} from '@/lib/hermesClient';

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null || amount === undefined) return 'Unavailable';

  return `${currency || ''} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Date unavailable';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function Card({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-bg-card border border-border-color rounded-xl overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-color/70">
        <span className="text-gold">{icon}</span>
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border-color px-4 py-5">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">{detail}</p>
    </div>
  );
}

function InvoiceRow({
  invoice,
  onView,
}: {
  invoice: FinanceInvoice;
  onView: (invoice: FinanceInvoice) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onView(invoice)}
      className="w-full text-left rounded-lg border border-border-color p-3 hover:border-gold/40 hover:bg-bg-card-hover transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {invoice.invoice_number
              ? `Invoice ${invoice.invoice_number}`
              : 'Unidentified finance document'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {invoice.vendor || invoice.customer || 'Party unavailable'}
          </p>
        </div>

        <span className="text-xs font-semibold text-text-primary whitespace-nowrap">
          {formatAmount(invoice.amount, invoice.currency)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 text-[10px]">
        <span className="rounded-full bg-gold/10 text-gold px-2 py-1">
          {invoice.status}
        </span>

        {invoice.overdue && (
          <span className="rounded-full bg-red-500/10 text-red-600 px-2 py-1">
            overdue
          </span>
        )}

        {invoice.duplicate && (
          <span className="rounded-full bg-amber-500/10 text-amber-700 px-2 py-1">
            potential duplicate
          </span>
        )}

        <span className="rounded-full bg-bg-secondary text-text-muted px-2 py-1">
          {invoice.confidence}
        </span>
      </div>

      <p className="mt-3 text-xs text-text-secondary leading-relaxed">
        {invoice.recommendation}
      </p>
    </button>
  );
}

function CalendarList({
  title,
  items,
}: {
  title: string;
  items: FinanceOverview['calendar']['today'];
}) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wide font-semibold text-text-muted mb-2">
        {title}
      </h3>

      {items.length === 0 ? (
        <p className="text-xs text-text-muted">No finance events identified.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item.date}-${item.title || 'event'}-${index}`}
              className="flex items-start justify-between gap-3 rounded-lg bg-bg-secondary p-3"
            >
              <div>
                <p className="text-xs font-semibold text-text-primary">
                  {item.title || 'Financial calendar event'}
                </p>
                <p className="text-[11px] text-text-muted mt-1">
                  {formatDate(item.date)}
                </p>
              </div>
              <span className="text-[10px] text-amber-700">
                verify deadline
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinanceAsk({
  onAnswer,
}: {
  onAnswer: (result: FinanceAskResponse) => void;
}) {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setAsking(true);
    setError(null);

    try {
      const result = await askFinance(trimmed);
      onAnswer(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Finance question failed');
    } finally {
      setAsking(false);
    }
  }

  return (
    <Card title="Ask Hermes" icon={<MessageSquare className="w-4 h-4" />}>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Which financial issues need my attention today?"
          className="flex-1 rounded-lg border border-border-color bg-bg-secondary px-3 py-2.5 text-sm text-text-primary outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {asking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Ask
        </button>
      </form>

      {error && (
        <p className="mt-3 text-xs text-red-600">
          {error}
        </p>
      )}
    </Card>
  );
}

export default function Finance() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<FinanceInvoice | null>(null);
  const [askResult, setAskResult] = useState<FinanceAskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFinance(showSpinner = false) {
    if (showSpinner) setRefreshing(true);

    try {
      const result = await getFinanceOverview();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Finance data failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFinance(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-bg-card border border-border-color rounded-xl p-6">
        <p className="text-sm font-semibold text-text-primary">
          Finance data unavailable
        </p>
        <p className="mt-2 text-xs text-text-muted">
          {error || 'No finance response was returned.'}
        </p>
        <button
          type="button"
          onClick={() => loadFinance(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const unavailableLedger = data.data_availability.some(
    (source) => source.status === 'unavailable'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-gold" />
            <h1 className="text-2xl font-serif font-bold text-text-primary">
              Finance
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Financial operations, obligations, invoices, risks, and actions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadFinance(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-color px-3 py-2 text-xs font-semibold text-text-secondary hover:border-gold/40 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {unavailableLedger && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-900">
              Finance ledger connection required
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Candidate finance documents can be searched, but authoritative
              payables, receivables, cash, and expense-ledger values are not
              currently asserted.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border-color rounded-xl p-4">
          <FileCheck2 className="w-4 h-4 text-gold mb-3" />
          <p className="text-[10px] uppercase tracking-wide text-text-muted">
            Awaiting approval
          </p>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {data.approvals.length}
          </p>
        </div>

        <div className="bg-bg-card border border-border-color rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 mb-3" />
          <p className="text-[10px] uppercase tracking-wide text-text-muted">
            Urgent actions
          </p>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {data.urgent_actions.length}
          </p>
        </div>

        <div className="bg-bg-card border border-border-color rounded-xl p-4">
          <WalletCards className="w-4 h-4 text-gold mb-3" />
          <p className="text-[10px] uppercase tracking-wide text-text-muted">
            Payables
          </p>
          <p className="text-sm font-semibold text-text-muted mt-2">
            Unavailable
          </p>
        </div>

        <div className="bg-bg-card border border-border-color rounded-xl p-4">
          <Landmark className="w-4 h-4 text-gold mb-3" />
          <p className="text-[10px] uppercase tracking-wide text-text-muted">
            Cash position
          </p>
          <p className="text-sm font-semibold text-text-muted mt-2">
            Unavailable
          </p>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <Card title="Urgent Actions" icon={<AlertTriangle className="w-4 h-4" />}>
          {data.urgent_actions.length === 0 ? (
            <EmptyState
              title="No urgent finance actions identified"
              detail="This means no candidate document was explicitly identified as overdue. It does not prove that no financial obligation exists."
            />
          ) : (
            <div className="space-y-3">
              {data.urgent_actions.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onView={setSelectedInvoice}
                />
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Awaiting Approval"
          icon={<FileCheck2 className="w-4 h-4" />}
        >
          {data.approvals.length === 0 ? (
            <EmptyState
              title="No approval queue identified"
              detail="Candidate documents are not treated as approved or payable without authoritative confirmation."
            />
          ) : (
            <div className="space-y-3">
              {data.approvals.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onView={setSelectedInvoice}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Invoice Management" icon={<Receipt className="w-4 h-4" />}>
        {data.recent_invoices.length === 0 ? (
          <EmptyState
            title="No candidate invoices found"
            detail="Finance email and document search is available, but no invoice candidate was found in the connected local sources."
          />
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {data.recent_invoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                onView={setSelectedInvoice}
              />
            ))}
          </div>
        )}
      </Card>

      <div className="grid xl:grid-cols-2 gap-5">
        <Card title="Accounts Payable" icon={<WalletCards className="w-4 h-4" />}>
          <EmptyState
            title="Authoritative payable ledger unavailable"
            detail="Connect an accounting or payable system before showing amounts due today, this week, this month, or overdue."
          />
        </Card>

        <Card title="Accounts Receivable" icon={<ArrowRight className="w-4 h-4" />}>
          <EmptyState
            title="Authoritative receivable ledger unavailable"
            detail="No customer balance, aging, or collection figures are asserted from the current sources."
          />
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <Card title="Cash & Liquidity" icon={<Landmark className="w-4 h-4" />}>
          <EmptyState
            title="Cash position unavailable"
            detail={
              data.cash_liquidity.recommendation ||
              'Connect an authoritative cash or banking source.'
            }
          />
        </Card>

        <Card title="Expenses & Recurring Costs" icon={<WalletCards className="w-4 h-4" />}>
          <EmptyState
            title="Expense ledger unavailable"
            detail="No authoritative expense, subscription, vendor-spend, or recurring-cost ledger is connected."
          />
        </Card>
      </div>

      <Card title="Financial Risks" icon={<ShieldAlert className="w-4 h-4" />}>
        {data.risks.length === 0 ? (
          <EmptyState
            title="No risks asserted"
            detail="No authoritative risk analysis is available. Candidate invoice evidence still requires verification."
          />
        ) : (
          <div className="space-y-3">
            {data.risks.map((risk, index) => (
              <div
                key={index}
                className="rounded-lg border border-border-color p-3 text-sm text-text-secondary"
              >
                {JSON.stringify(risk)}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Financial Calendar" icon={<CalendarDays className="w-4 h-4" />}>
        <div className="grid lg:grid-cols-3 gap-5">
          <CalendarList title="Today" items={data.calendar.today} />
          <CalendarList title="Next 7 Days" items={data.calendar.next_7_days} />
          <CalendarList title="Next 30 Days" items={data.calendar.next_30_days} />
        </div>
      </Card>

      <FinanceAsk onAnswer={setAskResult} />

      {askResult && (
        <Card title="Hermes' Finance Answer" icon={<MessageSquare className="w-4 h-4" />}>
          <p className="text-sm text-text-primary leading-relaxed">
            {askResult.answer}
          </p>

          {askResult.evidence.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-text-muted">
                Evidence
              </p>
              {askResult.evidence.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onView={setSelectedInvoice}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-bg-primary border border-border-color shadow-xl">
            <div className="flex items-center justify-between border-b border-border-color px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {selectedInvoice.invoice_number
                    ? `Invoice ${selectedInvoice.invoice_number}`
                    : 'Finance document'}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Candidate evidence — verify before action
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-xs font-semibold text-text-muted hover:text-text-primary"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase text-text-muted">Vendor</p>
                  <p className="text-sm text-text-primary mt-1">
                    {selectedInvoice.vendor || 'Unavailable'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-text-muted">Amount</p>
                  <p className="text-sm text-text-primary mt-1">
                    {formatAmount(
                      selectedInvoice.amount,
                      selectedInvoice.currency,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-text-muted">Invoice date</p>
                  <p className="text-sm text-text-primary mt-1">
                    {formatDate(selectedInvoice.invoice_date)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-text-muted">Due date</p>
                  <p className="text-sm text-text-primary mt-1">
                    {formatDate(selectedInvoice.due_date)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-bg-secondary p-4">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-text-muted">
                  Evidence
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
                  {selectedInvoice.evidence}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => {
                    setSelectedInvoice(null);
                    alert(
                      'No approval was recorded. Use the Finance action-draft endpoint after explicit review.',
                    );
                  }}
                >
                  Review
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-border-color px-3 py-2 text-xs font-semibold text-text-secondary"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}