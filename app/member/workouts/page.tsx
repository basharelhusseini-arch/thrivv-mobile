'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Clock3, Dumbbell, Plus } from 'lucide-react';
import { WorkoutPlan } from '@/types';
import PageHeader from '@/components/MemberPageHeader';
import MemberNextAction from '@/components/MemberNextAction';
import LoggedWorkoutHistory from '@/components/LoggedWorkoutHistory';
import { useClientSession } from '@/lib/client-session';
import type { VerificationStatus } from '@/lib/member-journey';
export default function MemberWorkoutsPage() {
  const { user } = useClientSession();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [data, setData] = useState<VerificationStatus | null>(null);
  const [tab, setTab] = useState<'activity' | 'plans'>('activity');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setError('');
    const results = await Promise.allSettled([
      fetch('/api/member/workout-verification', { cache: 'no-store', signal: AbortSignal.timeout(12000) }),
      fetch(`/api/workout-plans?memberId=${encodeURIComponent(user.id)}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) }),
    ].map(async response => { const r = await response; if (!r.ok) throw new Error('Unavailable'); return r.json(); }));
    if (results[0].status === 'fulfilled') setData(results[0].value); else setData(null);
    if (results[1].status === 'fulfilled') setPlans(results[1].value); else setPlans([]);
    if (results.some(r => r.status === 'rejected')) setError('Some workout information could not be loaded. Please retry.');
    setLoading(false);
  }, [user?.id]);
  useEffect(() => { void refresh(); const sync = () => void refresh(); window.addEventListener('thrivv:workouts-synced', sync); return () => window.removeEventListener('thrivv:workouts-synced', sync); }, [refresh]);
  if (!user || loading) return <div role="status" className="flex min-h-[45vh] items-center justify-center gap-3 text-thrivv-text-secondary"><Dumbbell size={20} className="text-thrivv-gold-500" />Loading workouts…</div>;
  return <div className="member-future space-y-6" data-section="workouts">
    <PageHeader section="workouts" title="Every session counts." subtitle="Your activity, verification and training plans in one place." action={<Link href="/member/workouts/log" className="btn-primary inline-flex items-center gap-2 px-4 py-3 text-sm"><Plus size={16} />Log workout</Link>} />
    {error && <p role="alert" className="rounded-xl border border-amber-500/20 p-4 text-sm text-amber-200">{error} <button className="underline" onClick={() => void refresh()}>Retry</button></p>}
    <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.025] p-1" aria-label="Workout views">{(['activity', 'plans'] as const).map(value => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${tab === value ? 'bg-thrivv-gold-500 text-black' : 'text-thrivv-text-secondary hover:text-white'}`}>{value === 'activity' ? 'Your activity' : 'Training plans'}</button>)}</div>
    {tab === 'activity' ? <div className="space-y-6">
      <LoggedWorkoutHistory key={user.id} memberId={user.id} />
      {data && <MemberNextAction data={data} />}
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><h2 className="font-semibold text-white">Recent activity</h2><p className="mt-1 text-xs text-thrivv-text-muted">WHOOP workouts from the past seven days and today’s manual check-in</p>
        {data?.manual?.eligible && data.manual.checkedIn && <div className="mt-4 flex items-center gap-4 border-b border-white/10 py-4"><Dumbbell size={20} className="text-thrivv-gold-400" /><div className="min-w-0 flex-1"><h3 className="text-sm font-medium text-white">Manual workout</h3><p className="mt-1 text-xs text-thrivv-text-muted">{data.date}</p></div><span className={`text-xs ${data.manual.verified ? 'text-emerald-400' : 'text-thrivv-gold-400'}`}>{data.manual.verified ? 'Gym verified' : 'Ready to verify'}</span></div>}
        {data?.workouts.map(workout => <div key={workout.id} className="flex flex-wrap items-center gap-4 border-b border-white/10 py-5 last:border-b-0"><div className="rounded-xl border border-white/10 p-3"><Dumbbell size={18} className="text-thrivv-gold-400" /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-medium text-white">{workout.sport_name || 'WHOOP workout'}</h3><p className="mt-1 text-xs text-thrivv-text-muted">{new Date(workout.start_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: data.timezone })}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-thrivv-text-secondary">{workout.verified ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Clock3 size={13} />}{workout.status}</p></div>{typeof workout.workout_score === 'number' && <div className="text-right"><p className="text-lg font-semibold text-white">{workout.workout_score}</p><p className="text-[10px] text-thrivv-text-muted">Workout score</p></div>}</div>)}
        {data && !data.workouts.length && !data.manual?.checkedIn && <div className="py-10 text-center"><Dumbbell size={28} className="mx-auto mb-3 text-thrivv-text-muted" /><p className="text-sm text-thrivv-text-secondary">Your next workout starts your activity feed.</p></div>}
      </section>
    </div> : <section className="space-y-5" aria-label="Training plans"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-thrivv-text-secondary">{plans.length ? `${plans.length} saved ${plans.length === 1 ? 'plan' : 'plans'}` : 'Build a plan around your goals.'}</p><Link href="/workouts/new" className="btn-primary inline-flex items-center gap-2 px-4 py-3 text-sm"><Plus size={16} />Create a plan</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{plans.map(plan => <Link key={plan.id} href={`/workouts/${plan.id}`} className="group rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-thrivv-gold-500/40"><div className="mb-5 flex items-center justify-between"><Dumbbell size={20} className="text-thrivv-gold-400" /><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs capitalize text-thrivv-text-secondary">{plan.status}</span></div><h2 className="text-lg font-semibold text-white">{plan.name}</h2><p className="mt-2 line-clamp-2 text-sm text-thrivv-text-secondary">{plan.description}</p><p className="mt-5 text-xs text-thrivv-text-muted">{plan.duration} weeks · {plan.frequency} sessions/week</p><span className="mt-5 inline-flex items-center gap-2 text-sm text-thrivv-gold-400">View plan<ArrowUpRight size={15} /></span></Link>)}</div></section>}
  </div>;
}
