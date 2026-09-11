import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncMemberWorkouts } from '@/lib/whoop/sync';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  if (process.env.WHOOP_BACKGROUND_SYNC_ENABLED !== 'true') return NextResponse.json({ error: 'Disabled' }, { status: 503 });
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(provided) !== Buffer.byteLength(expected)
    || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('whoop_connections').select('id')
    .not('whoop_access_token', 'is', null).lte('next_sync_at', new Date().toISOString()).order('next_sync_at').limit(1);
  if (error) return NextResponse.json({ error: 'Queue unavailable' }, { status: 503 });
  let synced = 0;
  for (const member of data || []) {
    try { await syncMemberWorkouts(member.id); synced++; }
    catch {
      // Durable, bounded retry on the next scheduler invocation; no busy retry loops.
      await supabase.from('whoop_connections').update({ next_sync_at: new Date(Date.now()+15*60000).toISOString() }).eq('id',member.id);
      return NextResponse.json({ error: 'Sync deferred' }, { status: 503 });
    }
  }
  return NextResponse.json({ synced });
}
