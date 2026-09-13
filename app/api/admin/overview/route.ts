import { supabase } from '@/lib/supabase';
import { actor, handled, json } from '@/lib/admin/http';
export const dynamic = 'force-dynamic';
export function GET() { return handled(async () => {
  const user = await actor(); const { data, error } = await supabase.rpc('thrivv_admin_overview', { p_actor: user.id });
  if (error) throw error;
  return json({ ...data, rewards: { available: false, reason: 'Reward accounting integration is not activated in this workspace.' }, activityDefinition: 'Current gym members with a check-in in the last seven UTC calendar days, on or after their recorded membership start. This is not attendance.', syncDefinition: 'Stale means connected with no successful sync in the last 24 hours. It does not establish a failure.' });
}); }
