'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Gift, Wallet } from 'lucide-react';
import PageHeader from '@/components/MemberPageHeader';
import { useClientSession } from '@/lib/client-session';
import type { VerificationStatus } from '@/lib/member-journey';
import RewardVoucher from '@/components/RewardVoucher';
import type { RewardOffer as Offer, RewardReceipt as Redemption } from '@/lib/rewards/catalog';
type Transaction = { id: string; kind: string; amount: number; score_date: string | null; created_at: string };
export default function RewardsPage() {
  const { user } = useClientSession();
  return user ? <RewardAccount key={user.id} /> : <div role="status" className="p-8 text-thrivv-text-secondary">Loading rewards…</div>;
}
function RewardAccount() {
  const { user } = useClientSession();
  const [data, setData] = useState<{ points: number; daily: VerificationStatus | null; dailyWarning?: string; offers: Offer[]; redemptions: Redemption[]; transactions: Transaction[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Redemption | null>(null);
  const [tab, setTab] = useState<'offers' | 'redemptions' | 'history'>('offers');
  const requests = useRef<Record<string, string>>({});
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/rewards/points', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Your rewards could not be loaded. Please retry.');
      const next = await response.json(); setData(next); setError(''); return true;
    } catch (e) { setData(null); setError(e instanceof Error ? e.message : 'Rewards are unavailable.'); return false; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user?.id) void refresh(); }, [user?.id, refresh]);
  async function redeem() {
    if (!selected || busy) return;
    if (navigator.onLine === false) { setError('Connect to the internet to redeem a reward. Redemptions cannot be queued offline.'); return; }
    const offer = selected; setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/rewards/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offerId: offer.id, requestId: requests.current[offer.id] ||= crypto.randomUUID() }), signal: AbortSignal.timeout(15000) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to redeem. Please retry.');
      setSelected(null); setTab('redemptions');
      setIssued(result.redemption);
      setMessage(result.redemption.discount_code ? 'Your reward is unlocked. Copy your discount code below.' : 'Your existing redemption is saved below.');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to redeem. Please retry.'); }
    finally { setBusy(false); }
  }
  if (!user || loading) return <div role="status" className="flex min-h-[45vh] items-center justify-center gap-3 text-thrivv-text-secondary"><Wallet size={20} className="text-thrivv-gold-500" />Loading rewards…</div>;
  const daily = data?.daily;
  return <div className="member-future space-y-6" data-section="rewards">
    <PageHeader section="rewards" title="Progress you can spend." subtitle="Your earned points, available offers and redemption receipts." />
    {error && <p role="alert" className="rounded-xl border border-amber-500/20 p-4 text-sm text-amber-200">{error} <button className="underline" onClick={() => void refresh()}>Retry</button></p>}
    {data?.dailyWarning && <p role="status" className="text-sm text-amber-200">{data.dailyWarning}</p>}
    {message && <p role="status" className="break-words rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">{message}</p>}
    {issued && tab === 'redemptions' && <RewardVoucher receipt={issued} />}
    <section aria-label="Points balance" className="relative overflow-hidden rounded-3xl border border-thrivv-gold-500/25 bg-gradient-to-br from-thrivv-gold-500/[0.08] to-[#0c0e0d] p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="flex items-center gap-2 text-sm text-thrivv-text-secondary"><Wallet size={16} />Spendable balance</p><p className="mt-3 text-5xl font-semibold tracking-tight text-thrivv-gold-400">{data?.points ?? '—'}<span className="ml-2 text-sm font-normal text-thrivv-text-muted">points</span></p></div><div><p className="text-2xl font-semibold text-white">+{daily?.creditedPoints ?? '—'}</p><p className="mt-1 text-xs text-thrivv-text-muted">Credited today</p></div></div>
      <p className="mt-5 border-t border-white/10 pt-4 text-sm text-thrivv-text-secondary">Earn 40 points for a workout verified with your gym QR, plus up to 10 for habits. Maximum 50 per day, with or without WHOOP.</p>
      {daily?.rewardStatus === 'review_required' && <p className="mt-3 text-sm text-amber-200">A points correction needs review. <Link href="/member/account/support" className="underline">Contact support</Link> before redeeming.</p>}
    </section>
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.025] p-1" aria-label="Reward views">{([{ id: 'offers', label: 'Available offers' }, { id: 'redemptions', label: 'My redemptions' }, { id: 'history', label: 'Point history' }] as const).map(item => <button key={item.id} onClick={() => { setTab(item.id); setSelected(null); }} aria-pressed={tab === item.id} className={`flex-1 whitespace-nowrap rounded-lg px-4 py-3 text-sm transition-colors ${tab === item.id ? 'bg-thrivv-gold-500 text-black font-medium' : 'text-thrivv-text-secondary hover:text-white'}`}>{item.label}</button>)}</div>
    {tab === 'offers' && <section aria-label="Available reward offers">
      {selected && <div className="mb-5 rounded-2xl border border-thrivv-gold-500/35 bg-thrivv-gold-500/5 p-5" role="region" aria-label="Confirm redemption"><h2 className="font-semibold text-white">Redeem {selected.name}?</h2><p className="mt-2 text-sm text-thrivv-text-secondary">{selected.points} points will be deducted. Your discount code will be revealed immediately and saved in My redemptions. One redemption per member for this offer.</p><p className="mt-2 whitespace-pre-wrap text-sm text-thrivv-text-secondary">{selected.terms}</p>{selected.expires_at && <p className="mt-2 text-xs text-thrivv-text-muted">Code expires {new Date(selected.expires_at).toLocaleString()}</p>}<div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} onClick={() => void redeem()} className="btn-primary px-5 py-3 text-sm disabled:opacity-50">{busy ? 'Unlocking your code…' : `Confirm · ${selected.points} points`}</button><button disabled={busy} onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-thrivv-text-secondary">Cancel</button></div></div>}
      {data?.offers.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.offers.map(offer => { const redeemed = data.redemptions.some(r => r.offer_id === offer.id && r.status !== 'cancelled'); const affordable = Number(data.points) >= Number(offer.points); return <article key={offer.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-6"><div className="mb-5 flex items-center justify-between"><Gift size={24} className="text-thrivv-gold-400" /><span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-300">{offer.available ? 'Available' : 'Out of codes'}</span></div><h2 className="mb-5 text-lg font-semibold text-white">{offer.name}</h2><p className="mb-2 text-sm text-thrivv-text-secondary">{offer.partner_name} · {offer.discount_percent}% off</p><p className="mb-4 whitespace-pre-wrap text-xs text-thrivv-text-muted">{offer.terms}</p>{offer.location_label && <p className="mb-4 text-xs text-thrivv-text-muted">{offer.location_label}</p>}<p className="mt-auto text-2xl font-semibold text-thrivv-gold-400">{offer.points}<span className="ml-1 text-xs font-normal text-thrivv-text-muted">points</span></p>{redeemed ? <button onClick={() => setTab('redemptions')} className="mt-5 rounded-xl border border-white/10 px-4 py-3 text-sm text-thrivv-text-secondary">View your redemption</button> : <button disabled={!affordable || !offer.available || busy} onClick={() => setSelected(offer)} className="btn-primary mt-5 px-4 py-3 text-sm disabled:opacity-50">{!offer.available ? 'Currently unavailable' : affordable ? 'Redeem & reveal code' : `${Math.max(0, Number(offer.points) - Number(data.points))} more points needed`}</button>}</article>; })}</div> : <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center"><Gift size={32} className="mx-auto text-thrivv-gold-400" /><h2 className="mt-4 text-lg font-semibold text-white">{data ? 'No offers available yet.' : 'Offers temporarily unavailable.'}</h2><p className="mx-auto mt-2 max-w-md text-sm text-thrivv-text-secondary">{data ? 'Partner offers will appear here when they are ready to redeem. Your earned points remain in your balance.' : 'Retry to load your current offers.'}</p></div>}
    </section>}
    {tab === 'redemptions' && <section aria-label="My redemptions" className="space-y-4">{data?.redemptions.length ? data.redemptions.filter(receipt => receipt.id !== issued?.id).map(receipt => <RewardVoucher key={receipt.id} receipt={receipt} />) : <div className="rounded-2xl border border-white/10 p-8 text-center text-sm text-thrivv-text-secondary">{data ? 'Your redemption receipts will be saved here.' : 'Redemptions temporarily unavailable.'}</div>}<p className="text-xs text-thrivv-text-muted">Your most recent 100 redemptions are shown.</p></section>}
    {tab === 'history' && <section aria-label="Point history" className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">{data?.transactions.length ? <ul className="divide-y divide-white/10">{data.transactions.map(transaction => <li key={transaction.id} className="flex items-center justify-between gap-3 py-4 text-sm"><div><p className="capitalize text-white">{transaction.kind.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-thrivv-text-muted">{transaction.score_date || new Date(transaction.created_at).toLocaleDateString()}</p></div><span className={Number(transaction.amount) > 0 ? 'text-thrivv-gold-400' : 'text-thrivv-text-secondary'}>{Number(transaction.amount) > 0 ? '+' : ''}{transaction.amount} points</span></li>)}</ul> : <p className="py-4 text-sm text-thrivv-text-secondary">{data ? 'No point transactions yet.' : 'Point history temporarily unavailable.'}</p>}<p className="mt-4 text-xs text-thrivv-text-muted">Latest 30 transactions. Opening balances are previously held points.</p></section>}
  </div>;
}
