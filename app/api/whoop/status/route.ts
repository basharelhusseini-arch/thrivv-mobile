/**
 * GET /api/whoop/status
 *   Returns the current WHOOP connection state + latest synced
 *   day for the authenticated user. This is the read endpoint
 *   the /member/whoop page uses to render its "Connected /
 *   Last synced / Recovery / Strain / Sleep" surface against
 *   the real users + whoop_data tables (the older stub routes
 *   /api/whoop/connection and /api/whoop/data are an in-memory
 *   mock and only exist to avoid breaking any legacy caller).
 *
 * DELETE /api/whoop/status
 *   Disconnects WHOOP for the authenticated user by clearing
 *   every whoop_* column on the users row. No tokens are
 *   returned.
 *
 * Response shape (GET):
 *   {
 *     connected: boolean,
 *     connectedAt: string | null,
 *     lastSyncedAt: string | null,
 *     scoreSource: 'manual' | 'whoop' | 'hybrid' | null,
 *     latest: {
 *       date: string,
 *       recoveryScore: number | null,
 *       dayStrain: number | null,
 *       sleepEfficiencyPct: number | null,
 *       totalSleepMs: number | null,
 *     } | null
 *   }
 *
 * Tokens are never included.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { clearWhoopTokens } from '@/lib/whoop/oauth';

export async function GET() {
  let userId: string;
  try {
    const user = await requireAuth();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Connection state lives on users; never select tokens.
  const { data: userRow } = await supabase
    .from('whoop_connections')
    .select('whoop_connected_at, whoop_access_token')
    .eq('id', userId)
    .maybeSingle();

  const connectedRow = userRow as
    | { whoop_connected_at: string | null; whoop_access_token: string | null }
    | null;

  const connected = Boolean(
    connectedRow?.whoop_access_token && connectedRow?.whoop_connected_at
  );

  if (!connected) {
    return NextResponse.json({
      connected: false,
      connectedAt: null,
      lastSyncedAt: null,
      scoreSource: null,
      latest: null,
    });
  }

  // Latest synced day (if any) — never include raw_payload.
  const { data: latestRow } = await supabase
    .from('whoop_data')
    .select(
      'date, recovery_score, day_strain, sleep_efficiency_pct, total_sleep_ms, updated_at'
    )
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const latest = latestRow as
    | {
        date: string;
        recovery_score: number | null;
        day_strain: number | null;
        sleep_efficiency_pct: number | null;
        total_sleep_ms: number | null;
        updated_at: string | null;
      }
    | null;

  // Score source for the latest synced day so the page can show
  // "Score source: Hybrid" without redesigning anything.
  let scoreSource: string | null = null;
  if (latest?.date) {
    const { data: scoreRow } = await supabase
      .from('health_scores')
      .select('score_source')
      .eq('user_id', userId)
      .eq('date', latest.date)
      .maybeSingle();
    const sr = scoreRow as { score_source: string | null } | null;
    scoreSource = sr?.score_source ?? null;
  }

  return NextResponse.json({
    connected: true,
    connectedAt: connectedRow!.whoop_connected_at,
    lastSyncedAt: latest?.updated_at ?? null,
    scoreSource,
    latest: latest
      ? {
          date: latest.date,
          recoveryScore: latest.recovery_score,
          dayStrain: latest.day_strain,
          sleepEfficiencyPct: latest.sleep_efficiency_pct,
          totalSleepMs: latest.total_sleep_ms,
        }
      : null,
  });
}

export async function DELETE() {
  let userId: string;
  try {
    const user = await requireAuth();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await clearWhoopTokens(userId);
  return NextResponse.json({ success: true });
}
