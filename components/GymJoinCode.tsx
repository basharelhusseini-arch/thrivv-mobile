'use client';
import { useEffect, useRef, useState } from 'react';
export default function GymJoinCode({ gymId }: { gymId: string }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const submitting = useRef(false);
  async function load() {
    setCode(''); setError(''); setStatus('loading'); setCopied(false);
    try {
      const res = await fetch(`/api/gym/${gymId}/code`, { cache: 'no-store' });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Unable to load gym code');
      setCode(data.code || ''); setStatus(data.status);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load gym code'); setStatus('error'); }
  }
  useEffect(() => { load(); }, [gymId]);
  async function generate() {
    if (submitting.current) return;
    if (!window.confirm(status === 'missing' ? 'Create a joining code for your gym?' : 'Replace the joining code? The previous code will stop working. Existing members stay in the gym.')) return;
    submitting.current = true; setBusy(true); setError(''); setCopied(false);
    try {
      const res = await fetch(`/api/gym/${gymId}/code`, { method: 'POST' });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Unable to create code');
      setCode(data.code); setStatus('available');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save code. Please retry.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { setError('Copy unavailable. Select the code and copy it manually.'); }
  }
  return <section className="space-y-3" aria-label="Gym joining code">
    <p className="text-xs uppercase tracking-widest text-thrivv-text-muted">Gym joining code</p>
    {status === 'loading' ? <p className="text-sm text-thrivv-text-secondary">Loading code…</p> : code ? <div className="flex flex-wrap items-center gap-3">
      <input aria-label="Gym joining code" className="min-w-0 w-full sm:w-72 rounded-xl border border-thrivv-gold-500/20 bg-black/20 p-3 text-thrivv-gold-500 font-semibold tracking-widest" readOnly value={code} onFocus={e => e.target.select()} />
      <button type="button" onClick={copy} className="btn-ghost px-4 py-3">{copied ? 'Copied' : 'Copy code'}</button>
    </div> : status === 'legacy' ? <p className="text-sm text-thrivv-text-secondary">Your existing code still works, but its original text was not saved. Replace it only when you are ready to share a new code.</p> : status === 'missing' ? <p className="text-sm text-thrivv-text-secondary">No joining code yet.</p> : null}
    <p className="text-sm text-thrivv-text-secondary">Share with members to join your gym. This is not a workout-verification QR code.</p>
    {status !== 'error' && status !== 'loading' && <button type="button" onClick={generate} disabled={busy} className="text-sm text-thrivv-gold-500 underline disabled:opacity-50">{busy ? 'Saving…' : status === 'missing' ? 'Create code' : 'Replace code'}</button>}
    {error && <p role="alert" className="text-sm text-red-400">{error} <button type="button" onClick={load} disabled={busy} className="underline">Retry loading</button></p>}
  </section>;
}
