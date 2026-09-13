import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { actor, bodyOf, change, handled, HttpError, json, pageOffset, uuid } from '@/lib/admin/http';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) { return handled(async () => {
  await actor(); const offset = pageOffset(req);
  const { data, error, count } = await supabase.from('gym_access_requests').select('id,applicant_id,gym_name,location,applicant_role,status,review_reason,created_at', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(offset, offset + 49);
  if (error) throw error; return json({ requests: data, total: count, offset });
}); }
export function POST(req: NextRequest) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(req);
  if (!uuid(b.id) || !['approve', 'reject'].includes(b.decision) || (b.decision === 'approve' && !uuid(b.gymId))) throw new HttpError(400, 'Select the request, decision and gym');
  return json({ result: await change(user.id, b, `request.${b.decision}`, b.id, { gym_id: b.gymId }) });
}); }
