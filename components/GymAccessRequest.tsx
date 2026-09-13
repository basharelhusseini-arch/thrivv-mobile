'use client';
import { useEffect, useState } from 'react';
import { readJson, useAction, inputClass, buttonClass } from './SupportInbox';
export default function GymAccessRequest() {
  const [requests, setRequests] = useState<any[] | null>(null); const [error, setError] = useState('');
  const [gymName, setGym] = useState(''); const [location, setLocation] = useState(''); const [role, setRole] = useState('');
  const action = useAction();
  async function reload() { const data = await readJson('/api/gym/access-requests'); setRequests(data.requests); }
  useEffect(() => { reload().catch(e => setError(e.message)); }, []);
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold">Request gym management access</h2>
    <p className="text-sm text-gray-400">Thrivv reviews your request before granting management access. A member joining code does not grant these permissions.</p>
    {error && <p role="alert">{error} <button className="underline" onClick={() => reload().then(() => setError('')).catch(e => setError(e.message))}>Retry</button></p>}
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); action.run('/api/gym/access-requests', { gymName, location, role }, async () => { await reload(); setGym(''); setLocation(''); setRole(''); }); }}>
      <label className="block">Gym name<input required maxLength={120} className={inputClass} value={gymName} onChange={e => setGym(e.target.value)} disabled={action.busy} /></label>
      <label className="block">Gym location<input required maxLength={200} className={inputClass} value={location} onChange={e => setLocation(e.target.value)} disabled={action.busy} /></label>
      <label className="block">Your role at the gym<input required maxLength={120} className={inputClass} value={role} onChange={e => setRole(e.target.value)} disabled={action.busy} /></label>
      <button className={buttonClass} disabled={action.busy}>Submit for review</button>
    </form>
    {action.message && <p role="status">{action.message}</p>}
    {requests && <ul className="space-y-3">{requests.map(r => <li key={r.id} className="border-t border-white/10 pt-3"><strong>{r.gym_name}</strong> · {r.status}{r.review_reason && <p className="text-sm break-words">{r.review_reason}</p>}</li>)}</ul>}
  </section>;
}
