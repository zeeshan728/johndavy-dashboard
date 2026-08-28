'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  HelpCircle,
  Inbox,
  X,
} from 'lucide-react';
import {
  executeApproval,
  getApprovals,
  HermesApprovalItem,
  updateApproval,
} from '@/lib/hermesClient';

const actions = [
  ['accept', 'Accept', Check],
  ['reject', 'Reject', X],
  ['defer', 'Defer', Clock3],
  ['ask_context', 'More context', HelpCircle],
  ['edit', 'Edit', Edit3],
] as const;

export default function ApprovalOutbox() {
  const router = useRouter();

  const [items, setItems] = useState<HermesApprovalItem[]>([]);
  const [approvedItems, setApprovedItems] = useState<HermesApprovalItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const [executing, setExecuting] = useState<string | null>(null);

  const [emailing, setEmailing] = useState<string | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const [delegating, setDelegating] = useState<string | null>(null);
  const [delegateTo, setDelegateTo] = useState('');
  const [delegationNote, setDelegationNote] = useState('');

  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();

    // Default to yesterday because the dashboard reviews completed meetings.
    date.setDate(date.getDate() - 1);

    return date.toISOString().slice(0, 10);
  });

  const [reviewDate, setReviewDate] = useState('');

  const load = async () => {
    try {
      setError(null);

      const result = await getApprovals(selectedDate);

      setReviewDate(result.review_date);

      setItems(
        result.items.filter((item) => item.status !== 'approved')
      );

      setApprovedItems(
        result.items.filter((item) => item.status === 'approved')
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not load approvals.'
      );
    }
  };

  useEffect(() => {
    void load();
  }, [selectedDate]);

  const act = async (
    item: HermesApprovalItem,
    decision: string
  ) => {
    if (decision === 'edit') {
      setEditing(item.id);
      setDraft(item.title);
      return;
    }

    if (decision === 'ask_context') {
      router.push('/meetings');
      return;
    }

    try {
      setError(null);

      const updated = await updateApproval(item.id, {
        decision,
      });

      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id)
      );

      if (decision === 'accept') {
        setApprovedItems((current) => [
          ...current,
          updated,
        ]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not update approval.'
      );
    }
  };

  const saveEdit = async (item: HermesApprovalItem) => {
    if (!draft.trim()) {
      setError('The proposed action cannot be empty.');
      return;
    }

    try {
      setError(null);

      const updated = await updateApproval(item.id, {
        decision: 'edit',
        edited_text: draft.trim(),
      });

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? updated
            : currentItem
        )
      );

      setEditing(null);
      setDraft('');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save edit.'
      );
    }
  };

  const openDelegationComposer = (
    item: HermesApprovalItem
  ) => {
    setError(null);
    setDelegating(item.id);
    setDelegateTo('');
    setDelegationNote(
      `Please take ownership of: ${item.title}`
    );
  };

  const closeDelegationComposer = () => {
    if (executing) {
      return;
    }

    setDelegating(null);
    setDelegateTo('');
    setDelegationNote('');
  };

  const confirmDelegation = async (
    item: HermesApprovalItem
  ) => {
    if (!delegateTo.trim() || !delegationNote.trim()) {
      setError(
        'Delegate to and delegation instructions are required.'
      );
      return;
    }

    setExecuting(item.id);
    setError(null);

    try {
      const updated = await executeApproval(item.id, {
        action: 'delegate',
        delegate_to: delegateTo.trim(),
        delegation_note: delegationNote.trim(),
      });

      if (updated.status === 'completed') {
        setApprovedItems((current) =>
          current.filter(
            (currentItem) => currentItem.id !== item.id
          )
        );
      } else {
        setApprovedItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id
              ? updated
              : currentItem
          )
        );
      }

      closeDelegationComposer();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not stage delegation.'
      );
    } finally {
      setExecuting(null);
    }
  };

  const openEmailComposer = (
    item: HermesApprovalItem
  ) => {
    setError(null);
    setEmailing(item.id);
    setEmailRecipient('');
    setEmailSubject(`Follow-up: ${item.title}`);
    setEmailBody(
      `Hi,\n\nFollowing up on: ${item.title}\n\nBest,\nJohn`
    );
  };

  const sendEmail = async (
    item: HermesApprovalItem
  ) => {
    if (
      !emailRecipient.trim() ||
      !emailSubject.trim() ||
      !emailBody.trim()
    ) {
      setError(
        'Recipient, subject, and message are required.'
      );
      return;
    }

    setExecuting(item.id);
    setError(null);

    try {
      const updated = await executeApproval(item.id, {
        action: 'email',
        recipient_email: emailRecipient.trim(),
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      });

      setEmailing(null);

      setApprovedItems((current) =>
        current.filter(
          (currentItem) => currentItem.id !== item.id
        )
      );

      if (updated.status !== 'completed') {
        setApprovedItems((current) => [
          ...current,
          updated,
        ]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not send email.'
      );
    } finally {
      setExecuting(null);
    }
  };

  const execute = async (
    item: HermesApprovalItem
  ) => {
    setExecuting(item.id);
    setError(null);

    try {
      const updated = await executeApproval(item.id, {
        action: 'asana_task',
      });

      if (updated.status === 'completed') {
        setApprovedItems((current) =>
          current.filter(
            (currentItem) => currentItem.id !== item.id
          )
        );
      } else {
        setApprovedItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id
              ? updated
              : currentItem
          )
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not execute approval.'
      );
    } finally {
      setExecuting(null);
    }
  };

  return (
    <section className="rounded-2xl border border-gold/30 bg-bg-secondary p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        {/* Left column: header and date filter */}
        <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-border-color pb-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-gold" />

              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gold">
                  Proposed actions
                </h2>

                <p className="mt-0.5 text-xs text-text-muted">
                  Review first. Nothing executes automatically.
                </p>
              </div>
            </div>

            <label className="flex min-h-[44px] items-center gap-2 text-xs font-semibold text-text-secondary">
              <CalendarDays
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-gold"
              />

              <span className="sr-only">
                Select meeting date
              </span>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                className="min-h-[40px] rounded-lg border border-border-color bg-bg-card px-2.5 py-1.5 text-xs text-text-primary outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              />

              <span className="whitespace-nowrap rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
                {items.length}/5
              </span>
            </label>
          </div>

          {error && (
            <p className="mb-3 mt-3 text-sm text-red">
              {error}
            </p>
          )}

          <p className="mb-3 mt-3 text-xs text-text-muted">
            Showing the five most important proposed actions
            from meetings on{' '}
            {reviewDate || selectedDate}.
          </p>
        </div>

        {/* Right column: proposed tasks and approved tasks */}
        <div className="min-w-0">
          {!items.length && !error && (
            <p className="text-sm text-text-secondary">
              No proposed actions for this date.
            </p>
          )}

          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-border-color bg-bg-card p-4"
              >
                <p className="text-sm font-medium leading-relaxed text-text-primary">
                  {item.prompt}
                </p>

                <p className="mt-2 text-xs text-text-muted">
                  {item.source.meeting_title ||
                    'Meeting transcript'}

                  {item.source.people?.length
                    ? ` · ${item.source.people.join(', ')}`
                    : ''}

                  {item.category
                    ? ` · ${item.category.replace(/_/g, ' ')}`
                    : ''}
                </p>

                {editing === item.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={draft}
                      onChange={(event) =>
                        setDraft(event.target.value)
                      }
                      className="min-w-0 flex-1 rounded-lg border border-border-color bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                    />

                    <button
                      type="button"
                      onClick={() => saveEdit(item)}
                      className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-white transition hover:bg-gold/90"
                    >
                      Save
                    </button>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {actions.map(
                    ([decision, label, Icon]) => (
                      <button
                        key={decision}
                        type="button"
                        onClick={() =>
                          act(item, decision)
                        }
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                          decision === 'accept'
                            ? 'border-emerald-200 bg-emerald-50 text-green hover:bg-emerald-100'
                            : decision === 'reject'
                              ? 'border-red-200 bg-red-50 text-red hover:bg-red-100'
                              : 'border-border-color bg-bg-secondary text-text-secondary hover:border-gold/40 hover:text-gold'
                        }`}
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />

                        {label}
                      </button>
                    )
                  )}
                </div>
              </article>
            ))}
          </div>

          {approvedItems.length > 0 && (
            <div className="mt-6 border-t border-border-color pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gold">
                  Approved actions
                </h3>

                <span className="text-xs text-text-muted">
                  Choose execution
                </span>
              </div>

              <div className="space-y-3">
                {approvedItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-border-color bg-bg-card p-4"
                  >
                    <p className="text-sm font-medium text-text-primary">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs text-text-muted">
                      Choose whether Francis should create an
                      Asana task or prepare an email.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={executing === item.id}
                        onClick={() => execute(item)}
                        className="min-h-[40px] rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-white transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Create Asana task
                      </button>

                      <button
                        type="button"
                        disabled={executing === item.id}
                        onClick={() =>
                          openEmailComposer(item)
                        }
                        className="min-h-[40px] rounded-lg border border-border-color bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Email someone
                      </button>

                      <button
                        type="button"
                        disabled={executing === item.id}
                        onClick={() =>
                          openDelegationComposer(item)
                        }
                        className="min-h-[40px] rounded-lg border border-border-color bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delegate
                      </button>
                    </div>

                    {delegating === item.id && (
                      <div className="mt-4 space-y-2 rounded-xl border border-border-color bg-bg-secondary p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gold">
                          Delegate action
                        </p>

                        <input
                          value={delegateTo}
                          onChange={(event) =>
                            setDelegateTo(event.target.value)
                          }
                          placeholder="Person or agent"
                          className="min-h-[40px] w-full rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                        />

                        <textarea
                          value={delegationNote}
                          onChange={(event) =>
                            setDelegationNote(
                              event.target.value
                            )
                          }
                          rows={5}
                          placeholder="Delegation instructions"
                          className="w-full rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={executing === item.id}
                            onClick={() =>
                              confirmDelegation(item)
                            }
                            className="min-h-[40px] rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Confirm delegation
                          </button>

                          <button
                            type="button"
                            disabled={executing === item.id}
                            onClick={closeDelegationComposer}
                            className="min-h-[40px] rounded-lg border border-border-color px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {emailing === item.id && (
                      <div className="mt-4 space-y-2 rounded-xl border border-border-color bg-bg-secondary p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gold">
                          Draft email
                        </p>

                        <input
                          value={emailRecipient}
                          onChange={(event) =>
                            setEmailRecipient(
                              event.target.value
                            )
                          }
                          placeholder="Recipient email"
                          type="email"
                          className="min-h-[40px] w-full rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                        />

                        <input
                          value={emailSubject}
                          onChange={(event) =>
                            setEmailSubject(
                              event.target.value
                            )
                          }
                          placeholder="Subject"
                          className="min-h-[40px] w-full rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                        />

                        <textarea
                          value={emailBody}
                          onChange={(event) =>
                            setEmailBody(event.target.value)
                          }
                          rows={6}
                          className="w-full rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={executing === item.id}
                            onClick={() => sendEmail(item)}
                            className="min-h-[40px] rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Send email
                          </button>

                          <button
                            type="button"
                            disabled={executing === item.id}
                            onClick={() => setEmailing(null)}
                            className="min-h-[40px] rounded-lg border border-border-color px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {item.execution_status && (
                      <p className="mt-2 text-xs text-text-muted">
                        Status: {item.execution_status}

                        {item.execution_error
                          ? ` — ${item.execution_error}`
                          : ''}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-[11px] text-text-muted">
            Accepting moves an item into Approval Outbox.
            Execution only begins after your second choice.
          </p>
        </div>
      </div>
    </section>
  );
}
