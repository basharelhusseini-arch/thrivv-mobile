'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Gift, LockKeyhole, Sparkles, Trophy } from 'lucide-react';
import { JOURNEY_LEVELS, journeyLevel, journeyReward, type JourneyActivity, type JourneyRewards } from '@/lib/dashboard-journey';

function Progress({ value, label }: { value: number; label: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="h-2.5 overflow-hidden rounded-full bg-white/10">
    <div className="h-full rounded-full bg-gradient-to-r from-thrivv-gold-600 via-thrivv-gold-400 to-amber-100 shadow-[0_0_18px_#d4af3740] motion-safe:transition-[width] motion-safe:duration-1000" style={{ width: `${percent}%` }} />
  </div>;
}
export default function DashboardJourney({ activity, rewards }: { activity: JourneyActivity | null; rewards: JourneyRewards | null }) {
  const journey = activity ? journeyLevel(activity.visits) : null;
  const offer = rewards ? journeyReward(rewards) : null;
  const remaining = offer && rewards ? Math.max(0, offer.points - rewards.points) : 0;
  return <section aria-labelledby="journey-title" className="relative isolate overflow-hidden rounded-3xl border border-thrivv-gold-500/30 bg-gradient-to-br from-[#252219] via-[#141612] to-[#0c0e0d] p-5 sm:p-8">
    <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border-[32px] border-thrivv-gold-400/[0.04]" />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="journey-title" className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-thrivv-gold-400"><Sparkles size={16} />Thrivv Journey</h2>
      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-thrivv-text-secondary">Built one visit at a time</span>
    </div>
    {journey ? <>
      <div className="mt-7 flex items-center gap-4 sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-thrivv-gold-400/40 bg-thrivv-gold-500/10 shadow-[0_0_35px_#d4af3710] sm:h-24 sm:w-24"><span className="text-[9px] uppercase tracking-[0.2em] text-thrivv-gold-300">Level</span><span className="text-4xl font-semibold text-thrivv-gold-400">{journey.level.toString().padStart(2, '0')}</span></div>
        <div className="min-w-0"><p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{journey.current.name}</p><p className="mt-2 text-sm text-thrivv-text-secondary">{journey.visits === 0 ? 'Your first verified visit starts the story.' : `${journey.visits} verified visit ${journey.visits === 1 ? 'day' : 'days'}. Every one counts.`}</p></div>
      </div>
      <div className="mt-6"><div className="mb-3 flex flex-wrap justify-between gap-2 text-xs"><span className="text-thrivv-text-secondary">{journey.next ? `Next level · ${journey.next.name}` : 'Legend status achieved'} </span><span className="font-medium text-thrivv-gold-300">{journey.next ? `${journey.remaining} more ${journey.remaining === 1 ? 'visit' : 'visits'}` : 'All milestones unlocked'}</span></div><Progress value={journey.percent} label={journey.next ? `Progress to ${journey.next.name}` : 'Journey complete'} /></div>
      <ol aria-label="Visit milestones" className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">{JOURNEY_LEVELS.map((level, index) => {
        const unlocked = journey.visits >= level.visits;
        return <li key={level.name} aria-current={journey.level === index + 1 ? 'step' : undefined} className={`rounded-xl border p-3 text-center ${unlocked ? 'border-thrivv-gold-500/25 bg-thrivv-gold-500/[0.06]' : 'border-white/5 bg-black/10'}`}>
          {unlocked ? <Trophy size={16} aria-hidden="true" className="mx-auto mb-2 text-thrivv-gold-400" /> : <LockKeyhole size={16} aria-hidden="true" className="mx-auto mb-2 text-thrivv-text-muted" />}
          <p className={`text-xs font-medium ${unlocked ? 'text-thrivv-gold-300' : 'text-thrivv-text-secondary'}`}>{level.name}</p><p className="mt-1 text-[10px] text-thrivv-text-muted">{level.visits === 0 ? 'Your beginning' : `${level.visits} visit days`}</p><span className="sr-only">{unlocked ? 'Unlocked' : 'Locked'}</span>
        </li>;
      })}</ol>
      <p className="mt-3 text-[11px] text-thrivv-text-muted">One verified visit per day. Your level stays with you when you spend points.</p>
    </> : <p className="py-8 text-sm text-thrivv-text-secondary">Your journey is temporarily unavailable. Retry above to load your saved progress.</p>}
    <div className="mt-6 grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium text-white">This week’s mission</h3><span className="text-[10px] uppercase tracking-wider text-thrivv-text-muted">Mon–Sun</span></div>
        {activity ? <><p className="mt-3 text-2xl font-semibold text-white">{Math.min(3, activity.weekDays)} <span className="text-sm font-normal text-thrivv-text-secondary">/ 3 verified visit days</span></p>
          <div className="my-4 flex gap-2" aria-label={`${Math.min(3, activity.weekDays)} of 3 weekly visits complete`}>{[1, 2, 3].map(n => <div key={n} className={`flex h-9 flex-1 items-center justify-center rounded-lg border ${activity.weekDays >= n ? 'border-thrivv-gold-400/30 bg-thrivv-gold-500/15 text-thrivv-gold-300' : 'border-white/10 text-thrivv-text-muted'}`}>{activity.weekDays >= n ? <Check size={16} aria-hidden="true" /> : <span className="text-xs">{n}</span>}</div>)}</div>
          <p className="text-xs leading-relaxed text-thrivv-text-secondary">{activity.weekDays >= 3 ? 'Mission complete. Enjoy the win and make room for recovery.' : 'Any three days count. Rest days fit the plan.'}</p>
          <Link href="/member/habits" className="mt-3 inline-flex items-center gap-2 text-xs text-thrivv-gold-300">{activity.habitDays >= 3 ? '✓ Habit mission complete' : `Side mission · ${activity.habitDays}/3 days with habits`}<ArrowUpRight size={14} /></Link>
        </> : <p className="mt-4 text-sm text-thrivv-text-secondary">Weekly progress is temporarily unavailable.</p>}
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-white"><Gift size={16} className="text-thrivv-gold-400" />{offer && remaining === 0 ? 'A reward is within reach' : 'Your next reward'}</h3>
        {offer && rewards ? <><p className="mt-3 text-lg font-semibold text-white">{offer.name}</p><p className="mt-1 text-xs text-thrivv-text-secondary">{offer.partner_name}</p><div className="my-4"><Progress value={rewards.points / offer.points * 100} label={`Points toward ${offer.name}`} /></div><p className="text-xs text-thrivv-text-secondary">{remaining === 0 ? 'You have enough points. Choose your reward.' : `${remaining} more points to reach this reward.`} <span className="text-thrivv-gold-300">{rewards.points} / {offer.points} pts</span></p></> : <p className="mt-4 text-sm leading-relaxed text-thrivv-text-secondary">{rewards ? 'Keep building your balance. Your next reward will appear here when an eligible partner offer is available.' : 'Reward progress is temporarily unavailable. Your points are safe.'}</p>}
        <Link href="/member/rewards" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-thrivv-gold-300">{offer && remaining === 0 ? 'Choose reward' : 'Explore rewards'}<ArrowUpRight size={14} /></Link>
      </div>
    </div>
    <details className="mt-5 text-xs text-thrivv-text-muted"><summary className="w-fit cursor-pointer py-1 text-thrivv-text-secondary">How your journey works</summary><p className="mt-2 max-w-2xl leading-relaxed">Levels celebrate all-time gym visit days verified by QR, with or without a wearable. Weekly missions reset on Monday in your account timezone and do not award extra points. Your existing workout and habit rewards stay the same. Spending points changes reward progress, but never your visit level.</p></details>
  </section>;
}
