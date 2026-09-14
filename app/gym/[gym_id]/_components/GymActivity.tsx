'use client';
import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import useGymData from './useGymData';

type Cursor = { manual: number; whoop: number; through?: string };
type ActivityResult = { rows: { user_id: string; request_id: string; source: string; name: string; scanned_at: string; score_date: string; daily_credit: { points: number | null; status: string } }[]; has_more: boolean; next: Cursor; credits_available: boolean };
const creditLabels: Record<string, string> = { credited: 'Credited', review_required: 'Needs review', pending: 'Pending', verification_required: 'Verification required', not_credited: 'Not credited', unavailable: 'Unavailable' };

export default function GymActivity({ gymId }: { gymId: string }) {
  const [history, setHistory] = useState<Cursor[]>([{ manual: 0, whoop: 0 }]);
  const current = history[history.length - 1];
  const { data, error, retry } = useGymData<ActivityResult>(`/api/gym/${gymId}/activity?manual=${current.manual}&whoop=${current.whoop}${current.through ? `&through=${encodeURIComponent(current.through)}` : ''}`);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm text-thrivv-text-secondary">Accepted verifications only. Repeated or rejected scans aren’t recorded in this log. Times are shown in your device’s timezone.</p><button className="btn-ghost px-4 py-2 text-sm" onClick={() => { setHistory([{ manual: 0, whoop: 0 }]); retry(); }}>Refresh activity</button></div>
    <section className="dark-card overflow-hidden">
      {error ? <div className="p-6 space-y-3"><p role="alert">{error}</p><button onClick={retry} className="text-thrivv-gold-500 underline">Retry</button></div> : !data ? <p role="status" className="p-8 text-sm text-thrivv-text-secondary">Loading verified activity…</p> : !data.rows.length ? <div className="px-6 py-14 text-center"><ScanLine className="mx-auto mb-4 h-8 w-8 text-thrivv-gold-500" aria-hidden /><h2 className="text-lg font-semibold">Waiting for your first verification</h2><p className="mt-2 text-sm text-thrivv-text-secondary">When a member completes a workout and scans your QR, their accepted verification appears here.</p></div> : <>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Accepted gym workout verifications and daily reward totals</caption><thead className="bg-white/[0.02] text-xs text-thrivv-text-muted"><tr><th className="px-5 py-4 font-medium">Member / scan time</th><th className="px-5 py-4 font-medium">Workout source</th><th className="px-5 py-4 font-medium">Verification</th><th className="px-5 py-4 font-medium">Day’s credited points</th></tr></thead><tbody className="divide-y divide-white/5">{data.rows.map(row => <tr key={`${row.source}:${row.user_id}:${row.request_id}`} className="hover:bg-white/[0.02]"><td className="px-5 py-5"><p className="font-medium">{row.name}</p><p className="mt-1 whitespace-nowrap text-xs text-thrivv-text-muted">{new Date(row.scanned_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></td><td className="px-5 py-5 whitespace-nowrap text-thrivv-text-secondary">{row.source === 'manual' ? 'Manual workout' : 'WHOOP workout'}</td><td className="px-5 py-5"><span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs text-emerald-300">Verified</span></td><td className="px-5 py-5"><p className="font-medium text-thrivv-gold-500">{row.daily_credit.points === null ? '—' : row.daily_credit.points.toLocaleString()}</p><p className="mt-1 whitespace-nowrap text-xs text-thrivv-text-muted">{creditLabels[row.daily_credit.status] || 'Pending'} · {row.score_date}</p></td></tr>)}</tbody></table></div>
        <div className="flex items-center justify-between gap-4 border-t border-white/10 p-5 text-sm"><button className="btn-ghost px-3 py-2 disabled:opacity-40" disabled={history.length <= 1} onClick={() => setHistory(items => items.slice(0, -1))}>Newer</button><span className="text-thrivv-text-secondary">Page {history.length}</span><button className="btn-ghost px-3 py-2 disabled:opacity-40" disabled={!data.has_more} onClick={() => setHistory(items => [...items, data.next])}>Older</button></div>
      </>}
    </section>
    <p className="text-xs leading-relaxed text-thrivv-text-muted">Points show the member’s current credited total for that gym-local day, including habits and corrections. Several WHOOP workouts may share one daily total; the value is not an award for each scan.</p>
  </div>;
}
