import type { RewardOffer, RewardReceipt } from '@/lib/rewards/catalog';

export type JourneyActivity = { visits: number; weekDays: number; habitDays: number; todayHabits: number; weekStart: string };
export type JourneyRewards = { points: number; offers: RewardOffer[]; redemptions: Pick<RewardReceipt, 'offer_id' | 'status'>[] };
export const JOURNEY_LEVELS = [
  { name: 'Spark', visits: 0 }, { name: 'Momentum', visits: 5 },
  { name: 'Stride', visits: 15 }, { name: 'Force', visits: 30 },
  { name: 'Elite', visits: 60 }, { name: 'Legend', visits: 100 },
] as const;
export function journeyLevel(value: number) {
  const visits = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  let index = 0;
  for (let i = 1; i < JOURNEY_LEVELS.length; i++) if (visits >= JOURNEY_LEVELS[i].visits) index = i;
  const current = JOURNEY_LEVELS[index];
  const next = JOURNEY_LEVELS[index + 1] ?? null;
  return { visits, current, next, level: index + 1, remaining: next ? next.visits - visits : 0,
    percent: next ? (visits - current.visits) / (next.visits - current.visits) * 100 : 100 };
}
/** Only target offers this member can actually redeem, using the existing scoped catalog. */
export function journeyReward(data: JourneyRewards, now = Date.now()) {
  const redeemed = new Set(data.redemptions.filter(r => r.status !== 'cancelled').map(r => r.offer_id));
  return data.offers.filter(o => o.available === true && o.active !== false && Number.isFinite(o.points) && o.points > 0
    && !redeemed.has(o.id) && (!o.expires_at || new Date(o.expires_at).getTime() > now))
    .sort((a, b) => a.points - b.points || a.id.localeCompare(b.id))[0] ?? null;
}

// Original Thrivv encouragements: stable for the whole local day, no network request.
export const DAILY_ENCOURAGEMENTS = [
  'Small wins. Big future. Let’s build yours.',
  'You don’t need a perfect day. Just a little momentum.',
  'Every time you show up, you’re voting for future you.',
  'Your only competition? The version of you that almost skipped.',
  'Progress looks good on you. Keep going.',
  'One visit closer. One reason prouder.',
  'Rest, recharge, return. That’s progress too.',
  'Make today a tiny win worth celebrating.',
  'You’re building more than strength. You’re building belief.',
  'Start where you are. Your next chapter starts there too.',
  'Some days you push. Some days you recover. Both count.',
  'A little effort today is a gift to tomorrow’s you.',
  'Collect moments of “I did that.”',
  'Your pace. Your path. Your progress.',
  'The next level starts with one small step.',
  'You’ve got a whole journey ahead. Enjoy this part.',
  'Consistency is a collection of fresh starts.',
  'Show up for yourself. The rewards will follow.',
  'You don’t have to go all out to move forward.',
  'Turn “one day” into a small win today.',
  'Celebrate the effort. That’s where the magic starts.',
] as const;
export function dailyEncouragement(now = new Date(), timezone?: string) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now);
  }
  const value = (key: string) => Number(parts.find(p => p.type === key)?.value);
  const day = Math.floor(Date.UTC(value('year'), value('month') - 1, value('day')) / 86400000);
  return DAILY_ENCOURAGEMENTS[((day % DAILY_ENCOURAGEMENTS.length) + DAILY_ENCOURAGEMENTS.length) % DAILY_ENCOURAGEMENTS.length];
}
