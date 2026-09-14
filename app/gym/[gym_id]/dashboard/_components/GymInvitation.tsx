'use client';
import { useState } from 'react';
export default function GymInvitation({ gymId }: { gymId: string }) {
  const [link, setLink] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(false);
  async function create() {
    setBusy(true); setMessage(''); setCopied(false);
    try {
      const res = await fetch(`/api/gym/${gymId}/invitations`, { method: 'POST', signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLink(new URL(data.path, window.location.origin).toString());
    } catch { setMessage('Unable to create invitation. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="dark-card p-6 space-y-3">
    <h2 className="text-xl font-semibold">Share an invitation link</h2>
    <p className="text-sm text-thrivv-text-secondary">Send members a link that takes them straight to joining your gym.</p>
    <button onClick={create} disabled={busy} className="btn-primary px-4 py-3 text-sm">{busy ? 'Creating…' : link ? 'Create another link' : 'Create invitation link'}</button>
    {link && <><p className="text-sm text-thrivv-text-secondary">This invitation expires in 7 days.</p><input aria-label="Gym invitation link" readOnly value={link} className="w-full min-w-0 bg-black/20 border border-white/10 p-3 rounded-xl text-sm" onFocus={e => e.target.select()} /><button className="btn-ghost px-4 py-3 text-sm" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setMessage('Invitation copied.'); } catch { setMessage('Select the invitation link and copy it manually.'); } }}>{copied ? 'Copied' : 'Copy invitation link'}</button></>}
    {message && <p role="status" className="text-sm text-thrivv-text-secondary">{message}</p>}
  </section>;
}
