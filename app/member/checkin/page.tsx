'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, CheckCircle2, Dumbbell, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useClientSession } from '@/lib/client-session';
import { calculateHealthScoreV3 } from '@/lib/health-score-v3';
import type { VerificationStatus } from '@/lib/member-journey';
const habitOptions = [['sauna', 'Sauna'], ['steamRoom', 'Steam room'], ['iceBath', 'Ice bath'], ['coldShower', 'Cold shower'], ['meditation', 'Meditation'], ['stretching', 'Stretching']] as const;
type Habits = Record<typeof habitOptions[number][0], boolean>;
const emptyHabits: Habits = { sauna: false, steamRoom: false, iceBath: false, coldShower: false, meditation: false, stretching: false };
export default function CheckinPage() {
  const { user } = useClientSession();
  const [daily, setDaily] = useState<VerificationStatus | null>(null);
  const [habits, setHabits] = useState<Habits>(emptyHabits);
  const [didWorkout, setDidWorkout] = useState(false);
  const [calories, setCalories] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const habitScore = useMemo(() => calculateHealthScoreV3(null, null, habits).habit_score, [habits]);
  const refresh = useCallback(async () => {
    setError('');
    try {
      const responses = await Promise.all([fetch('/api/checkin/today', { cache: 'no-store', signal: AbortSignal.timeout(12000) }), fetch('/api/member/workout-verification', { cache: 'no-store', signal: AbortSignal.timeout(12000) })]);
      if (responses.some(response => !response.ok)) throw new Error('Today’s check-in could not be loaded. Please retry before making changes.');
      const [checkin, status] = await Promise.all(responses.map(response => response.json()));
      setDaily(status);
      if (checkin.checkin) { const current = checkin.checkin; setDidWorkout(current.did_workout); setCalories(current.calories?.toString() || ''); setSleepHours(current.sleep_hours?.toString() || ''); setHabits({ ...emptyHabits, ...current.habit_details }); }
    } catch (e) { setDaily(null); setError(e instanceof Error ? e.message : 'Unable to load check-in.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user?.id) void refresh(); }, [user?.id, refresh]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!daily || submitting) return; setSubmitting(true); setError(''); setSaved(false);
    try {
      const response = await fetch('/api/checkin/today', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ didWorkout, calories: Number(calories) || 0, sleepHours: Number(sleepHours) || 0, habits }), signal: AbortSignal.timeout(15000) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to save. Please retry.');
      setSaved(true);
      const statusResponse = await fetch('/api/member/workout-verification', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (statusResponse.ok) setDaily(await statusResponse.json());
      window.dispatchEvent(new Event('thrivv:workouts-synced'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please retry.'); }
    finally { setSubmitting(false); }
  }
  const change = () => setSaved(false);
  if (!user || loading) return <div role="status" className="flex min-h-[45vh] items-center justify-center gap-3 text-thrivv-text-secondary"><Activity size={20} className="text-thrivv-gold-500" />Loading your day…</div>;
  return <div className="mx-auto max-w-3xl space-y-6 pb-6">
    <PageHeader eyebrow="Daily check-in" title={daily?.manual?.eligible ? 'Make today count.' : 'Build your daily habits.'} subtitle="Small steps, recorded in one place." />
    {error && <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{error}{!daily && <button className="ml-2 underline" onClick={() => void refresh()}>Retry</button>}</p>}
    {saved && <section role="status" className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5"><h2 className="flex items-center gap-2 font-semibold text-emerald-300"><CheckCircle2 size={20} />Today’s check-in saved</h2><p className="mt-2 text-sm text-thrivv-text-secondary">{daily?.manual?.verified ? 'Your habits are saved. Your existing workout award is updated within the daily limit.' : daily?.manual?.eligible && didWorkout ? 'Your workout is logged. Scan your gym’s QR to verify it and claim your points.' : 'Your habits are recorded for today.'}</p><Link href={daily?.manual?.eligible && didWorkout && !daily.manual.verified ? '/member/scan-workout' : '/member/dashboard'} className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-3 text-sm">{daily?.manual?.eligible && didWorkout && !daily.manual.verified ? 'Continue to gym QR' : 'Back to Home'}<ArrowRight size={16} /></Link></section>}
    {daily && <form onSubmit={save} className="space-y-5">
      {daily.manual?.eligible ? <section className="rounded-2xl border border-thrivv-gold-500/25 bg-thrivv-gold-500/[0.04] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 font-semibold text-white"><Dumbbell size={18} className="text-thrivv-gold-400" />Today’s workout</h2><p className="mt-2 text-sm leading-relaxed text-thrivv-text-secondary">A completed workout and gym QR verification earns 40 spendable points. Habits add up to 10 more; maximum 50 per day.</p></div><span className="shrink-0 text-2xl font-semibold text-thrivv-gold-400">40<span className="ml-1 text-xs font-normal">pts</span></span></div><label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4"><input type="checkbox" checked={didWorkout} disabled={daily.manual.verified} onChange={event => { change(); setDidWorkout(event.target.checked); }} className="h-5 w-5 accent-[#d8bd7d]" /><span className="text-sm text-white">{daily.manual.verified ? 'Today’s workout is gym verified' : 'I completed a workout today'}</span></label>{!daily.gymId && <p className="mt-3 text-xs text-thrivv-text-secondary">You’ll need to <Link href="/member/account/join-gym" className="text-thrivv-gold-400 underline">join your gym</Link> before scanning.</p>}</section> : <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="font-semibold text-white">Your workouts come from WHOOP</h2><p className="mt-2 text-sm text-thrivv-text-secondary">Use this check-in for habits. Workout verification requires your imported WHOOP workout and your gym’s QR. WHOOP reward conversion is not activated yet.</p></section>}
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-white">Today’s habits</h2><span className="text-sm text-thrivv-gold-400">{habitScore.toFixed(1)} /10</span></div><div className="grid grid-cols-2 gap-3">{habitOptions.map(([key, label]) => <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${habits[key] ? 'border-thrivv-gold-500/40 bg-thrivv-gold-500/[0.07]' : 'border-white/10 bg-black/10 hover:border-white/20'}`}><input type="checkbox" checked={habits[key]} onChange={event => { change(); setHabits(previous => ({ ...previous, [key]: event.target.checked })); }} className="h-4 w-4 shrink-0 accent-[#d8bd7d]" /><span className="text-sm text-white">{label}</span></label>)}</div><p className="mt-4 text-xs leading-relaxed text-thrivv-text-muted">Each habit contributes equally. {daily.manual?.eligible ? 'Habit reward points are credited after gym workout verification.' : 'Habit points contribute to your Health Score.'}</p></section>
      <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><summary className="cursor-pointer text-sm font-medium text-thrivv-text-secondary">Optional personal tracking</summary><p className="mt-3 text-xs text-thrivv-text-muted">Calories and sleep hours do not add reward points. Use Nutrition for your meals and macros.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs text-thrivv-text-secondary">Calories<input type="number" min="0" max="10000" value={calories} onChange={event => { change(); setCalories(event.target.value); }} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label><label className="text-xs text-thrivv-text-secondary">Hours of sleep<input type="number" min="0" max="24" step="0.5" value={sleepHours} onChange={event => { change(); setSleepHours(event.target.value); }} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label></div><Link href="/member/nutrition" className="mt-4 inline-block text-sm text-thrivv-gold-400">Open Nutrition →</Link></details>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111411] p-5 sm:flex-row sm:items-center sm:justify-between"><div>{daily.manual?.eligible && didWorkout ? <><p className="text-sm font-medium text-white">{(40 + habitScore).toFixed(1)} potential reward points</p><p className="mt-1 text-xs text-thrivv-text-muted">{daily.manual.verified ? 'Updates the existing daily award.' : 'After successful gym QR verification.'}</p></> : <p className="text-sm text-thrivv-text-secondary">Your daily progress, saved to your account.</p>}</div><button type="submit" disabled={submitting || saved} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 disabled:opacity-50">{submitting ? <><Loader2 size={16} className="animate-spin" />Saving…</> : saved ? <><CheckCircle2 size={16} />Saved</> : 'Save check-in'}</button></div>
    </form>}
  </div>;
}
