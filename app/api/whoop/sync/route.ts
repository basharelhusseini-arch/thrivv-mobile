/**
 * POST /api/whoop/sync
 *
 * Sync yesterday's WHOOP data for the logged-in Thrivv user and
 * recompute the hybrid health score for that date.
 *
 * Flow:
 *   1. requireAuth (custom JWT — see lib/auth.ts).
 *   2. Resolve a valid access token (refresh if expiring).
 *   3. Pull yesterday's recovery / sleep / cycle records.
 *   4. Defensively extract metrics + upsert whoop_data.
 *   5. Load yesterday's daily_checkins for habit / workout context.
 *   6. Compute the 100-scale hybrid health score.
 *   7. Upsert health_scores: write hybrid score into the existing
 *      `score` column (the dashboard reads this) and store the
 *      WHOOP-derived component breakdown in the additive
 *      whoop_*_points / habit_points / score_source columns added
 *      by migration 016. Existing manual breakdown columns stay
 *      untouched.
 *   8. Return a safe JSON summary — never tokens, never raw payload.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  clearWhoopTokens,
  getValidAccessToken,
  loadWhoopTokens,
} from '@/lib/whoop/oauth';
import {
  fetchCycle,
  fetchRecovery,
  fetchSleep,
  WhoopUnauthorizedError,
} from '@/lib/whoop/api';
import {
  extractCycle,
  extractRecovery,
  extractSleep,
} from '@/lib/whoop/extract';
import { calculateHybridHealthScore } from '@/lib/whoop/scoring';

/**
 * Yesterday's calendar window in UTC, returned as a YYYY-MM-DD
 * date string plus full ISO start/end timestamps for the WHOOP
 * query window. UTC is used for consistency with the rest of the
 * app (lib/auth.ts and check-in routes both use new Date()
 * .toISOString().split('T')[0]).
 */
function getYesterdayWindow() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const date = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
  const start = `${date}T00:00:00.000Z`;

  const dayAfter = new Date(yesterday);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  const end = `${dayAfter.toISOString().split('T')[0]}T00:00:00.000Z`;

  return { date, start, end };
}

