import { NextRequest, NextResponse } from 'next/server';
import { legacyMemberAccess, unavailableLegacyAction } from '@/lib/legacy-api-access';
import { supabase } from '@/lib/supabase';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const access = await legacyMemberAccess(params.get('memberId'));
  if (!access.ok) return access.response;
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  if ([startDate, endDate].some(value => value != null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) || (startDate && endDate && startDate > endDate)) {
    return NextResponse.json({ error: 'Use a valid date range (YYYY-MM-DD).' }, { status: 400, headers });
  }
  // Only measured fields are exposed, never raw payloads or credentials.
  let query = supabase.from('whoop_data')
    .select('id, date, recovery_score, day_strain, sleep_performance_pct, sleep_efficiency_pct, total_sleep_ms, resting_hr, updated_at')
    .eq('user_id', access.user.id).order('date', { ascending: false }).limit(366);
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'WHOOP data is temporarily unavailable.' }, { status: 503, headers });
  return NextResponse.json((data || []).map(row => ({
    id: row.id,
    memberId: access.user.id,
    date: row.date,
    recovery: row.recovery_score,
    strain: row.day_strain,
    sleep: row.total_sleep_ms == null ? null : {
      totalSleep: row.total_sleep_ms / 60000,
      sleepScore: row.sleep_performance_pct,
      sleepEfficiency: row.sleep_efficiency_pct,
    },
    heartRate: { resting: row.resting_hr },
    syncedAt: row.updated_at,
  })), { headers });
}

export async function POST(request: NextRequest) {
  return unavailableLegacyAction(request, 'WHOOP_SYNC_REQUIRED', 'Use Sync WHOOP from the Wearable page to import verified activity.');
}
