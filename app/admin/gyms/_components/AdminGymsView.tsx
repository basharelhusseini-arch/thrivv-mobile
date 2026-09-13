'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import GymJoinCode from '@/components/GymJoinCode';
import SupportInbox, { readJson, useAction, inputClass, buttonClass, Pager } from '@/components/SupportInbox';
const tabs = ['Overview', 'Gyms', 'Access requests', 'Members', 'Support', 'Audit history'];
function useData(url: string) {
  const [data, setData] = useState<any>(null); const [error, setError] = useState('');
  async function reload() { const d = await readJson(url); setData(d); setError(''); }
  useEffect(() => { let active = true; setData(null); setError(''); readJson(url).then(d => { if (active) setData(d); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [url]);
  return { data, error, reload };
}
function LoadState({ state }: { state: ReturnType<typeof useData> }) {
  return state.error ? <p role="alert">{state.error} <button className="underline" onClick={() => state.reload().catch(() => {})}>Retry</button></p> : !state.data ? <p>Loading…</p> : null;
}
function ActionStatus({ action }: { action: ReturnType<typeof useAction> }) { return action.message ? <p role="status" className="text-sm">{action.message}</p> : null; }
function Reason({ value, onChange }: { value: string; onChange: (s: string) => void }) { return <label className="block text-sm">Reason for this change<input required minLength={3} maxLength={500} className={inputClass} value={value} onChange={e => onChange(e.target.value)} /></label>; }
function confirmChange() { return window.confirm('Apply this change? It will be recorded in the administrator audit history.'); }
function UserPicker({ onSelect }: { onSelect: (u: any) => void }) {
  const [q, setQ] = useState(''); const [search, setSearch] = useState(''); const [offset, setOffset] = useState(0);
  const state = useData(`/api/admin/members?q=${encodeURIComponent(search)}&offset=${offset}`);
  return <div className="space-y-3">
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setSearch(q); setOffset(0); }}><input aria-label="Search member name or email" placeholder="Search name or email" className={inputClass} value={q} onChange={e => setQ(e.target.value)} /><button className={buttonClass}>Search</button></form>
    <LoadState state={state} />{state.data && <><ul className="max-h-72 overflow-auto space-y-2">{state.data.members.map((u: any) => <li key={u.id}><button type="button" className="w-full text-left p-3 rounded-xl bg-white/5 break-all" onClick={() => onSelect(u)}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Member'}<span className="block text-sm text-gray-400">{u.email}</span></button></li>)}</ul>{!state.data.total && <p>No matching accounts.</p>}<Pager offset={offset} total={state.data.total} setOffset={setOffset} /></>}
  </div>;
}
function GymPicker({ value, onChange, allowNone = false }: { value: string; onChange: (s: string) => void; allowNone?: boolean }) {
  const [offset, setOffset] = useState(0); const state = useData(`/api/admin/gyms?offset=${offset}`);
  return <div className="space-y-2"><LoadState state={state} />{state.data && <><label className="block text-sm">Choose gym<select required={!allowNone} className={inputClass} value={value} onChange={e => onChange(e.target.value)}><option value="">{allowNone ? 'No gym / remove assignment' : 'Select a gym'}</option>{state.data.gyms.map((g: any) => <option value={g.id} key={g.id}>{g.name}</option>)}</select></label><Pager offset={offset} total={state.data.total} setOffset={n => { setOffset(n); onChange(''); }} /></>}</div>;
}
export default function AdminGymsView() {
  const [tab, setTab] = useState('Overview');
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab'); if (t && tabs.includes(t)) setTab(t); }, []);
  return <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-7 min-w-0">
    <header className="glass-card p-6 sm:p-10 space-y-4"><p className="text-xs uppercase tracking-[0.28em] text-thrivv-gold-500">Thrivv / Platform administration</p><h1 className="text-3xl sm:text-5xl font-semibold tracking-tighter">Your gyms. One workspace.</h1><p className="text-thrivv-text-secondary">Manage gym access, assist members and review changes.</p><Link className="text-sm text-thrivv-gold-500 underline" href="/member/dashboard">Open member dashboard</Link></header>
    <nav aria-label="Administration sections" className="flex flex-wrap gap-2">{tabs.map(t => <button aria-current={tab === t ? 'page' : undefined} key={t} onClick={() => setTab(t)} className={tab === t ? buttonClass : 'btn-ghost px-4 py-3 text-sm'}>{t}</button>)}</nav>
    {tab === 'Overview' && <Overview />}{tab === 'Gyms' && <Gyms />}{tab === 'Access requests' && <AccessRequests />}{tab === 'Members' && <Members />}{tab === 'Support' && <SupportInbox admin />}{tab === 'Audit history' && <Audit />}
  </main>;
}
function Overview() {
  const state = useData('/api/admin/overview'); const d = state.data;
  const names: Record<string,string> = { gyms: 'Gyms', members: 'Registered accounts', gym_members: 'Gym members', active_members: 'Active gym members · 7 days', connected: 'WHOOP connections', stale_syncs: 'Stale or missing syncs', failed_support_syncs: 'Failed support retries · 7 days', pending_requests: 'Pending owner requests', open_tickets: 'Open support tickets' };
  return <section className="space-y-5"><LoadState state={state} />{d && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(names).map(([key, name]) => <div key={key} className="premium-card p-6"><p className="text-sm text-gray-400">{name}</p><p className="mt-3 text-4xl text-thrivv-gold-500">{d[key]}</p></div>)}</div><p className="text-sm text-gray-400">{d.activityDefinition}</p><p className="text-sm text-gray-400">{d.syncDefinition}</p><div className="premium-card p-6"><h2 className="font-semibold">Reward accounting · Unavailable</h2><p>{d.rewards.reason} Points adjustments remain disabled.</p></div></>}</section>;
}
function GymForm({ gym, done }: { gym?: any; done: () => Promise<void> }) {
  const [name, setName] = useState(gym?.name || ''); const [email, setEmail] = useState(gym?.owner_email || ''); const [timezone, setTimezone] = useState(gym?.timezone || 'UTC');
  const [start, setStart] = useState(gym?.pilot_start_date || ''); const [cohort, setCohort] = useState(gym?.pilot_member_count || 0); const [reason, setReason] = useState(''); const action = useAction();
  return <form className="premium-card p-5 space-y-3" onSubmit={e => { e.preventDefault(); if (confirmChange()) action.run(gym ? `/api/admin/gyms/${gym.id}` : '/api/admin/gyms', { name, owner_email: email, timezone, pilot_start_date: start, pilot_member_count: cohort, reason }, async () => { await done(); if (!gym) { setName(''); setEmail(''); setReason(''); } }, gym ? 'PATCH' : 'POST'); }}>
    <h3 className="text-lg font-semibold">{gym ? 'Edit gym details' : 'Create a gym'}</h3>
    <label className="block">Gym name<input required maxLength={120} className={inputClass} value={name} onChange={e => setName(e.target.value)} /></label>
    <label className="block">Contact email<input required type="email" maxLength={254} className={inputClass} value={email} onChange={e => setEmail(e.target.value)} /></label><p className="text-xs text-gray-400">A contact email does not grant dashboard access.</p>
    <label className="block">Timezone<input required className={inputClass} placeholder="Asia/Dubai" value={timezone} onChange={e => setTimezone(e.target.value)} /></label>
    <label className="block">Pilot start date<input type="date" className={inputClass} value={start} onChange={e => setStart(e.target.value)} /></label>
    <label className="block">Pilot member count<input type="number" min={0} step={1} className={inputClass} value={cohort} onChange={e => setCohort(Number(e.target.value))} /></label><Reason value={reason} onChange={setReason} />
    <button disabled={action.busy} className={buttonClass}>Save gym</button><ActionStatus action={action} />
  </form>;
}
function Gyms() {
  const [offset, setOffset] = useState(0); const state = useData(`/api/admin/gyms?offset=${offset}`); const [selected, setSelected] = useState<any>(null);
  return <section className="space-y-5"><div className="grid gap-5 xl:grid-cols-2"><div className="premium-card p-5 space-y-4"><h2 className="text-xl">All gyms</h2><LoadState state={state} />{state.data && <><ul className="space-y-3">{state.data.gyms.map((g: any) => <li key={g.id} className="rounded-xl bg-white/5 p-4 space-y-2"><p className="text-lg">{g.name}</p><p className="text-sm">{g.member_count} members · {g.timezone}</p><div className="flex flex-wrap gap-4"><Link className="text-thrivv-gold-500 underline" href={`/gym/${g.id}/dashboard`}>Open dashboard</Link><button className="underline" onClick={() => setSelected(g)}>Edit & manage access</button></div></li>)}</ul>{!state.data.total && <p>No gyms yet.</p>}<Pager offset={offset} total={state.data.total} setOffset={setOffset} /></>}</div><GymForm done={state.reload} /></div>
    {selected && <section className="space-y-5"><h2 className="text-2xl">Manage {selected.name}</h2><GymForm key={selected.id} gym={selected} done={state.reload} /><Operators gymId={selected.id} /><GymJoinCode gymId={selected.id} /></section>}
  </section>;
}
function Operators({ gymId }: { gymId: string }) {
  const state = useData(`/api/admin/gyms/${gymId}/operators`); const [selected, setSelected] = useState<any>(null); const [reason, setReason] = useState(''); const action = useAction();
  function update(id: string, grant: boolean) { if (reason.trim().length < 3) { action.setMessage('Enter a reason first.'); return; } if (confirmChange()) action.run(`/api/admin/gyms/${gymId}/operators`, { userId: id, grant, reason }, state.reload); }
  return <section className="premium-card p-5 space-y-4"><h3 className="text-xl">Gym management accounts</h3><p className="text-sm text-gray-400">Choose a registered account. Access is limited to this gym; platform-admin permissions are unchanged.</p><UserPicker onSelect={setSelected} />{selected && <p className="break-all">Selected: {selected.email} <button disabled={action.busy} className="underline" onClick={() => update(selected.id, true)}>Grant gym access</button></p>}<Reason value={reason} onChange={setReason} /><LoadState state={state} />{state.data && <ul className="space-y-3">{state.data.operators.map((u: any) => <li key={u.user_id} className="flex flex-wrap gap-3"><span className="break-all">{u.user_id}</span><button disabled={action.busy} className="underline" onClick={() => update(u.user_id, false)}>Revoke</button></li>)}</ul>}<ActionStatus action={action} /></section>;
}
function AccessRequests() {
  const [offset, setOffset] = useState(0); const state = useData(`/api/admin/access-requests?offset=${offset}`);
  return <section className="space-y-4"><h2 className="text-2xl">Owner access requests</h2><p className="text-sm text-gray-400">Verify the applicant before approval. Create a gym in the Gyms tab first if needed.</p><LoadState state={state} />{state.data && <>{state.data.requests.map((r: any) => <RequestCard key={r.id} request={r} reload={state.reload} />)}{!state.data.total && <p>No requests yet.</p>}<Pager offset={offset} total={state.data.total} setOffset={setOffset} /></>}</section>;
}
function RequestCard({ request: r, reload }: { request: any; reload: () => Promise<void> }) {
  const [gym, setGym] = useState(''); const [reason, setReason] = useState(''); const [applicant, setApplicant] = useState<any>(null); const action = useAction();
  function decide(decision: string) { if (reason.trim().length < 3 || (decision === 'approve' && !gym)) { action.setMessage('Enter a reason and select a gym for approval.'); return; } if (confirmChange()) action.run('/api/admin/access-requests', { id: r.id, decision, gymId: gym || null, reason }, reload); }
  return <article className="premium-card p-5 space-y-3"><h3 className="text-xl">{r.gym_name} · {r.status}</h3><p>{r.location} · {r.applicant_role}</p><p className="text-xs break-all">Applicant: {r.applicant_id}</p><button className="underline" onClick={() => readJson(`/api/admin/members?id=${r.applicant_id}`).then(d => setApplicant(d.member)).catch(e => action.setMessage(e.message))}>Inspect applicant account</button>{applicant && <p className="break-all">{applicant.first_name} {applicant.last_name} · {applicant.email}</p>}{r.status === 'pending' ? <><GymPicker value={gym} onChange={setGym} /><Reason value={reason} onChange={setReason} /><div className="flex gap-4"><button disabled={action.busy} className={buttonClass} onClick={() => decide('approve')}>Approve for selected gym</button><button disabled={action.busy} className="underline" onClick={() => decide('reject')}>Reject</button></div></> : <p>{r.review_reason}</p>}<ActionStatus action={action} /></article>;
}
function Members() {
  const [id, setId] = useState(''); return <section className="grid gap-6 xl:grid-cols-2"><div className="premium-card p-5 space-y-4"><h2 className="text-2xl">Members & accounts</h2><UserPicker onSelect={u => setId(u.id)} /></div>{id && <MemberDetails key={id} id={id} />}</section>;
}
function MemberDetails({ id }: { id: string }) {
  const state = useData(`/api/admin/members?id=${id}`); const d = state.data;
  const [gym, setGym] = useState(''); const [start, setStart] = useState(new Date().toISOString().slice(0, 10)); const [reason, setReason] = useState(''); const action = useAction();
  return <section className="premium-card p-5 space-y-5 min-w-0"><LoadState state={state} />{d && <>
    <h3 className="text-xl">{d.member.first_name} {d.member.last_name}</h3><p className="break-all">{d.member.email}</p><p className="text-sm break-all">Current gym: {d.member.gym_id || 'None'} · Since {d.member.membership_start_date || 'Unknown'}</p><p>Spendable balance: {d.member.reward_points ?? 'Unavailable'}</p>
    <details><summary className="cursor-pointer text-thrivv-gold-500">Correct gym assignment</summary><form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); if (confirmChange()) action.run(`/api/admin/gyms/${gym || 'none'}/assign`, { userId: id, membership_start_date: start, reason }, state.reload); }}><GymPicker value={gym} onChange={setGym} allowNone /><label className="block">Membership start<input type="date" required={!!gym} max={new Date().toISOString().slice(0,10)} value={start} onChange={e => setStart(e.target.value)} className={inputClass} /></label><Reason value={reason} onChange={setReason} /><p className="text-sm text-gray-400">Historical scores and reward records will not be moved or recalculated.</p><button disabled={action.busy} className={buttonClass}>Confirm assignment correction</button></form></details>
    <h4 className="font-semibold">Health Scores · latest 30 days recorded</h4>{!d.scores.available ? <p>Score data unavailable.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Date','Health /110','Training /80','Recovery /20','Habits /10','Status'].map(h => <th className="p-2 text-left" key={h}>{h}</th>)}</tr></thead><tbody>{(d.scores.data || []).map((s: any) => <tr key={s.date}>{[s.date,s.score,s.training_score,s.recovery_score,s.habit_score,s.complete ? 'Complete' : 'Provisional'].map((v,i) => <td className="p-2" key={i}>{v ?? 'Missing'}</td>)}</tr>)}</tbody></table>{!d.scores.data?.length && <p>No recorded scores.</p>}</div>}
    <h4 className="font-semibold">Reward history · latest 30 records</h4>{!d.rewards.available ? <p>Reward history unavailable.</p> : <ul>{(d.rewards.data || []).map((r: any) => <li key={r.id}>{r.date}: {r.points_earned} points</li>)}</ul>}<p className="text-sm text-gray-400">{d.pointsAdjustments.reason} Full redemption history is unavailable until that integration is reconciled.</p><button disabled className={buttonClass}>Points adjustment unavailable</button>
    <h4 className="font-semibold">WHOOP sync</h4>{!d.sync.available ? <p>Sync status unavailable.</p> : <><p>{d.sync.data?.whoop_connected_at ? `Connected · Last sync: ${d.sync.data.last_sync_at || 'No completed sync recorded'}` : 'No connection recorded'}</p><p className="text-sm text-gray-400">A stale timestamp alone does not confirm a failure. Ask the member about their issue before retrying.</p><form className="space-y-3" onSubmit={e => { e.preventDefault(); if (confirmChange()) action.run(`/api/admin/members/${id}/sync`, { reason }, async () => { await state.reload(); }); }}><Reason value={reason} onChange={setReason} /><button disabled={action.busy || !d.sync.data?.whoop_connected_at} className={buttonClass}>Retry current-day sync</button></form></>}
    <h4 className="font-semibold">Recent support retries</h4>{!d.actions.available ? <p>Retry history unavailable.</p> : <ul className="text-sm space-y-2">{(d.actions.data || []).map((a: any) => <li key={a.id}>{a.created_at}: {a.status} · {a.result_code || 'Outcome not recorded yet'}<p>{a.reason}</p></li>)}</ul>}
    <details><summary>Membership history (recorded from activation)</summary>{!d.membershipHistory.available ? <p>History unavailable.</p> : <ul className="text-xs space-y-2 break-all">{(d.membershipHistory.data || []).map((h: any, i: number) => <li key={i}>{h.changed_at}: {h.old_gym_id || 'None'} → {h.new_gym_id || 'None'}</li>)}</ul>}</details><ActionStatus action={action} />
  </>}</section>;
}
function Audit() {
  const [offset, setOffset] = useState(0); const state = useData(`/api/admin/audit?offset=${offset}`);
  return <section className="space-y-4"><h2 className="text-2xl">Audit history</h2><p className="text-sm text-gray-400">Changes recorded from this feature’s activation. Previous actions are not reconstructed.</p><LoadState state={state} />{state.data && <><ul className="space-y-4">{state.data.events.map((e: any) => <li key={e.id} className="premium-card p-5 space-y-2 break-words"><strong>{e.action}</strong><p>{e.reason}</p><p className="text-xs break-all">{e.created_at} · Administrator {e.actor_id} · Record {e.target_id}</p><details><summary>Before and after</summary><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify({ before: e.before_data, after: e.after_data }, null, 2)}</pre></details></li>)}</ul>{!state.data.total && <p>No recorded actions yet.</p>}<Pager offset={offset} total={state.data.total} setOffset={setOffset} /></>}</section>;
}
