/**
 * POST /api/whoop/sync
 *
 * Sync yesterday's WHOOP data for the logged-in Thrivv user and
 * recompute the v2 health score for that date.
 *
 * Flow:
 *   1. requireAuth (custom JWT — see lib/auth.ts).
 *   2. Resolve a valid access token (refresh if expiring).
 *   3. Pull yesterday's recovery / sleep / cycle records.
 *   4. Defensively extract metrics + upsert whoop_data.
 *   5. Load yesterday's daily_checkins for habit / workout / food
 *      context (food + habits are always manual signals).
 *   6. Compute the v2 health score (Activity 50 / Recovery 15 /
 *      Sleep 15 / Food 20 / Habits 10 → 110 raw → 100 normalised).
 *   7. Upsert health_scores: write v2 score into the existing
 *      `score` column (the dashboard reads this), populate the new
 *      v2 component columns added by migration 017, keep the legacy
 *      whoop_*_points / habit_points / score_source columns from
 *      migration 016 in sync, and proportionally map the v2
 *      components into the NOT NULL legacy training/diet/sleep/
 *      habit_score columns so their CHECK constraints still pass.
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
import {
  calculateHealthScore,
  legacyColumnMapping,
} from '@/lib/health-score-v2';

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
  //    habits + workout + food for the v2 scorer; if no row exists
  //    we treat all manual fields as null (no penalty, no synthetic
  //    values).
  const { data: checkin } = await supabase
    .from('daily_checkins')
    .select('did_workout, sleep_hours, habits_completed, calories')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  const checkinRow = checkin as
    | {
        did_workout: boolean | null;
        sleep_hours: number | null;
        habits_completed: number | null;
        calories: number | null;
      }
    | null;

  // 6. v2 health score.
  const result = calculateHealthScore({
    whoop: {
      recoveryScore: recovery.recoveryScore,
      sleepPerformancePct: sleep.sleepPerformancePct,
      sleepEfficiencyPct: sleep.sleepEfficiencyPct,
      totalSleepMs: sleep.totalSleepMs,
      dayStrain: cycle.dayStrain,
    },
    manual: {
      didWorkout: checkinRow?.did_workout ?? null,
      sleepHours: checkinRow?.sleep_hours ?? null,
      habitsCompleted: checkinRow?.habits_completed ?? null,
      caloriesLogged: checkinRow?.calories ?? null,
    },
    date,
  });

  // 7. Upsert health_scores. We populate:
  //      - score (final 0..100)
  //      - the new v2 columns (migration 017)
  //      - the legacy whoop_*_points + habit_points + score_source
  //        columns (migration 016) for back-compat with anything
  //        still reading them
  //      - the legacy training/diet/sleep/habit_score columns via
  //        proportional mapping so their NOT NULL + CHECK
  //        constraints stay satisfied on a fresh insert.
  const legacy = legacyColumnMapping(result.componentBreakdown);

  const scorePayload: Record<string, unknown> = {
    user_id: userId,
    date,
    score: result.finalScore,
    training_score: legacy.training_score,
    diet_score: legacy.diet_score,
    sleep_score: legacy.sleep_score,
    habit_score: legacy.habit_score,
    activity_points: result.componentBreakdown.activity,
    recovery_points: result.componentBreakdown.recovery,
    sleep_points: result.componentBreakdown.sleep,
    recovery_sleep_points: result.componentBreakdown.recoverySleep,
    food_points: result.componentBreakdown.food,
    habit_points: result.componentBreakdown.habits,
    raw_score: result.rawScore,
    max_raw_score: result.maxRawScore,
    whoop_recovery_points: result.componentBreakdown.recovery,
    whoop_sleep_points: result.componentBreakdown.sleep,
    whoop_activity_points: result.componentBreakdown.activity,
    score_source: result.scoreSource,
  };

  const { error: scoreUpsertError } = await supabase
    .from('health_scores')
    .upsert(scorePayload, { onConflict: 'user_id,date' });

  if (scoreUpsertError) {
    console.error('health_scores upsert failed:', scoreUpsertError);
    return NextResponse.json(
      { error: 'Failed to store health score' },
      { status: 500 }
    );
  }

  // 8. Safe response — never include tokens or raw_payload.
  return NextResponse.json({
    success: true,
    date,
    healthScore: result.finalScore,
    scoreSource: result.scoreSource,
    rawScore: result.rawScore,
    maxRawScore: result.maxRawScore,
    componentBreakdown: result.componentBreakdown,
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
