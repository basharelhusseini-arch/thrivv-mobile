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
