import { NextRequest } from 'next/server';
import { actor, bodyOf, handled, HttpError, json, textField, uuid } from '@/lib/admin/http';
import { supabase } from '@/lib/supabase';
export function GET() { return handled(async () => {
  await actor(); const {data,error} = await supabase.rpc('thrivv_sync_overview'); if(error) throw error; return json(data);
}); }
export function POST(req: NextRequest) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(req);
  if (!uuid(b.userId)) throw new HttpError(400, 'Invalid member');
  const {error} = await supabase.rpc('thrivv_retry_sync', {p_actor:user.id,p_user:b.userId,p_request:b.requestId,p_reason:textField(b.reason,'Reason',3,500)});
  if(error) throw new HttpError(409,'Could not queue retry. A sync may already be running.');
  return json({queued:true});
}); }
