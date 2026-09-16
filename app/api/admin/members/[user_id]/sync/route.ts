import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncDaily } from '@/lib/whoop/sync-daily';
import { withWhoopLock, SyncBusyError } from '@/lib/whoop/sync';
import { actor, bodyOf, handled, HttpError, json, textField, uuid } from '@/lib/admin/http';
export async function POST(req: NextRequest, props: { params: Promise<{ user_id: string }> }) {
  const params = await props.params;
  return handled(async () => {
    const admin = await actor(); const b = await bodyOf(req);
    if (!uuid(params.user_id)) throw new HttpError(400, 'Invalid member');
    const reason = textField(b.reason, 'Reason', 3, 500);
    const { data: connection, error: connectionError } = await supabase.from('whoop_connections').select('id,whoop_connected_at').eq('id', params.user_id).maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection?.whoop_connected_at) throw new HttpError(409, 'Member must connect WHOOP before retrying');
    const { data: started, error } = await supabase.rpc('thrivv_admin_sync_start', { p_actor: admin.id, p_request: b.requestId, p_user: params.user_id, p_reason: reason });
    if (error) throw new HttpError(409, 'Retry unavailable or within the five-minute cooldown');
    if (!started) return json({ status: 'already_requested' });
    let code = 'sync_failed'; let succeeded = false;
    try {
      // Admin retry is restricted to the existing current-day flow, without caller date overrides.
      const result = await withWhoopLock(params.user_id, () => syncDaily(new NextRequest(`${req.nextUrl.origin}/api/whoop/sync`), params.user_id));
      succeeded = result.ok; code = succeeded ? 'sync_completed' : `sync_http_${result.status}`;
    } catch (e) { code = e instanceof SyncBusyError ? 'sync_busy' : 'sync_failed'; }
    const saved = await supabase.from('admin_support_actions').update({ status: succeeded ? 'succeeded' : 'failed', result_code: code, finished_at: new Date().toISOString() }).eq('id', b.requestId).eq('actor_id', admin.id);
    if (saved.error) throw new HttpError(503, 'Sync outcome could not be recorded. Check status before retrying.');
    return json({ status: succeeded ? 'succeeded' : 'failed', code }, succeeded ? 200 : 409);
  });
}
