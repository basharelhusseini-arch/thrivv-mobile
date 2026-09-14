'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, ArrowUpRight, CheckCircle, Watch } from 'lucide-react';
import PageHeader from '@/components/MemberPageHeader';
import { useClientSession } from '@/lib/client-session';

export default function WearablesPage() {
  const session = useClientSession();
  const userId = session.user?.id;
  const [connection, setConnection] = useState<{ connected: boolean; lastSyncedAt?: string } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setError('');
    fetch('/api/whoop/status', { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to check your connection.');
      if (!cancelled) setConnection(data);
    }).catch(() => { if (!cancelled) setError('Your WHOOP connection could not be checked.'); });
    return () => { cancelled = true; };
  }, [userId, retry]);
  return <div className="member-future space-y-6" data-section="wearables">
    <Link href="/member/account" className="inline-flex items-center gap-2 text-sm text-thrivv-text-secondary"><ArrowLeft size={16} /> Account</Link>
    <PageHeader section="wearables" title="Your effort. Connected." subtitle="Training, recovery and sleep from WHOOP, together in Thrivv." />
    {(error || session.status === 'error') && <div role="alert" className="premium-card p-4 text-sm">{error || session.error} <button className="underline" onClick={() => { session.refresh(); setRetry(value => value + 1); }}>Retry</button></div>}
    {session.status === 'unauthenticated' ? <Link href="/member/login?redirect=/member/wearables" className="btn-primary inline-block px-5 py-3">Sign in</Link> : <section className="premium-card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-thrivv-gold-500/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-thrivv-gold-500/30 bg-thrivv-gold-500/10"><Activity className="text-thrivv-gold-500" /></div><div><h2 className="text-2xl font-semibold">WHOOP</h2><p className="mt-1 text-sm text-thrivv-text-secondary">Your recorded activity, automatically imported.</p></div></div>
        {connection?.connected && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"><CheckCircle size={14} /> Connected</span>}
      </div>
      <div className="relative mt-6 flex flex-wrap gap-2 text-xs text-thrivv-text-secondary">{['Workout history', 'Strain', 'Recovery', 'Sleep'].map(label => <span key={label} className="rounded-full border border-white/10 px-3 py-1.5">{label}</span>)}</div>
      <div className="relative mt-7 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-thrivv-text-muted">{connection ? (connection.connected ? 'Manage your connection and sync activity.' : 'Connect once to bring in your WHOOP data.') : error ? 'Connection status unavailable.' : 'Checking connection…'}</p>
        <Link href="/member/whoop" className="btn-primary inline-flex items-center gap-2 px-5 py-3">{connection?.connected ? 'Manage WHOOP' : 'Open WHOOP'}<ArrowUpRight size={16} /></Link>
      </div>
    </section>}
    <section className="flex items-start gap-3 rounded-2xl border border-white/10 p-5 text-sm text-thrivv-text-secondary"><Watch className="shrink-0 text-thrivv-text-muted" size={20} /><div><h2 className="font-medium text-thrivv-text-primary">Coming later</h2><p className="mt-1">Garmin and Apple Health. We’ll show connection options when they’re available.</p></div></section>
  </div>;
}
