'use client';
import { useState } from 'react';
export default function GymJoinCode({ gymId }: { gymId: string }) {
  const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function generate() {
    if (!window.confirm('Create a new gym code? Any previous code will stop working. Existing members stay in the gym.')) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/gym/${gymId}/code`, { method: 'POST' });
      const data = await res.json(); if (!res.ok) throw new Error(data.error); setCode(data.code);
    } catch { setError('Unable to create a gym code. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="dark-card p-6 space-y-3">
    <h2 className="text-xl font-semibold">Gym join code</h2>
    <p className="text-sm text-gray-400">Anyone with this code can join your gym from Account → Join a gym. Share it with your members.</p>
    <button onClick={generate} disabled={busy} className="rounded-lg bg-thrivv-gold-500 px-4 py-2 text-black disabled:opacity-50">{busy ? 'Creating…' : 'Create / replace gym code'}</button>
    {code && <><p>Copy this code now; it is only shown here once.</p><input aria-label="Gym join code" className="w-full rounded-lg bg-gray-800 p-3 tracking-widest" readOnly value={code} onFocus={e => e.target.select()} /></>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
