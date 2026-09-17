import { reconcileDailyReward } from '@/lib/rewards/ledger';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { eligibleHabits } from '@/lib/health-score-v3';
import { scoreContext, saveDay } from '@/lib/daily-health-score';
import { withWhoopLock, SyncBusyError } from '@/lib/whoop/sync';
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    if (typeof body.didWorkout !== 'boolean' || [body.calories ?? 0, body.sleepHours ?? 0].some(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) {
      return NextResponse.json({ error: 'Invalid check-in measurements' }, { status: 400 });
    }
    {
      const context = await scoreContext(user.id);
      const habits = eligibleHabits(body.habits);
      const { data: checkin, error } = await supabase.from('daily_checkins').upsert({ user_id: user.id, date: context.today,
        did_workout: body.didWorkout, calories: body.calories ?? 0, sleep_hours: body.sleepHours ?? 0,
        habits_completed: Object.values(habits).filter(Boolean).length, habit_details: habits }, { onConflict: 'user_id,date' }).select().single();
      if (error) throw new Error('Unable to save check-in');
      // Check-ins and attendance rewards remain available during a wearable import.
      const score = await withWhoopLock(user.id, () => saveDay(context, context.today)).catch(() => null);
      let reward;
      try { reward = await reconcileDailyReward(user.id, context.today); }
      catch { reward = { status: 'retry_pending' }; }
      return NextResponse.json({ success: true, checkin, score, rewardPoints: { earned: reward?.earned ?? 0, total: reward?.total ?? context.balance }, rewardStatus: reward?.status });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof SyncBusyError ? 'WHOOP sync running; retry shortly' : 'Unable to save check-in' },
      { status: e instanceof SyncBusyError ? 409 : e instanceof Error && e.message === 'Unauthorized' ? 401 : 503 });
  }
}
export async function GET() {
  try {
    const user = await requireAuth(); const context = await scoreContext(user.id);
    const { data, error } = await supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('date', context.today).maybeSingle();
    if (error) throw new Error('Unable to read check-in');
    return NextResponse.json({ checkin: data, date: context.today });
  } catch (e) { return NextResponse.json({ error: 'Unable to load check-in' }, { status: e instanceof Error && e.message === 'Unauthorized' ? 401 : 503 }); }
}
