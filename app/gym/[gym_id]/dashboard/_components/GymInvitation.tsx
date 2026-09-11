'use client';
import { useState } from 'react';
export default function GymInvitation({ gymId }: { gymId: string }) {
  const [link, setLink] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/gym/${gymId}/invitations`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLink(new URL(data.path, window.location.origin).toString());
    } catch { setMessage('Unable to create invitation. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="dark-card p-6 space-y-3">
    <h2 className="text-xl font-semibold">Invite members</h2>
    <button onClick={create} disabled={busy} className="px-4 py-2 bg-thrivv-gold-500 text-black rounded-lg">{busy ? 'Creating…' : 'Create invitation link'}</button>
    {link && <><p>Share this link with your members. It expires in 7 days.</p><input aria-label="Gym invitation link" readOnly value={link} className="w-full bg-gray-800 p-3 rounded-lg" onFocus={e => e.target.select()} /></>}
    <p role="status">{message}</p>
  </section>;
}
