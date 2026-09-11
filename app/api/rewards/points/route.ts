import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { getRewardTier } from '@/lib/reward-points';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();

    // Get user's reward points
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('reward_points')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('User error:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch reward points' },
        { status: 500 }
      );
    }

    const points = Number(userData.reward_points) || 0;
    const tier = getRewardTier(points);

    // Get recent reward history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: historyData } = await supabase
      .from('reward_history')
      .select('date, health_score, points_earned')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: false })
      .limit(30);

    const { data: redemptions, error: redemptionError } = await supabase
      .from('reward_redemptions').select('id,offer_id,status,created_at').eq('user_id', user.id);
    if (redemptionError) throw new Error('Unable to read redemptions');
    const { data: offers, error: offerError } = await supabase.from('reward_offers').select('id,points').eq('active', true);
    if (offerError) throw new Error('Unable to read offers');
    return NextResponse.json({
      offers: offers || [],
      redemptions: redemptions || [],
      points,
      tier: tier.tier,
      nextTier: tier.nextTier,
      pointsToNext: tier.pointsToNext,
      tierColor: tier.color,
      history: historyData || [],
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Reward points error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reward points' },
      { status: 500 }
    );
  }
}
