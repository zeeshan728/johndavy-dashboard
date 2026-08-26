'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
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
  ['ask_context', 'More Context', HelpCircle],
  ['edit', 'Edit', Edit3],
] as const;

export default function ApprovalOutbox() {
  const router = useRouter();

  const [items, setItems] = useState<HermesApprovalItem[]>([]);
  const [approvedItems, setApprovedItems] = useState<
    HermesApprovalItem[]
  >([]);

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

  async function loadApprovals() {
    try {
      setError(null);

      const result = await getApprovals();

      setItems(
        result.items.filter(
          (item) =>
            item.status !== 'approved' &&
            item.status !== 'completed' &&
            item.status !== 'rejected'
        )
      );

      setApprovedItems(
        result.items.filter(
          (item) =>
            item.status === 'approved' ||
            item.execution_status === 'awaiting_execution' ||
            item.execution_status === 'email_draft_required' ||
            item.execution_status === 'delegation_staged'
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load proposed actions.'
      );
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadApprovals();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function decide(
    item: HermesApprovalItem,
    decision: string
  ) {
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
        current.filter(
          (currentItem) => currentItem.id !== item.id
        )
      );

      if (decision === 'accept') {
        setApprovedItems((current) => [
          updated,
          ...current.filter(
            (currentItem) => currentItem.id !== item.id
          ),
        ]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update proposed action.'
      );
    }
  }

  async function saveEdit(item: HermesApprovalItem) {
    const editedText = draft.trim();

    if (!editedText) {
      setError('The edited action cannot be empty.');
      return;
    }

    try {
      setError(null);

      const updated = await updateApproval(item.id, {
        decision: 'edit',
        edited_text: editedText,
      });

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? updated : currentItem
        )
      );

      setEditing(null);
      setDraft('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save the edited action.'
      );
    }
  }

  function openEmailComposer(item: HermesApprovalItem) {
    setError(null);
    setEmailing(item.id);
    setDelegating(null);
    setEmailRecipient('');
    setEmailSubject(`Follow-up: ${item.title}`);
    setEmailBody(
      `Hi,\n\nFollowing up on: ${item.title}\n\nBest,\nJohn`
    );
  }

  function closeEmailComposer() {
    if (executing) return;

    setEmailing(null);
    setEmailRecipient('');
    setEmailSubject('');
    setEmailBody('');
  }

  async function sendEmail(item: HermesApprovalItem) {
    const recipient = emailRecipient.trim();
    const subject = emailSubject.trim();
    const body = emailBody.trim();

    if (!recipient || !subject || !body) {
      setError(
        'Recipient, subject, and message are all required.'
      );
      return;
    }

    setExecuting(item.id);
    setError(null);

    try {
      const updated = await executeApproval(item.id, {
        action: 'email',
        recipient_email: recipient,
        subject,
        body,
      });

      if (updated.status === 'completed') {
        setApprovedItems((current) =>
          current.filter(
            (currentItem) => currentItem.id !== item.id
          )
        );

        setEmailing(null);
        setEmailRecipient('');
        setEmailSubject('');
        setEmailBody('');
      } else {
        setApprovedItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id ? updated : currentItem
          )
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not send email.'
      );
    } finally {
      setExecuting(null);
    }
  }

  function openDelegationComposer(item: HermesApprovalItem) {
    setError(null);
    setDelegating(item.id);
    setEmailing(null);
    setDelegateTo('');
    setDelegationNote(
      `Please take ownership of: ${item.title}`
    );
  }

  function closeDelegationComposer() {
    if (executing) return;

    setDelegating(null);
    setDelegateTo('');
    setDelegationNote('');
  }

  async function confirmDelegation(item: HermesApprovalItem) {
    const target = delegateTo.trim();
    const instructions = delegationNote.trim();

    if (!target || !instructions) {
      setError(
        'A person or agent and delegation instructions are required.'
      );
      return;
    }

    setExecuting(item.id);
    setError(null);

    try {
      const updated = await executeApproval(item.id, {
        action: 'delegate',
        delegate_to: target,
        delegation_note: instructions,
      });

      setApprovedItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? updated
            : currentItem
        )
      );

      setDelegating(null);
      setDelegateTo('');
      setDelegationNote('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not stage delegation.'
      );
    } finally {
      setExecuting(null);
    }
  }

  async function executeAsanaTask(item: HermesApprovalItem) {
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create the Asana task.'
      );
    } finally {
      setExecuting(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gold/30 bg-bg-secondary p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-border-color pb-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-gold" />

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gold">
              Proposed Actions
            </h2>

            <p className="mt-0.5 text-xs text-text-muted">
              Review proposed actions before anything happens.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
          {items.length} proposed
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red">
          {error}
        </p>
      )}

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
          Proposed actions
        </h3>

        {!items.length && (
          <p className="text-sm text-text-secondary">
            No proposed actions awaiting review.
          </p>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border-color bg-bg-card p-4"
            >
              <p className="text-sm font-medium leading-relaxed text-text-primary">
                {item.prompt || item.title}
              </p>

              <p className="mt-2 text-xs text-text-muted">
                {item.source.meeting_title || 'Meeting transcript'}

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
                    className="min-w-0 flex-1 rounded-lg border border-border-color bg-bg-secondary px-3 py-2 text-sm text-text-primary"
                  />

                  <button
                    type="button"
                    onClick={() => void saveEdit(item)}
                    className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-white"
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {actions.map(([decision, label, Icon]) => (
                  <button
                    type="button"
                    key={decision}
                    onClick={() => void decide(item, decision)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                      decision === 'accept'
                        ? 'border-emerald-200 bg-emerald-50 text-green'
                        : decision === 'reject'
                          ? 'border-red-200 bg-red-50 text-red'
                          : 'border-border-color bg-bg-secondary text-text-secondary hover:border-gold/40 hover:text-gold'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      {approvedItems.length > 0 && (
        <div className="mt-7 border-t border-border-color pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gold">
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
                  John approved this action. Choose what Francis
                  should do next.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={executing === item.id}
                    onClick={() => void executeAsanaTask(item)}
                    className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Create Asana task
                  </button>

                  <button
                    type="button"
                    disabled={executing === item.id}
                    onClick={() => openEmailComposer(item)}
                    className="rounded-lg border border-border-color bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:opacity-50"
                  >
                    Email someone
                  </button>

                  <button
                    type="button"
                    disabled={executing === item.id}
                    onClick={() => openDelegationComposer(item)}
                    className="rounded-lg border border-border-color bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:opacity-50"
                  >
                    Delegate
                  </button>
                </div>

                {emailing === item.id && (
                  <div className="mt-4 space-y-3 rounded-xl border border-border-color bg-bg-secondary p-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gold">
                        Draft email
                      </p>

                      <p className="mt-1 text-xs text-text-muted">
                        Nothing will be sent until you click Send email.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`recipient-${item.id}`}
                        className="mb-1 block text-xs font-semibold text-text-secondary"
                      >
                        Recipient
                      </label>

                      <input
                        id={`recipient-${item.id}`}
                        type="email"
                        value={emailRecipient}
                        onChange={(event) =>
                          setEmailRecipient(event.target.value)
                        }
                        placeholder="person@example.com"
                        className="w-full rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`subject-${item.id}`}
                        className="mb-1 block text-xs font-semibold text-text-secondary"
                      >
                        Subject
                      </label>

                      <input
                        id={`subject-${item.id}`}
                        value={emailSubject}
                        onChange={(event) =>
                          setEmailSubject(event.target.value)
                        }
                        placeholder="Email subject"
                        className="w-full rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`body-${item.id}`}
                        className="mb-1 block text-xs font-semibold text-text-secondary"
                      >
                        Message
                      </label>

                      <textarea
                        id={`body-${item.id}`}
                        value={emailBody}
                        onChange={(event) =>
                          setEmailBody(event.target.value)
                        }
                        rows={8}
                        placeholder="Write your message"
                        className="w-full resize-y rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={executing === item.id}
                        onClick={() => void sendEmail(item)}
                        className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {executing === item.id
                          ? 'Sending...'
                          : 'Send email'}
                      </button>

                      <button
                        type="button"
                        disabled={executing === item.id}
                        onClick={closeEmailComposer}
                        className="rounded-lg border border-border-color px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {delegating === item.id && (
                  <div className="mt-4 space-y-3 rounded-xl border border-border-color bg-bg-secondary p-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gold">
                        Delegate action
                      </p>

                      <p className="mt-1 text-xs text-text-muted">
                        Nothing is dispatched until you confirm the delegation.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`delegate-to-${item.id}`}
                        className="mb-1 block text-xs font-semibold text-text-secondary"
                      >
                        Person or agent
                      </label>

                      <input
                        id={`delegate-to-${item.id}`}
                        value={delegateTo}
                        onChange={(event) =>
                          setDelegateTo(event.target.value)
                        }
                        placeholder="e.g. Laura, Francis, or Agent 3"
                        className="w-full rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`delegation-note-${item.id}`}
                        className="mb-1 block text-xs font-semibold text-text-secondary"
                      >
                        Instructions
                      </label>

                      <textarea
                        id={`delegation-note-${item.id}`}
                        value={delegationNote}
                        onChange={(event) =>
                          setDelegationNote(event.target.value)
                        }
                        rows={6}
                        placeholder="What should this person or agent do?"
                        className="w-full resize-y rounded-lg border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={executing === item.id}
                        onClick={() => void confirmDelegation(item)}
                        className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {executing === item.id
                          ? 'Saving...'
                          : 'Confirm delegation'}
                      </button>

                      <button
                        type="button"
                        disabled={executing === item.id}
                        onClick={closeDelegationComposer}
                        className="rounded-lg border border-border-color px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {item.execution_status && (
                  <p className="mt-3 text-xs text-text-muted">
                    Status: {item.execution_status}

                    {item.execution_error
                      ? ` — ${item.execution_error}`
                      : ''}
                  </p>
                )}

                {item.execution_note && (
                  <p className="mt-1 text-xs text-text-muted">
                    {item.execution_note}
                  </p>
                )}

                {item.execution?.url && (
                  <a
                    href={item.execution.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-gold underline"
                  >
                    Open Asana task
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-[11px] text-text-muted">
        Accepting an action moves it into Approved actions.
        Nothing executes until you choose and confirm an execution method.
      </p>
    </section>
  );
}
