'use client';
import { useState } from 'react';
import Link from 'next/link';
export default function JoinGym({ params }: { params: { token: string } }) {
  const [message, setMessage] = useState('Sign in or create a Thrivv account, then return to this invitation to join your gym.');
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  async function join() {
    setBusy(true);
    try {
      const res = await fetch('/api/gym/invitations/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.token }) });
      const result = await res.json();
      if (!res.ok) { setMessage(result.error); return; }
      setJoined(true); setMessage('You have joined your gym. Connect WHOOP to sync your workouts.');
    } catch { setMessage('Unable to join right now. Please retry.'); }
    finally { setBusy(false); }
  }
  return <main className="max-w-lg mx-auto p-8 space-y-6">
    <h1 className="text-3xl font-bold">Join your gym on Thrivv</h1>
    <p role="status">{message}</p>
    {joined ? <Link href="/member/whoop">Connect WHOOP</Link> : <>
      <div className="flex gap-6"><Link href="/member/login" target="_blank">Sign in</Link><Link href="/member/signup" target="_blank">Create account</Link></div>
      <button onClick={join} disabled={busy} className="px-5 py-3 bg-thrivv-gold-500 text-black rounded-lg">{busy ? 'Joining…' : 'Join gym'}</button>
    </>}
  </main>;
}
