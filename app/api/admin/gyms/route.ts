import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { actor, bodyOf, change, handled, json, pageOffset } from '@/lib/admin/http';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) { return handled(async () => {
  const user = await actor(); const { data, error } = await supabase.rpc('thrivv_admin_gyms', { p_actor: user.id, p_offset: pageOffset(req) });
  if (error) throw error; return json(data);
}); }
export function POST(req: NextRequest) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(req);
  return json({ gym: await change(user.id, b, 'gym.create', null, b) }, 201);
}); }
