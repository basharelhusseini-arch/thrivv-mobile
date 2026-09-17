'use client';
import { useEffect, useState } from 'react';
import { readJson, useAction, inputClass, buttonClass } from '@/components/SupportInbox';
import type { RewardReceipt } from '@/lib/rewards/catalog';
export default function RewardOperations() {
  const [rows, setRows] = useState<RewardReceipt[]>([]); const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0); const [status, setStatus] = useState(''); const [reference, setReference] = useState('');
  const [search, setSearch] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { const d = await readJson(`/api/admin/rewards/redemptions?offset=${offset}&status=${status}&reference=${encodeURIComponent(search)}`); setRows(d.redemptions); setTotal(d.total); setError(''); }
    catch (e) { setRows([]); setError(e instanceof Error ? e.message : 'Unavailable'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [offset, status, search]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="premium-card space-y-4 p-5"><h3 className="text-lg font-semibold">Redemption operations</h3>
    <p className="text-sm text-thrivv-text-secondary">Record confirmations received from the merchant. Issuing a code does not count as use. Replacements and refunds require a reason and confirmation reference.</p>
    <form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); setOffset(0); setSearch(reference.trim()); }}><input aria-label="Redemption reference" placeholder="Search full redemption reference" value={reference} onChange={e => setReference(e.target.value)} className={inputClass} /><button className={buttonClass}>Search</button></form>
    <select aria-label="Redemption status" value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }} className={inputClass}>{['','issued','fulfilled','rejected','expired','cancelled'].map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}</select>
    {error && <p role="alert">{error} <button onClick={() => void load()} className="underline">Retry</button></p>}
    {loading ? <p role="status">Loading redemptions…</p> : !rows.length ? <p>No matching redemptions.</p> : rows.map(r => <Resolution key={r.id} receipt={r} done={load} />)}
    <div className="flex items-center gap-4"><button disabled={loading || !offset} onClick={() => setOffset(offset - 25)} className={buttonClass}>Previous</button><span>{total} records</span><button disabled={loading || offset + 25 >= total} onClick={() => setOffset(offset + 25)} className={buttonClass}>Next</button></div>
  </section>;
}
function Resolution({ receipt: r, done }: { receipt: RewardReceipt; done: () => Promise<void> }) {
  const action = useAction(); const [choice, setChoice] = useState('used');
  const expired = r.status === 'issued' && r.expires_at && Date.parse(r.expires_at) <= Date.now();
  return <details className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer break-words">{r.offer_snapshot.name || r.offer_id} · {expired ? 'Expired' : r.status} · {r.points} points <span className="block break-all text-xs text-thrivv-text-muted">{r.id}</span></summary>
    {!['fulfilled','cancelled'].includes(r.status) && <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action.run('/api/admin/rewards/redemptions', { redemptionId: r.id, action: choice, reason: f.get('reason'), reference: f.get('reference') }, done); }}>
      <label className="block">Resolution<select aria-label="Resolution" className={inputClass} value={choice} onChange={e => setChoice(e.target.value)}><option value="used">Merchant confirmed use</option><option value="rejected">Merchant rejected code</option><option value="replace">Replace faulty code</option><option value="refund">Refund points and cancel</option></select></label>
      <label className="block">Merchant confirmation reference<input name="reference" required minLength={3} maxLength={200} className={inputClass} placeholder="Partner ticket or reconciliation reference" /></label>
      <label className="block">Reason<input name="reason" required minLength={3} maxLength={500} className={inputClass} /></label>
      {choice === 'refund' && <p className="text-sm">Returns {r.points} points once. Confirm the merchant has invalidated the old code.</p>}
      {choice === 'replace' && <p className="text-sm">Assigns another code at no point cost. Confirm the merchant has invalidated the faulty code.</p>}
      <button disabled={action.busy} className={buttonClass}>{action.busy ? 'Saving…' : 'Record resolution'}</button>
    </form>}{action.message && <p role="status">{action.message}</p>}
  </details>;
}
