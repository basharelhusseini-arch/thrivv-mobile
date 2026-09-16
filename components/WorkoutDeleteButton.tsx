'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

type Props = {
  kind: 'workout' | 'plan';
  id: string;
  memberId: string;
  name: string;
  onDeleted: () => void;
};

export default function WorkoutDeleteButton({ kind, id, memberId, name, onDeleted }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const requestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const label = kind === 'plan' ? 'training plan' : 'logged workout';

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setDeleting(false);
    setError('');
    return () => {
      request.current?.abort();
      request.current = null;
      if (requestTimeout.current) clearTimeout(requestTimeout.current);
      requestTimeout.current = null;
    };
  }, [id, memberId, kind]);

  const close = () => {
    if (request.current) return;
    setOpen(false);
    setError('');
  };

  const remove = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    requestTimeout.current = timeout;
    setDeleting(true);
    setError('');
    try {
      const resource = kind === 'plan' ? 'workout-plans' : 'workouts';
      const response = await fetch(`/api/${resource}/${encodeURIComponent(id)}?expectedUserId=${encodeURIComponent(memberId)}`, {
        method: 'DELETE', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      if (request.current !== controller) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('Your account changed or your session expired. Refresh and sign in before trying again.');
        if (response.status !== 404) throw new Error(`Unable to delete this ${label}. Please try again.`);
      }
      // An already-removed record can be cleared from this view as well.
      setOpen(false);
      window.dispatchEvent(new Event('thrivv:workouts-synced'));
      onDeleted();
    } catch (cause) {
      if (request.current === controller) {
        setError(controller.signal.aborted
          ? 'This request timed out. Refresh to check whether it was deleted, or try again.'
          : cause instanceof Error ? cause.message : `Unable to delete this ${label}. Please try again.`);
      }
    } finally {
      clearTimeout(timeout);
      if (requestTimeout.current === timeout) requestTimeout.current = null;
      if (request.current === controller) {
        request.current = null;
        setDeleting(false);
      }
    }
  };

  return <>
    <button type="button" title={`Delete ${label}`} aria-label={`Delete ${label}: ${name}`} aria-haspopup="dialog" onClick={() => { setError(''); setOpen(true); }}
      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400">
      <Trash2 size={18} aria-hidden="true" />
    </button>
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={deleting}
      onCancel={event => { event.preventDefault(); close(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-white/15 bg-thrivv-bg-dark p-6 text-white shadow-2xl backdrop:bg-black/75">
      <h2 id={titleId} className="text-lg font-semibold">Delete {label}?</h2>
      <p className="mt-3 break-words text-sm font-medium">{name}</p>
      <p id={descriptionId} className="mt-2 text-sm leading-6 text-thrivv-text-secondary">
        {kind === 'plan'
          ? 'This permanently deletes the training plan and all sessions included in it. Workouts logged separately and reward records will not be changed.'
          : 'This permanently removes the workout from your history. Gym verification, points and reward records will not be changed.'}
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus disabled={deleting} onClick={close} className="min-h-11 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50">Cancel</button>
        <button type="button" disabled={deleting} onClick={() => void remove()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
          {deleting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {deleting ? 'Deleting...' : `Delete ${label}`}
        </button>
      </div>
    </dialog>
  </>;
}
