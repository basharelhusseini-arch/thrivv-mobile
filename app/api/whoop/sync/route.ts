import { scoreSnapshot } from '@/lib/daily-health-score';
import { withWhoopLock, importWorkouts, SyncBusyError } from '@/lib/whoop/sync';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  clearWhoopTokens,
  getValidAccessToken,
  isPermanentTokenFailure,
  loadWhoopTokens,
  persistWhoopTokens,
  refreshAccessToken,
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


/**
 * Calendar window for a given YYYY-MM-DD date in UTC. UTC is used
 * for consistency with the rest of the app (lib/auth.ts and check-in
 * routes both use `new Date().toISOString().split('T')[0]`).
 *
 * Default = today. The dashboard / check-in page auto-sync today so
 * the live score reflects this morning's WHOOP recovery + last
 * night's sleep + accumulating strain. Cron jobs can pass an
 * explicit `?date=YYYY-MM-DD` to backfill yesterday or older days.
 */
function getDateWindow(dateOverride?: string | null) {
  const baseDate = (() => {
    if (dateOverride && /^\d{4}-\d{2}-\d{2}$/.test(dateOverride)) {
      return new Date(`${dateOverride}T00:00:00.000Z`);
    }
    return new Date();
  })();

  const date = baseDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const start = `${date}T00:00:00.000Z`;

  const dayAfter = new Date(baseDate);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  const end = `${dayAfter.toISOString().split('T')[0]}T00:00:00.000Z`;

  return { date, start, end };
}

async function syncDaily(request: NextRequest, userId: string) {
  // 2. Tokens — short-circuit before talking to WHOOP if not connected.
  const tokenSnap = await loadWhoopTokens(userId);
  if (!tokenSnap.accessToken || !tokenSnap.refreshToken) {
    return NextResponse.json(
      { error: 'WHOOP is not connected' },
      { status: 400 }
    );
  }

  let accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    const after = await loadWhoopTokens(userId);
    // Permanent refresh failures clear tokens — user must OAuth again.
    if (!after.accessToken && !after.refreshToken) {
      return NextResponse.json(
        { error: 'WHOOP reconnect required' },
        { status: 401 }
      );
    }
    // Transient refresh failure — tokens retained; don't force consent.
    return NextResponse.json(
      {
        error:
          'WHOOP is temporarily unavailable; try again in a moment.',
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const { date, start, end } = getDateWindow(url.searchParams.get('date'));

  // 3. Pull WHOOP records — settle in parallel so one slow endpoint
  //    doesn't dominate. If any endpoint returns 401, try one forced
  //    refresh + retry before clearing tokens (handles races where the
  //    access token was revoked between refresh and fetch).
  let recoveryRaw: unknown = null;
  let sleepRaw: unknown = null;
  let cycleRaw: unknown = null;

  try {
    async function fetchTriplet(at: string) {
      let recovery: unknown = null;
      let sleep: unknown = null;
      let cycle: unknown = null;
      let unauthorized = false;

      const [recoveryRes, sleepRes, cycleRes] = await Promise.allSettled([
        fetchRecovery(at, start, end),
        fetchSleep(at, start, end),
        fetchCycle(at, start, end),
      ]);

      for (const r of [recoveryRes, sleepRes, cycleRes]) {
        if (
          r.status === 'rejected' &&
          r.reason instanceof WhoopUnauthorizedError
        ) {
          unauthorized = true;
        }
      }
      if (!unauthorized && [recoveryRes, sleepRes, cycleRes].some(r => r.status === 'rejected')) throw new Error('Incomplete WHOOP response');
      if (recoveryRes.status === 'fulfilled') recovery = recoveryRes.value;
      if (sleepRes.status === 'fulfilled') sleep = sleepRes.value;
      if (cycleRes.status === 'fulfilled') cycle = cycleRes.value;

      return { recovery, sleep, cycle, unauthorized };
    }

    let triple = await fetchTriplet(accessToken);

    if (triple.unauthorized) {
      const snap = await loadWhoopTokens(userId);
      if (snap.refreshToken) {
        try {
          const fresh = await refreshAccessToken(snap.refreshToken);
          await persistWhoopTokens(userId, fresh, snap.refreshToken);
          accessToken = fresh.access_token;
          triple = await fetchTriplet(fresh.access_token);
        } catch (e) {
          if (isPermanentTokenFailure(e)) {
            await clearWhoopTokens(userId);
            return NextResponse.json(
              { error: 'WHOOP reconnect required' },
              { status: 401 }
            );
          }
          return NextResponse.json(
            {
              error:
                'WHOOP is temporarily unavailable; try again in a moment.',
            },
            { status: 503 }
          );
        }
      }
    }

    if (triple.unauthorized) {
      await clearWhoopTokens(userId);
      return NextResponse.json(
        { error: 'WHOOP reconnect required' },
        { status: 401 }
      );
    }

    recoveryRaw = triple.recovery;
    sleepRaw = triple.sleep;
    cycleRaw = triple.cycle;
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

  const { data: previousWhoop, error: previousError } = await supabase
    .from('whoop_data')
    .select('recovery_score,hrv,resting_hr,sleep_performance_pct,sleep_efficiency_pct,total_sleep_ms,day_strain,kilojoules')
    .eq('user_id', userId).eq('date', date).maybeSingle();
  if (previousError) return NextResponse.json({ error: 'Unable to read previous WHOOP data' }, { status: 503 });
  // Missing/unscored fields must not erase previously verified measurements.
  recovery.recoveryScore ??= previousWhoop?.recovery_score ?? null;
  recovery.hrv ??= previousWhoop?.hrv ?? null;
  recovery.restingHr ??= previousWhoop?.resting_hr ?? null;
  sleep.sleepPerformancePct ??= previousWhoop?.sleep_performance_pct ?? null;
  sleep.sleepEfficiencyPct ??= previousWhoop?.sleep_efficiency_pct ?? null;
  sleep.totalSleepMs ??= previousWhoop?.total_sleep_ms ?? null;
  cycle.dayStrain ??= previousWhoop?.day_strain ?? null;
  cycle.kilojoules ??= previousWhoop?.kilojoules ?? null;

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

  await importWorkouts(userId, accessToken);
  const snapshot = await scoreSnapshot(userId);

  // 8. Safe response — never include tokens or raw_payload.
  return NextResponse.json({
    success: true,
    date,
    healthScore: snapshot.score?.score ?? null,
    scoreSource: 'whoop',
    rawScore: snapshot.score?.subtotal ?? null,
    maxRawScore: 110,
    componentBreakdown: snapshot.score,

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

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireAuth(); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try { return await withWhoopLock(user.id, () => syncDaily(request, user.id)); }
  catch (error) {
    return NextResponse.json({ error: error instanceof SyncBusyError ? 'Sync already running' : 'Sync failed; retry shortly' },
      { status: error instanceof SyncBusyError ? 409 : 503 });
  }
}
