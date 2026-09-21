'use client';
import { useTranslation } from '@/lib/i18n/client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Sparkles, Zap, Flame, Footprints, Crown, Rocket, Star, Flag, Ticket } from 'lucide-react';
import { JOURNEY_LEVELS, journeyLevel, journeyReward, dailyEncouragement, type JourneyActivity, type JourneyRewards } from '@/lib/dashboard-journey';

const LEVEL_ICONS = [Zap, Flame, Footprints, Rocket, Star, Crown];

function DailyEncouragement({ timezone }: { timezone?: string }) {
  const { t, locale } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setMessage(dailyEncouragement(new Date(), timezone));
    update();
    const timer = window.setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [timezone]);
  return <div className="journey-boost">
    <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200"><span aria-hidden="true">✦</span> {t("Your daily boost")} <span className="rounded-full bg-violet-300/10 px-2 py-1 text-[9px] tracking-wider">{t("Fresh every day")}</span></p>
    <p className="max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl">{t(message ?? 'Your pace. Your path. Your progress.')}</p>
  </div>;
}

function Progress({ value, label }: { value: number; label: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="h-3 overflow-hidden rounded-full bg-white/10">
    <div className="h-full rounded-full bg-gradient-to-r from-thrivv-gold-600 via-thrivv-gold-400 to-amber-100 shadow-[0_0_18px_#d4af3740] motion-safe:transition-[width] motion-safe:duration-1000" style={{ width: `${percent}%` }} />
  </div>;
}
export default function DashboardJourney({ activity, rewards, timezone }: { activity: JourneyActivity | null; rewards: JourneyRewards | null; timezone?: string }) {
  const { t, locale } = useTranslation();
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const journey = activity ? journeyLevel(activity.visits) : null;
  const offer = rewards ? journeyReward(rewards) : null;
  const remaining = offer && rewards ? Math.max(0, offer.points - rewards.points) : 0;
  const LevelIcon = LEVEL_ICONS[(journey?.level ?? 1) - 1];
  const selected = JOURNEY_LEVELS[selectedMilestone ?? ((journey?.level ?? 1) - 1)];
  return <section aria-labelledby="journey-title" className="journey-world">
    <div className="journey-stars" aria-hidden="true" />
    <div className="journey-world-header"><h2 id="journey-title"><Sparkles size={15} /> {t("THRIVV JOURNEY")}</h2><span><span className="journey-live-dot" /> {t("YOUR STORY IN MOTION")}</span></div>
    <DailyEncouragement timezone={timezone} />
    {journey ? <>
      <div className="journey-adventure">
        <div className="journey-identity">
          <div className="journey-orbit" style={{ '--journey-angle': `${journey.percent * 3.6}deg` } as React.CSSProperties}>
            <div className="journey-orbit-core"><LevelIcon size={30} aria-hidden="true" /><span>{t("LEVEL")}</span><strong>{journey.level.toString().padStart(2, '0')}</strong></div>
            <span className="journey-orbit-spark" aria-hidden="true">✦</span>
          </div>
          <div className="journey-identity-copy"><span className="journey-eyebrow">{t("YOUR CURRENT CHAPTER")}</span><p className="journey-level-name">{t(journey.current.name)}<span className="text-thrivv-gold-300">.</span></p>
          <p className="journey-caption">{journey.visits === 0 ? t("Every legend starts with a first visit.") : t("{0} verified visit days. Look how far you’ve come.", { 0: journey.visits })}</p></div>
          <div className="journey-next"><div><span>{journey.next ? t("Next stop: {0}", { 0: t(journey.next.name) }) : t("Legend status achieved")}</span><strong>{journey.next ? t("{0} visits away", { 0: journey.remaining }) : t("You made it")}</strong></div><Progress value={journey.percent} label={journey.next ? t("Progress to {0}", { 0: t(journey.next.name) }) : 'Journey complete'} /></div>
        </div>
        <div className="journey-map-panel">
          <div className="journey-map-heading"><span><Flag size={14} /> {t("THE ROAD TO LEGEND")}</span><span>{t("Tap a milestone")}</span></div>
          <ol className="journey-map" aria-label={t("Visit milestones")}>{JOURNEY_LEVELS.map((level, index) => {
            const unlocked = journey.visits >= level.visits;
            const BadgeIcon = LEVEL_ICONS[index];
            const current = journey.level === index + 1;
            return <li key={t(level.name)} className={`journey-stop journey-stop-${index} ${unlocked ? 'is-unlocked' : ''} ${current ? 'is-current' : ''}`}>
              <button type="button" className="journey-node" onClick={() => setSelectedMilestone(index)} aria-pressed={(selectedMilestone ?? journey.level - 1) === index} aria-label={t("{0}, {1} visit days, {2}", { 0: t(level.name), 1: level.visits, 2: unlocked ? t('unlocked') : t('locked') })}>
                {current && <span className="journey-you">{t("YOU ARE HERE")}</span>}<BadgeIcon size={22} aria-hidden="true" />{unlocked && !current && <span className="journey-earned"><Check size={10} /></span>}
              </button>
              <span className="journey-stop-name">{t(level.name)}</span><span className="journey-stop-count">{level.visits === 0 ? t("Start here") : t("{0} days", { 0: level.visits })}</span>
            </li>;
          })}</ol>
          <p className="journey-map-detail" aria-live="polite"><Sparkles size={14} aria-hidden="true" /><span><strong>{t(selected.name)}</strong> · {journey.visits >= selected.visits ? t("Unlocked. This chapter is yours.") : t("{0} more verified visit days to unlock.", { 0: selected.visits - journey.visits })}</span></p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-thrivv-text-muted">{t("One verified visit per day. Your level stays with you when you spend points.")}</p>
    </> : <p className="py-8 text-sm text-thrivv-text-secondary">{t("Your journey is temporarily unavailable. Use Retry below to load your saved progress.")}</p>}
    <div className="journey-quests">
      <div className="journey-mission">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium text-white"><span className="journey-eyebrow">{t("WEEKLY QUEST")}</span><br />{t("This week’s mission")}</h3><span className="text-[10px] uppercase tracking-wider text-thrivv-text-muted">{t("Mon–Sun")}</span></div>
        {activity ? <><p className="mt-3 text-2xl font-semibold text-white">{Math.min(3, activity.weekDays)} <span className="text-sm font-normal text-thrivv-text-secondary">{t("/ 3 verified visit days")}</span></p>
          <div className="my-4 flex gap-2" aria-label={t("{0} of 3 weekly visits complete", { 0: Math.min(3, activity.weekDays) })}>{[1, 2, 3].map(n => <div key={n} className={`flex h-9 flex-1 items-center justify-center rounded-lg border ${activity.weekDays >= n ? 'border-thrivv-gold-400/30 bg-thrivv-gold-500/15 text-thrivv-gold-300' : 'border-white/10 text-thrivv-text-muted'}`}>{activity.weekDays >= n ? <Check size={16} aria-hidden="true" /> : <span className="text-xs">{n}</span>}</div>)}</div>
          <p className="text-xs leading-relaxed text-thrivv-text-secondary">{activity.weekDays >= 3 ? t("Mission complete. You showed up for you. Enjoy the win!") : t("Any three days count. Rest days fit the plan.")}</p>
          <Link href="/member/habits" className="mt-3 inline-flex items-center gap-2 text-xs text-thrivv-gold-300">{activity.habitDays >= 3 ? t("✓ Habit mission complete") : t("Side mission · {0}/3 days with habits", { 0: activity.habitDays })}<ArrowUpRight size={14} /></Link>
        </> : <p className="mt-4 text-sm text-thrivv-text-secondary">{t("Weekly progress is temporarily unavailable.")}</p>}
      </div>
      <div className="journey-ticket">
        <h3 className="flex items-center gap-2 text-sm font-medium text-white"><Ticket size={24} className="text-thrivv-gold-400" />{offer && remaining === 0 ? t("Ready to unlock") : t("Your next unlock")}</h3>
        {offer && rewards ? <><p className="mt-3 text-lg font-semibold text-white">{offer.name}</p><p className="mt-1 text-xs text-thrivv-text-secondary">{offer.partner_name}</p><div className="my-4"><Progress value={rewards.points / offer.points * 100} label={t("Points toward {0}", { 0: offer.name })} /></div><p className="text-xs text-thrivv-text-secondary">{remaining === 0 ? t("You have enough points. Choose your reward.") : t("{0} more points to reach this reward.", { 0: remaining })} <span className="text-thrivv-gold-300">{rewards.points} / {offer.points} {t("pts")}</span></p></> : <p className="mt-4 text-sm leading-relaxed text-thrivv-text-secondary">{rewards ? t("Keep building your balance. Your next reward will appear here when an eligible partner offer is available.") : t("Reward progress is temporarily unavailable. Your points are safe.")}</p>}
        <Link href="/member/rewards" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-thrivv-gold-300">{offer && remaining === 0 ? t("Choose reward") : t("Explore rewards")}<ArrowUpRight size={14} /></Link>
      </div>
    </div>
    <details className="mt-5 text-xs text-thrivv-text-muted"><summary className="w-fit cursor-pointer py-1 text-thrivv-text-secondary">{t("How your journey works")}</summary><p className="mt-2 max-w-2xl leading-relaxed">{t("Levels celebrate all-time gym visit days verified by QR, with or without a wearable. Weekly missions reset on Monday in your account timezone and do not award extra points. Your existing workout and habit rewards stay the same. Spending points changes reward progress, but never your visit level.")}</p></details>
  </section>;
}
