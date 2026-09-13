import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { actor, bodyOf, handled, HttpError, json, textField } from '@/lib/admin/http';
export const dynamic = 'force-dynamic';
export function GET() { return handled(async () => {
  const user = await actor(false); const { data, error } = await supabase.from('gym_access_requests').select('id,gym_name,location,applicant_role,status,review_reason,created_at').eq('applicant_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) throw error; return json({ requests: data });
}); }
export function POST(req: NextRequest) { return handled(async () => {
  const user = await actor(false); const b = await bodyOf(req);
  const { data, error } = await supabase.rpc('thrivv_request_gym', { p_user: user.id, p_request: b.requestId, p_name: textField(b.gymName, 'Gym name', 1, 120), p_location: textField(b.location, 'Location', 1, 200), p_role: textField(b.role, 'Your role', 1, 120) });
  if (error) throw new HttpError(409, 'Request not submitted. You may already have a pending request or have reached the daily limit.');
  return json({ id: data }, 201);
}); }
