import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncMemberWorkouts } from '@/lib/whoop/sync';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
async function processQueue(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(provided) !== Buffer.byteLength(expected)
    || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('whoop_connections').select('id')
    .not('whoop_access_token', 'is', null).lte('next_sync_at', new Date().toISOString()).order('next_sync_at').limit(10);
  if (error) return NextResponse.json({ error: 'Queue unavailable' }, { status: 503 });
  const results = await Promise.allSettled((data || []).map(async member => {
    try { await syncMemberWorkouts(member.id); return member.id; }
    catch {
      // Durable, bounded retry on the next scheduler invocation; no busy retry loops.
      await supabase.from('whoop_connections').update({ next_sync_at: new Date(Date.now()+15*60000).toISOString() }).eq('id',member.id);
      throw new Error('Sync deferred');
    }
  }));
  const synced = results.filter(result => result.status === 'fulfilled').length;
  const deferred = results.length - synced;
  return NextResponse.json({ queued: results.length, synced, deferred });
}
export async function GET(request: NextRequest) { return processQueue(request); }
export async function POST(request: NextRequest) { return processQueue(request); }
