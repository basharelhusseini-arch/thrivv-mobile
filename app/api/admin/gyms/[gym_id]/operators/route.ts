import { actor, bodyOf, change, handled, HttpError, json, uuid } from '@/lib/admin/http';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/gym-auth';
import { supabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' };
type Context = { params: { gym_id: string } };
export async function GET(_request: NextRequest, { params }: Context) {
  const access = await checkAdminAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status, headers });
  const { data, error } = await supabase.from('gym_operators').select('user_id,assigned_at').eq('gym_id', params.gym_id).order('assigned_at');
  if (error) return NextResponse.json({ error: 'Operator assignments unavailable' }, { status: 503, headers });
  return NextResponse.json({ operators: data }, { headers });
}
export function POST(request: NextRequest, { params }: Context) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(request);
  if (!uuid(b.userId) || typeof b.grant !== 'boolean') throw new HttpError(400, 'Select a registered account');
  return json({ result: await change(user.id, b, b.grant ? 'operator.grant' : 'operator.revoke', params.gym_id, { user_id: b.userId }) });
}); }
