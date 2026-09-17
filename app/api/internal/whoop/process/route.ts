import { randomUUID, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncMemberWorkouts, SyncBusyError } from '@/lib/whoop/sync';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
async function processQueue(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(provided) !== Buffer.byteLength(expected)
    || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const lease = randomUUID(); const started = Date.now();
  let queued = 0, synced = 0, deferred = 0;
  // Three concurrent imports per wave; leases make overlapping invocations safe.
  // Stop claiming before the execution deadline. A crashed worker's lease expires.
  while (queued < 60 && Date.now() - started < 180000) {
    const { data, error } = await supabase.rpc('thrivv_claim_sync', { p_lease: lease, p_limit: 3 });
    if (error) return NextResponse.json({ error: 'Queue unavailable', queued, synced, deferred }, { status: 503 });
    if (!data?.length) break;
    queued += data.length;
    const results = await Promise.allSettled(data.map(async (member: {id: string}) => {
      let outcome = 'ok';
      try { await syncMemberWorkouts(member.id); }
      catch (e) { outcome = e instanceof SyncBusyError ? 'busy' : 'upstream_or_import_failed'; }
      const result = await supabase.rpc('thrivv_finish_sync', { p_user: member.id, p_lease: lease, p_outcome: outcome });
      if (result.error) throw new Error('Unable to acknowledge import');
      return outcome;
    }));
    synced += results.filter(r => r.status === 'fulfilled' && r.value === 'ok').length;
    deferred += results.filter(r => r.status === 'rejected' || r.value !== 'ok').length;
  }
  return NextResponse.json({ queued, synced, deferred });
}
export async function GET(request: NextRequest) { return processQueue(request); }
export async function POST(request: NextRequest) { return processQueue(request); }
