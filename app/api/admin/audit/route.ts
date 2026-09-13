import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { actor, handled, json, pageOffset } from '@/lib/admin/http';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) { return handled(async () => {
  await actor(); const offset = pageOffset(req);
  const { data, error, count } = await supabase.from('admin_audit_events').select('id,actor_id,action,target_id,reason,before_data,after_data,created_at', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(offset, offset + 49);
  if (error) throw error; return json({ events: data, total: count, offset });
}); }
