import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { scoreContext, readScore } from '@/lib/daily-health-score';
/** Retain nutrition logging; food has no scoring or reward side effects. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(); const body = await request.json();
    if (!body.memberId || typeof body.totalCalories !== 'number' || !Number.isFinite(body.totalCalories) || body.totalCalories < 0) {
      return NextResponse.json({ error: 'memberId and valid totalCalories are required' }, { status: 400 });
    }
    const context = await scoreContext(user.id);
    // Partial upsert changes calories only; never overwrite concurrent habit completion.
    const { error } = await supabase.from('daily_checkins').upsert([{ user_id: user.id, date: context.today, calories: body.totalCalories }], { onConflict: 'user_id,date', defaultToNull: false });
    if (error) throw new Error('Unable to save nutrition');
    const score = await readScore(context);
    return NextResponse.json({ success: true, score, healthScore: score?.score ?? null, maxRawScore: 110,
      rewardPoints: { earned: 0, total: context.balance }, message: 'Nutrition saved. Food does not contribute to Health Score.' });
  } catch (e) { return NextResponse.json({ error: 'Unable to save nutrition' }, { status: e instanceof Error && e.message === 'Unauthorized' ? 401 : 503 }); }
}
