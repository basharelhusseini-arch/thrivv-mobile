'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowUpRight, Trophy, Wallet } from 'lucide-react';
import PageHeader from '@/components/MemberPageHeader';
import DashboardJourney from '@/components/DashboardJourney';
import type { JourneyActivity, JourneyRewards } from '@/lib/dashboard-journey';
import MemberNextAction from '@/components/MemberNextAction';
import { useClientSession } from '@/lib/client-session';
import { ensureWhoopAutoSync } from '@/lib/whoop/auto-sync';
import type { VerificationStatus } from '@/lib/member-journey';

type Score = { date: string; score: number | null; subtotal: number; complete: boolean };
type Snapshot = { score: Score | null; average: number | null; history: Score[]; coverage: number; expected: number; provisional: boolean };
type Board = { hasGym: boolean; currentRank: number | null; rankedCount: number; weekStart: string; weekEnd: string; leaderboard: { id: string; name: string; rank: number; score: number; scored_days: number }[] };
export default function MemberDashboardPage() {
  const { user } = useClientSession();
  const [activity,setActivity]=useState<JourneyActivity | null>(null);
  const [journeyRewards, setJourneyRewards] = useState<JourneyRewards | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [daily, setDaily] = useState<VerificationStatus | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setError('');
    const paths = ['/api/score/today', '/api/leaderboard', '/api/rewards/points','/api/member/activity'];
    const results = await Promise.allSettled(paths.map(async path => {
      const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Dashboard data unavailable');
      return response.json();
    }));
    if (results[0].status === 'fulfilled') setSnapshot(results[0].value); else setSnapshot(null);
    if (results[1].status === 'fulfilled') setBoard(results[1].value); else setBoard(null);
    if (results[2].status === 'fulfilled') { setJourneyRewards(results[2].value); setDaily(results[2].value.daily); setPoints(Number(results[2].value.points)); } else { setJourneyRewards(null); setDaily(null); setPoints(null); }
    if(results[3].status==='fulfilled')setActivity(results[3].value);else setActivity(null);
    if (results.some(r => r.status === 'rejected')) setError('Some of your activity is unavailable. Your saved progress is unchanged.');
    setLoading(false);
  }, []);
  useEffect(() => { if (user?.id) { void refresh(); void ensureWhoopAutoSync({ onSynced: refresh }); } }, [user?.id, refresh]);
  if (!user || loading) return <div role="status" className="flex min-h-[45vh] items-center justify-center gap-3 text-thrivv-text-secondary"><Activity size={20} className="text-thrivv-gold-500" />Loading your day…</div>;
  const name = user.firstName || user.email.split('@')[0];
  const history = (snapshot?.history || []).slice(0, 7).sort((a, b) => a.date.localeCompare(b.date));
  return <div className="member-future space-y-6" data-section="dashboard">
    <PageHeader section="dashboard" title={`Your day, ${name}.`} subtitle="A little consistency. A lot of progress." />
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{error}<button onClick={() => void refresh()} className="underline underline-offset-4">Retry</button></div>}
    {daily && <MemberNextAction data={daily} />}
    <DashboardJourney activity={activity} rewards={journeyRewards} />
    <section aria-label="Your points" className="grid gap-4 sm:grid-cols-2">
      <Link href="/member/rewards" className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-6"><div><p className="flex items-center gap-2 text-sm text-thrivv-text-secondary"><Wallet size={16} />Spendable balance</p><p className="mt-3 text-4xl font-semibold tracking-tight text-thrivv-gold-400">{points ?? '—'}<span className="ml-2 text-sm font-normal text-thrivv-text-muted">points</span></p></div><ArrowUpRight size={20} className="text-thrivv-text-muted group-hover:text-thrivv-gold-400" /></Link>
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6"><p className="text-sm text-thrivv-text-secondary">Credited today</p><p className="mt-3 text-4xl font-semibold tracking-tight text-white">{daily?.creditedPoints ?? '—'}<span className="ml-2 text-sm font-normal text-thrivv-text-muted">points</span></p><p className="mt-2 text-xs text-thrivv-text-muted">40 for a verified workout · up to 10 for habits</p></div>
    </section>
    <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      {daily?.whoopConnected ? <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6" aria-label="Your progress">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-white">Your Health Score</h2><Link href="/member/health" className="text-sm text-thrivv-gold-400">Details <span aria-hidden="true">↗</span></Link></div>
        <div className="mt-5 flex items-end gap-2"><span className="text-4xl font-semibold text-white">{snapshot?.score?.score ?? '—'}</span><span className="pb-1 text-sm text-thrivv-text-muted">/110</span></div>
        <p className="mt-2 text-xs text-thrivv-text-muted">{snapshot?.score && !snapshot.score.complete ? `Provisional components: ${snapshot.score.subtotal}/110. Waiting for verified data.` : 'Training, recovery and habits. Separate from spendable points.'}</p>
        <div className="mt-6 flex h-28 items-end gap-2" aria-label="Recent daily Health Scores">{history.length ? history.map(day => <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><div className="flex min-h-0 flex-1 items-end justify-center"><div className={`w-full max-w-9 rounded-t-md ${day.complete ? 'bg-gradient-to-t from-thrivv-gold-500/30 to-thrivv-gold-400' : 'bg-white/10'}`} style={{ height: day.complete && day.score !== null ? `${Math.max(3, day.score / 110 * 100)}%` : '3%' }} title={`${day.date}: ${day.complete ? day.score : 'Incomplete'}`} /></div><span className="text-[10px] text-thrivv-text-muted">{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</span></div>) : <p className="self-center text-sm text-thrivv-text-muted">Your weekly trend appears as scores become available.</p>}</div>
        <p className="mt-4 text-xs text-thrivv-text-muted">7-day average: {snapshot?.average ?? '—'} · {snapshot?.coverage ?? 0} of {snapshot?.expected ?? 7} complete days</p>
      </section>
      : <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6" aria-label="Your consistency"><h2 className="font-semibold">Your consistency</h2><dl className="mt-5 grid grid-cols-2 gap-5"><div><dt className="text-sm text-thrivv-text-secondary">Verified visit days</dt><dd className="mt-2 text-3xl">{activity?.visits ?? '—'}</dd><p className="text-xs text-thrivv-text-muted">All time · one per day</p></div><div><dt className="text-sm text-thrivv-text-secondary">This week</dt><dd className="mt-2 text-3xl">{activity?.weekDays ?? '—'}<span className="text-sm"> / 7 days</span></dd><p className="text-xs text-thrivv-text-muted">Week begins Monday</p></div><div><dt className="text-sm text-thrivv-text-secondary">Habits today</dt><dd className="mt-2 text-3xl">{activity?.todayHabits ?? '—'}</dd></div><div><dt className="text-sm text-thrivv-text-secondary">Days with habits this week</dt><dd className="mt-2 text-3xl">{activity?.habitDays ?? '—'}</dd></div></dl><div className="mt-6 flex flex-wrap gap-4 text-sm text-thrivv-gold-400"><Link href="/member/habits">Record habits ↗</Link><Link href="/member/wearables">Connect WHOOP anytime ↗</Link></div></section>}
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6" aria-label="Weekly gym leaderboard">
        <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold text-white"><Trophy size={18} className="text-thrivv-gold-400" />Your gym this week</h2>{board?.currentRank != null && <span className="rounded-full bg-thrivv-gold-500/10 px-3 py-1 text-sm text-thrivv-gold-400">You · #{board.currentRank}</span>}</div>
        <p className="mt-2 text-xs text-thrivv-text-muted">Weekly earned points · Everyone together · Spending does not affect rank</p>
        {board?.hasGym === false ? <p className="py-8 text-sm text-thrivv-text-secondary">Join a gym to see your community’s progress.</p> : board?.leaderboard.length ? <ol className="mt-5 space-y-1">{board.leaderboard.slice(0, 5).map(entry => <li key={entry.id} className={`flex items-center gap-3 rounded-xl p-3 text-sm ${entry.id === user.id ? 'bg-thrivv-gold-500/10' : ''}`}><span className="w-5 text-thrivv-text-muted">{entry.rank}</span><span className="min-w-0 flex-1 truncate text-white">{entry.name}{entry.id === user.id ? ' · You' : ''}</span><span className="font-medium tabular-nums text-thrivv-gold-400">{entry.score}</span></li>)}</ol> : <p className="py-8 text-sm text-thrivv-text-secondary">{board ? 'No verified points earned this week yet.' : 'Leaderboard temporarily unavailable.'}</p>}
        {board?.hasGym && <p className="mt-4 text-xs text-thrivv-text-muted">{board.rankedCount} ranked members · {board.weekStart} – {board.weekEnd}</p>}
      </section>
    </div>
  </div>;
}
