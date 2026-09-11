import { supabase } from '@/lib/supabase';
import { dayStart, addDays } from '@/lib/score-calendar';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { scoreSnapshot } from '@/lib/daily-health-score';
export async function GET() {
  try {
    const user = await requireAuth(); const snapshot = await scoreSnapshot(user.id); const s = snapshot.score;
    const { data: workouts, error: workoutError } = await supabase.from('whoop_workouts')
      .select('id,start_at,duration_ms,sport_name,score_input_valid,workout_score,workout_breakdown')
      .eq('user_id', user.id).is('deleted_at', null).gte('start_at', dayStart(addDays(snapshot.date, -7), snapshot.timezone))
      .order('start_at', { ascending: false }).limit(100);
    if (workoutError) throw new Error('Unable to read workouts');
    const completeDates = new Set([...snapshot.history, ...(s ? [s] : [])].filter(r => r.complete).map(r => r.date));
    let streak = 0;
    while (streak < 8 && completeDates.has(addDays(snapshot.date, -streak))) streak++;
    return NextResponse.json({ streak, timezone: snapshot.timezone, workouts: workouts || [], score: s?.score ?? null, subtotal: s?.subtotal ?? null, complete: s?.complete ?? false,
      updatedAt: s?.updated_at ?? null, last7Days: snapshot.history.filter(r => r.complete).map(r => ({ ...r, sleep_score: r.recovery_score, diet_score: 0 })),
      components: { training: s?.training_score ?? null, recovery: s?.recovery_score ?? null, sleep: s?.recovery_score ?? null, habits: s?.habit_score ?? 0, diet: 0 },
      insights: ['Training uses your highest eligible WHOOP workout each day.', 'Sleep component — based on WHOOP Recovery. Recovery is the selected proxy, not a direct measure of sleep quality.', 'Food is excluded from Health Score in this phase.'],
      average: snapshot.average, coverage: snapshot.coverage, expected: snapshot.expected, provisional: snapshot.provisional,
      status: snapshot.status, lastSyncedAt: snapshot.lastSyncedAt });
  } catch (e) { return NextResponse.json({ error: 'Unable to load health summary' }, { status: e instanceof Error && e.message === 'Unauthorized' ? 401 : 503 }); }
}
