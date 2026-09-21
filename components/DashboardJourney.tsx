'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Gift, Sparkles, Zap, Flame, Footprints, Crown, Rocket, Star } from 'lucide-react';
import { JOURNEY_LEVELS, journeyLevel, journeyReward, dailyEncouragement, type JourneyActivity, type JourneyRewards } from '@/lib/dashboard-journey';

const LEVEL_ICONS = [Zap, Flame, Footprints, Rocket, Star, Crown];

function DailyEncouragement({ timezone }: { timezone?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setMessage(dailyEncouragement(new Date(), timezone));
    update();
    const timer = window.setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [timezone]);
  return <div className="relative mb-7 border-b border-white/10 pb-6">
    <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200"><span aria-hidden="true">✦</span> Your daily boost <span className="rounded-full bg-violet-300/10 px-2 py-1 text-[9px] tracking-wider">Fresh every day</span></p>
    <p className="max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl">{message ?? 'Your pace. Your path. Your progress.'}</p>
  </div>;
}

function Progress({ value, label }: { value: number; label: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="h-3 overflow-hidden rounded-full bg-white/10">
    <div className="h-full rounded-full bg-gradient-to-r from-thrivv-gold-600 via-thrivv-gold-400 to-amber-100 shadow-[0_0_18px_#d4af3740] motion-safe:transition-[width] motion-safe:duration-1000" style={{ width: `${percent}%` }} />
  </div>;
}
export default function DashboardJourney({ activity, rewards, timezone }: { activity: JourneyActivity | null; rewards: JourneyRewards | null; timezone?: string }) {
  const journey = activity ? journeyLevel(activity.visits) : null;
  const offer = rewards ? journeyReward(rewards) : null;
  const remaining = offer && rewards ? Math.max(0, offer.points - rewards.points) : 0;
  const LevelIcon = LEVEL_ICONS[(journey?.level ?? 1) - 1];
  return <section aria-labelledby="journey-title" className="relative isolate overflow-hidden rounded-3xl border border-thrivv-gold-500/30 bg-gradient-to-br from-[#29213d] via-[#19191d] to-[#171e20] p-5 sm:p-8">
    <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border-[32px] border-thrivv-gold-400/[0.04]" />
    <div aria-hidden="true" className="pointer-events-none absolute -left-16 bottom-0 -z-10 h-64 w-64 rounded-full bg-cyan-300/[0.04] blur-3xl" />
    <DailyEncouragement timezone={timezone} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="journey-title" className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-thrivv-gold-400"><Sparkles size={16} />Thrivv Journey</h2>
      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-thrivv-text-secondary">Your next chapter awaits</span>
    </div>
    {journey ? <>
      <div className="mt-7 flex items-center gap-4 sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center relative -rotate-3 rounded-3xl border-2 border-thrivv-gold-400/60 bg-gradient-to-br from-thrivv-gold-400/25 to-amber-800/20 shadow-[0_0_35px_#d4af3720] sm:h-24 sm:w-24"><LevelIcon size={16} aria-hidden="true" className="absolute -right-2 -top-2 rounded-full bg-thrivv-gold-400 p-1 text-black box-content" /><span className="text-[9px] uppercase tracking-[0.2em] text-thrivv-gold-300">Level</span><span className="text-4xl font-semibold text-thrivv-gold-400">{journey.level.toString().padStart(2, '0')}</span></div>
        <div className="min-w-0"><p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{journey.current.name}</p><p className="mt-2 text-sm text-thrivv-text-secondary">{journey.visits === 0 ? 'First stop: your first verified visit. Let’s go!' : `${journey.visits} verified visit ${journey.visits === 1 ? 'day' : 'days'}. Every one counts.`}</p></div>
      </div>
      <div className="mt-6"><div className="mb-3 flex flex-wrap justify-between gap-2 text-xs"><span className="text-thrivv-text-secondary">{journey.next ? `Next level · ${journey.next.name}` : 'Legend status achieved'} </span><span className="font-medium text-thrivv-gold-300">{journey.next ? `${journey.remaining} more ${journey.remaining === 1 ? 'visit' : 'visits'}` : 'All milestones unlocked'}</span></div><Progress value={journey.percent} label={journey.next ? `Progress to ${journey.next.name}` : 'Journey complete'} /></div>
      <ol aria-label="Visit milestones" className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">{JOURNEY_LEVELS.map((level, index) => {
        const unlocked = journey.visits >= level.visits;
        const BadgeIcon = LEVEL_ICONS[index];
        return <li key={level.name} aria-current={journey.level === index + 1 ? 'step' : undefined} className={`relative rounded-2xl border p-3 text-center motion-safe:transition-transform motion-safe:hover:-translate-y-1 ${unlocked ? 'border-thrivv-gold-500/35 bg-gradient-to-b from-thrivv-gold-500/15 to-thrivv-gold-500/[0.03]' : 'border-white/5 bg-black/10'}`}>
          <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${unlocked ? 'bg-thrivv-gold-400/15 text-thrivv-gold-300' : 'bg-white/5 text-thrivv-text-muted'}`}><BadgeIcon size={20} aria-hidden="true" /></div>
          {journey.level === index + 1 && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-thrivv-gold-400 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-black">You are here</span>}
          <p className={`text-xs font-medium ${unlocked ? 'text-thrivv-gold-300' : 'text-thrivv-text-secondary'}`}>{level.name}</p><p className="mt-1 text-[10px] text-thrivv-text-muted">{level.visits === 0 ? 'Your beginning' : `${level.visits} visit days`}</p><span className="sr-only">{unlocked ? 'Unlocked' : 'Locked'}</span>
        </li>;
      })}</ol>
      <p className="mt-3 text-[11px] text-thrivv-text-muted">One verified visit per day. Your level stays with you when you spend points.</p>
    </> : <p className="py-8 text-sm text-thrivv-text-secondary">Your journey is temporarily unavailable. Use Retry below to load your saved progress.</p>}
    <div className="mt-6 grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-violet-300/20 bg-violet-400/[0.06] p-5">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium text-white"><span aria-hidden="true">⚡ </span>This week’s mission</h3><span className="text-[10px] uppercase tracking-wider text-thrivv-text-muted">Mon–Sun</span></div>
        {activity ? <><p className="mt-3 text-2xl font-semibold text-white">{Math.min(3, activity.weekDays)} <span className="text-sm font-normal text-thrivv-text-secondary">/ 3 verified visit days</span></p>
          <div className="my-4 flex gap-2" aria-label={`${Math.min(3, activity.weekDays)} of 3 weekly visits complete`}>{[1, 2, 3].map(n => <div key={n} className={`flex h-9 flex-1 items-center justify-center rounded-lg border ${activity.weekDays >= n ? 'border-thrivv-gold-400/30 bg-thrivv-gold-500/15 text-thrivv-gold-300' : 'border-white/10 text-thrivv-text-muted'}`}>{activity.weekDays >= n ? <Check size={16} aria-hidden="true" /> : <span className="text-xs">{n}</span>}</div>)}</div>
          <p className="text-xs leading-relaxed text-thrivv-text-secondary">{activity.weekDays >= 3 ? 'Mission complete. You showed up for you. Enjoy the win!' : 'Any three days count. Rest days fit the plan.'}</p>
          <Link href="/member/habits" className="mt-3 inline-flex items-center gap-2 text-xs text-thrivv-gold-300">{activity.habitDays >= 3 ? '✓ Habit mission complete' : `Side mission · ${activity.habitDays}/3 days with habits`}<ArrowUpRight size={14} /></Link>
        </> : <p className="mt-4 text-sm text-thrivv-text-secondary">Weekly progress is temporarily unavailable.</p>}
      </div>
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.04] p-5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-white"><Gift size={16} className="text-thrivv-gold-400" />{offer && remaining === 0 ? 'A reward is within reach' : 'Your next reward'}</h3>
        {offer && rewards ? <><p className="mt-3 text-lg font-semibold text-white">{offer.name}</p><p className="mt-1 text-xs text-thrivv-text-secondary">{offer.partner_name}</p><div className="my-4"><Progress value={rewards.points / offer.points * 100} label={`Points toward ${offer.name}`} /></div><p className="text-xs text-thrivv-text-secondary">{remaining === 0 ? 'You have enough points. Choose your reward.' : `${remaining} more points to reach this reward.`} <span className="text-thrivv-gold-300">{rewards.points} / {offer.points} pts</span></p></> : <p className="mt-4 text-sm leading-relaxed text-thrivv-text-secondary">{rewards ? 'Keep building your balance. Your next reward will appear here when an eligible partner offer is available.' : 'Reward progress is temporarily unavailable. Your points are safe.'}</p>}
        <Link href="/member/rewards" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-thrivv-gold-300">{offer && remaining === 0 ? 'Choose reward' : 'Explore rewards'}<ArrowUpRight size={14} /></Link>
      </div>
    </div>
    <details className="mt-5 text-xs text-thrivv-text-muted"><summary className="w-fit cursor-pointer py-1 text-thrivv-text-secondary">How your journey works</summary><p className="mt-2 max-w-2xl leading-relaxed">Levels celebrate all-time gym visit days verified by QR, with or without a wearable. Weekly missions reset on Monday in your account timezone and do not award extra points. Your existing workout and habit rewards stay the same. Spending points changes reward progress, but never your visit level.</p></details>
  </section>;
}
