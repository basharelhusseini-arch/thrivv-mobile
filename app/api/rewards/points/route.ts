import { gymRewardStatus } from '@/lib/gym-reward-status';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { getRewardTier } from '@/lib/reward-points';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // These account-scoped reads are independent; avoid serial database round trips.
    const [daily, balance, history, redemptions, offers, transactions] = await Promise.all([
      gymRewardStatus(user.id),
      supabase.from('users').select('reward_points').eq('id', user.id).single(),
      supabase.from('reward_history').select('date, health_score, points_earned').eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }).limit(30),
      supabase.from('reward_redemptions').select('id,offer_id,points,status,created_at,discount_code,expires_at,offer_snapshot,reward_offers(name)')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.rpc('thrivv_reward_catalog', { p_actor: user.id, p_admin: false }),
      supabase.from('reward_transactions').select('id,kind,amount,score_date,created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    ]);
    if (balance.error || !balance.data || redemptions.error || offers.error || transactions.error) {
      throw new Error('Unable to read current reward account');
    }
    const points = Number(balance.data.reward_points) || 0;
    const tier = getRewardTier(points);
    return NextResponse.json({
      daily, points,
      offers: daily.redemptionEnabled ? offers.data || [] : [],
      redemptions: redemptions.data || [],
      transactions: transactions.data || [],
      tier: tier.tier, nextTier: tier.nextTier, pointsToNext: tier.pointsToNext, tierColor: tier.color,
      history: history.data || [],
    }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Reward points error:', error);
    return NextResponse.json({ error: 'Failed to fetch reward points' }, { status: 500 });
  }
}