export async function POST() {
  // 1. Auth.
  let userId: string;
  try {
    const user = await requireAuth();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Tokens — short-circuit before talking to WHOOP if not connected.
  const tokenSnap = await loadWhoopTokens(userId);
  if (!tokenSnap.accessToken || !tokenSnap.refreshToken) {
    return NextResponse.json(
      { error: 'WHOOP is not connected' },
      { status: 400 }
    );
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    // Refresh failed; getValidAccessToken has already cleared tokens.
    return NextResponse.json(
      { error: 'WHOOP reconnect required' },
      { status: 401 }
    );
  }

  const { date, start, end } = getYesterdayWindow();

  // 3. Pull WHOOP records — settle in parallel so one slow endpoint
  //    doesn't dominate. A 401 from any endpoint => clear tokens.
  let recoveryRaw: unknown = null;
  let sleepRaw: unknown = null;
  let cycleRaw: unknown = null;

  try {
    const [recoveryRes, sleepRes, cycleRes] = await Promise.allSettled([
      fetchRecovery(accessToken, start, end),
      fetchSleep(accessToken, start, end),
      fetchCycle(accessToken, start, end),
    ]);

    for (const r of [recoveryRes, sleepRes, cycleRes]) {
      if (r.status === 'rejected' && r.reason instanceof WhoopUnauthorizedError) {
        await clearWhoopTokens(userId);
        return NextResponse.json(
          { error: 'WHOOP reconnect required' },
          { status: 401 }
        );
      }
    }
    if (recoveryRes.status === 'fulfilled') recoveryRaw = recoveryRes.value;
    if (sleepRes.status === 'fulfilled') sleepRaw = sleepRes.value;
    if (cycleRes.status === 'fulfilled') cycleRaw = cycleRes.value;
  } catch (err) {
    console.error('WHOOP sync fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch WHOOP data' },
      { status: 502 }
    );
  }

  // 4. Defensively extract + upsert whoop_data.
  const recovery = extractRecovery(recoveryRaw);
  const sleep = extractSleep(sleepRaw);
  const cycle = extractCycle(cycleRaw);

  const whoopRow = {
    user_id: userId,
    date,
    recovery_score: recovery.recoveryScore,
    hrv: recovery.hrv,
    resting_hr: recovery.restingHr,
    sleep_performance_pct: sleep.sleepPerformancePct,
    sleep_efficiency_pct: sleep.sleepEfficiencyPct,
    total_sleep_ms: sleep.totalSleepMs,
    day_strain: cycle.dayStrain,
    kilojoules: cycle.kilojoules,
    raw_payload: {
      recovery: recoveryRaw,
      sleep: sleepRaw,
      cycle: cycleRaw,
    },
    updated_at: new Date().toISOString(),
  };

  const { error: whoopUpsertError } = await supabase
    .from('whoop_data')
    .upsert(whoopRow, { onConflict: 'user_id,date' });

  if (whoopUpsertError) {
    console.error('whoop_data upsert failed:', whoopUpsertError);
    return NextResponse.json(
      { error: 'Failed to store WHOOP data' },
      { status: 500 }
    );
  }

  // 5. Load yesterday's manual context. Daily check-ins drive
  //    habits + workout for the hybrid scorer; if no row exists we
  //    treat all manual fields as null (no penalty, no synthetic
  //    values).
  const { data: checkin } = await supabase
    .from('daily_checkins')
    .select('did_workout, sleep_hours, habits_completed')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  const checkinRow = checkin as
    | {
        did_workout: boolean | null;
        sleep_hours: number | null;
        habits_completed: number | null;
      }
    | null;

  // 6. Hybrid score.
  const result = calculateHybridHealthScore(
    {
      whoopRecovery: recovery.recoveryScore,
      whoopSleepPerformancePct: sleep.sleepPerformancePct,
      whoopSleepEfficiencyPct: sleep.sleepEfficiencyPct,
      whoopDayStrain: cycle.dayStrain,
      manualDidWorkout: checkinRow?.did_workout ?? null,
      manualSleepHours: checkinRow?.sleep_hours ?? null,
      manualHabitsCompleted: checkinRow?.habits_completed ?? null,
    },
    date
  );

  // 7. Upsert health_scores. We always write the new whoop_*_points
  //    / habit_points / score_source columns. The existing manual
  //    breakdown columns (training_score, diet_score, sleep_score,
  //    habit_score) are NOT NULL with CHECK constraints, so on a
  //    fresh insert we have to provide values; we read the
  //    previous row if any and re-use its manual columns to avoid
  //    clobbering them. If no prior row exists we default to 0.
  const { data: existingScore } = await supabase
    .from('health_scores')
    .select('training_score, diet_score, sleep_score, habit_score')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  const existing = existingScore as
    | {
        training_score: number | null;
        diet_score: number | null;
        sleep_score: number | null;
        habit_score: number | null;
      }
    | null;

  const scorePayload: Record<string, unknown> = {
    user_id: userId,
    date,
    score: result.score,
    training_score: existing?.training_score ?? 0,
    diet_score: existing?.diet_score ?? 0,
    sleep_score: existing?.sleep_score ?? 0,
    habit_score: existing?.habit_score ?? 0,
    whoop_recovery_points: result.components.recovery,
    whoop_sleep_points: result.components.sleep,
    whoop_activity_points: result.components.activity,
    habit_points: result.components.habits,
    score_source: result.source,
  };

  const { error: scoreUpsertError } = await supabase
    .from('health_scores')
    .upsert(scorePayload, { onConflict: 'user_id,date' });

  if (scoreUpsertError) {
    console.error('health_scores upsert failed:', scoreUpsertError);
    return NextResponse.json(
      { error: 'Failed to store hybrid health score' },
      { status: 500 }
    );
  }

  // 8. Safe response — never include tokens or raw_payload.
  return NextResponse.json({
    success: true,
    date,
    healthScore: result.score,
    scoreSource: result.source,
    componentBreakdown: result.components,
    inputsUsed: result.inputsUsed,
    whoopDataSummary: {
      recoveryScore: recovery.recoveryScore,
      hrv: recovery.hrv,
      restingHr: recovery.restingHr,
      sleepPerformancePct: sleep.sleepPerformancePct,
      sleepEfficiencyPct: sleep.sleepEfficiencyPct,
      totalSleepMs: sleep.totalSleepMs,
      dayStrain: cycle.dayStrain,
      kilojoules: cycle.kilojoules,
    },
  });
}
