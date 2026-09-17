'use client';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { clearClientAccountData } from '@/lib/client-session';

export default function DeleteAccount({ memberId }: { memberId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const title = useId();
  const description = useId();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reset = () => { setPassword(''); setConfirmation(''); setError(''); };
  useEffect(() => { dialog.current?.close(); reset(); }, [memberId]);
  const close = () => { if (!busy.current) { dialog.current?.close(); reset(); } };
  const remove = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current || confirmation !== 'DELETE' || !password) return;
    busy.current = true; setPending(true); setError('');
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, password, confirmation }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || 'Unable to confirm deletion. Please try again.');
      clearClientAccountData();
      window.location.replace('/member/login?accountDeleted=1');
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'The request timed out. Try signing in again to check whether your account was deleted.');
    } finally { busy.current = false; setPending(false); setPassword(''); }
  };
  return <section className="dark-card p-6 sm:p-8 space-y-4">
    <h2 className="text-xl font-semibold">Delete account</h2>
    <p className="text-sm text-gray-400">Permanently remove your Thrivv account and personal data.</p>
    <button type="button" aria-haspopup="dialog" onClick={() => { reset(); dialog.current?.showModal(); }} className="min-h-11 rounded-xl border border-red-400/40 px-4 py-3 text-red-300 hover:bg-red-500/10">Delete my account</button>
    <dialog ref={dialog} aria-labelledby={title} aria-describedby={description} aria-busy={pending}
      onCancel={event => { event.preventDefault(); close(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-white/15 bg-thrivv-bg-dark p-6 text-white backdrop:bg-black/75">
      <h2 id={title} className="text-xl font-semibold">Permanently delete your account?</h2>
      <p id={description} className="mt-3 text-sm leading-6 text-gray-300">This removes your profile, workouts, plans, nutrition logs, habits, health data, points and reward history. WHOOP syncing stops and you lose any gym staff access. This cannot be undone. Your gym membership or WHOOP subscription is not cancelled.</p>
      <form onSubmit={remove} className="mt-5 space-y-4">
        <label className="block text-sm">Current password<input autoFocus required type="password" autoComplete="current-password" maxLength={4096} value={password} onChange={e => setPassword(e.target.value)} disabled={pending} className="mt-2 block w-full rounded-lg border border-white/20 bg-black/20 p-3" /></label>
        <Link href="/member/forgot-password" className="inline-block text-sm underline">Forgot password?</Link>
        <label className="block text-sm">Type DELETE to confirm<input required autoComplete="off" spellCheck={false} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={pending} className="mt-2 block w-full rounded-lg border border-white/20 bg-black/20 p-3" /></label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={pending} onClick={close} className="min-h-11 rounded-lg border border-white/20 px-4 py-3 disabled:opacity-50">Keep my account</button>
          <button type="submit" disabled={pending || confirmation !== 'DELETE' || !password} className="min-h-11 rounded-lg bg-red-700 px-4 py-3 font-semibold disabled:opacity-50">{pending ? 'Deleting…' : 'Delete permanently'}</button>
        </div>
        <p role="status" className="text-sm text-gray-400">{pending ? 'Deleting your account. Please keep this page open.' : ''}</p>
      </form>
    </dialog>
  </section>;
}
