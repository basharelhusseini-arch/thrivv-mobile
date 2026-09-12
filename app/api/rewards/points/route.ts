import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { getRewardTier } from '@/lib/reward-points';
import { dailyRewardStatus } from '@/lib/rewards/daily';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    // One database statement keeps balance, credited days and redemptions consistent.
    const { data, error } = await supabase.rpc('thrivv_reward_summary', { p_user: user.id });
    if (error || !data) throw new Error('Reward summary unavailable');
    const points = Number(data.points);
    if (!Number.isFinite(points)) throw new Error('Invalid balance');
    const enabled = process.env.DAILY_HEALTH_REWARDS_ENABLED === 'true' && data.enabled;
    const tier = getRewardTier(points);
    return NextResponse.json({ ...data, enabled, points,
      today: dailyRewardStatus(enabled, data.activationDate, data.date, data.healthScore, data.complete, data.creditedToday),
      tier: tier.tier, nextTier: tier.nextTier, pointsToNext: tier.pointsToNext, tierColor: tier.color,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Unauthorized';
    return NextResponse.json({ error: unauthorized ? 'Unauthorized' : 'Reward balance is unavailable. Please try again shortly.' },
      { status: unauthorized ? 401 : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
