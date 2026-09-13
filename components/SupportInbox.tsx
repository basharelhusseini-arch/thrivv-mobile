'use client';
import { useEffect, useRef, useState } from 'react';
export async function readJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request unavailable');
  return data;
}
export function useAction() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const pending = useRef<{ key: string; id: string }>(); const running = useRef(false);
  async function run(url: string, payload: object, done?: (data: any) => Promise<void> | void, method = 'POST') {
    if (running.current) return;
    running.current = true; setBusy(true); setMessage('');
    const key = `${method}:${url}:${JSON.stringify(payload)}`;
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    try {
      const data = await readJson(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, requestId: pending.current.id }) });
      // Retain request ID if refreshing the UI fails after the server saved the action.
      await done?.(data); pending.current = undefined; setMessage('Saved');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unavailable. Please retry.'); }
    finally { running.current = false; setBusy(false); }
  }
  return { busy, message, run, setMessage };
}
export const inputClass = 'input-premium w-full min-w-0 px-3 py-3 text-sm';
export const buttonClass = 'btn-primary px-4 py-3 text-sm disabled:opacity-50';
export function Pager({ offset, total, setOffset }: { offset: number; total: number; setOffset: (n: number) => void }) {
  return <div className="flex flex-wrap items-center gap-4 text-sm"><button type="button" disabled={!offset} className="underline disabled:opacity-40" onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button><span>{total ? offset + 1 : 0}–{Math.min(offset + 50, total)} of {total}</span><button type="button" disabled={offset + 50 >= total} className="underline disabled:opacity-40" onClick={() => setOffset(offset + 50)}>Next</button></div>;
}
export default function SupportInbox({ admin = false }: { admin?: boolean }) {
  const [list, setList] = useState<any>(null); const [offset, setOffset] = useState(0); const [id, setId] = useState('');
  const [thread, setThread] = useState<any>(null); const [messageOffset, setMessageOffset] = useState(0);
  const [error, setError] = useState(''); const [subject, setSubject] = useState(''); const [body, setBody] = useState('');
  const [reply, setReply] = useState(''); const [status, setStatus] = useState('open'); const action = useAction();
  const base = `/api/support/tickets?offset=${offset}${admin ? '&scope=admin' : ''}`;
  async function reload() { setList(await readJson(base)); if (id) setThread(await readJson(`/api/support/tickets/${id}?offset=${messageOffset}`)); }
  useEffect(() => { let active = true; setList(null); setError(''); readJson(base).then(d => { if (active) setList(d); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [base]);
  useEffect(() => { if (!admin) return; const t = new URLSearchParams(window.location.search).get('ticket'); if (t && /^[0-9a-f-]{36}$/i.test(t)) setId(t); }, [admin]);
  useEffect(() => { let active = true; setThread(null); setReply(''); if (id) readJson(`/api/support/tickets/${id}?offset=${messageOffset}`).then(d => { if (active) { setThread(d); setStatus(d.ticket.status); } }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [id, messageOffset]);
  const delivery: Record<string,string> = { pending: 'Email notification pending', sending: 'Email notification in progress', accepted: 'Email accepted by provider; inbox delivery unconfirmed', failed: 'Email notification failed; ticket is saved', unavailable: 'Email notifications not configured; ticket is saved', unknown: 'Email outcome unknown; ticket is saved' };
  return <section className="space-y-6">
    <h2 className="text-2xl font-semibold">{admin ? 'Support inbox' : 'Help & Support'}</h2>
    <p className="text-sm text-thrivv-text-secondary">{admin ? 'Private requests from members and gym owners. Reply here to keep the conversation together.' : 'Send Thrivv a message. Your conversation is private to you and platform administrators. Check here for replies. Do not include passwords or access tokens.'}</p>
    {error && <p role="alert">{error} <button className="underline" onClick={() => { setError(''); reload().catch(e => setError(e.message)); }}>Retry</button></p>}
    {!admin && <form className="premium-card p-5 space-y-3" onSubmit={e => { e.preventDefault(); action.run('/api/support/tickets', { subject, message: body }, async d => { await reload(); setSubject(''); setBody(''); setId(d.id); }); }}>
      <label className="block">Subject<input required minLength={3} maxLength={120} disabled={action.busy} className={inputClass} value={subject} onChange={e => setSubject(e.target.value)} /></label>
      <label className="block">Your message<textarea required maxLength={5000} rows={4} disabled={action.busy} className={inputClass} value={body} onChange={e => setBody(e.target.value)} /></label>
      <button disabled={action.busy} className={buttonClass}>Send request</button>
    </form>}
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="premium-card p-5 space-y-4">{!list ? <p>Loading requests…</p> : <><ul className="space-y-3">{list.tickets.map((t: any) => <li key={t.id}><button className="w-full text-left rounded-xl border border-thrivv-gold-500/20 p-3 break-words" onClick={() => { setId(t.id); setMessageOffset(0); }}><strong>{t.subject}</strong><span className="block text-sm text-gray-400">{t.status} · {new Date(t.created_at).toLocaleString()}</span></button></li>)}</ul>{!list.tickets.length && <p>No requests yet.</p>}<Pager offset={offset} total={list.total} setOffset={setOffset} /></>}</div>
      {id && <div className="premium-card p-5 space-y-4 min-w-0">{!thread ? <p>Loading conversation…</p> : <>
        <h3 className="text-xl break-words">{thread.ticket.subject}</h3><p className="text-sm">{thread.ticket.status} · {delivery[thread.ticket.email_status]}</p>
        {admin && <><p className="text-xs break-all text-gray-400">Requester account: {thread.ticket.user_id}</p>{!['accepted','unknown'].includes(thread.ticket.email_status) && <button disabled={action.busy} className="underline text-sm" onClick={() => action.run(`/api/admin/support/${id}/notify`, {}, reload)}>Retry email notification</button>}</>}
        <ol className="space-y-4">{thread.messages.map((m: any) => <li key={m.id} className="rounded-xl bg-white/5 p-4"><p className="text-xs text-thrivv-gold-500">{m.author_role === 'admin' ? 'Thrivv support' : 'Requester'} · {new Date(m.created_at).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap break-words">{m.body}</p></li>)}</ol>
        <Pager offset={messageOffset} total={thread.total} setOffset={setMessageOffset} />
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); action.run(`/api/support/tickets/${id}`, { message: reply, ...(admin ? { status } : {}) }, async () => { await reload(); setReply(''); }); }}>
          <label className="block">Reply<textarea required maxLength={5000} rows={3} disabled={action.busy} value={reply} onChange={e => setReply(e.target.value)} className={inputClass} /></label>
          {admin && <label className="block">Ticket status<select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}><option value="open">Open</option><option value="resolved">Resolved</option></select></label>}
          <button disabled={action.busy} className={buttonClass}>Send reply{admin && status === 'resolved' ? ' & resolve' : ''}</button>
        </form>
      </>}</div>}
    </div>
    {action.message && <p role="status">{action.message}</p>}
  </section>;
}
