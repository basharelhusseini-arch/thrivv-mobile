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
export async function POST(request: NextRequest, { params }: Context) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403, headers });
  const access = await checkAdminAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status, headers });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers }); }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body?.userId || '') || typeof body?.grant !== 'boolean') {
    return NextResponse.json({ error: 'A valid account ID and action are required' }, { status: 400, headers });
  }
  const { error } = await supabase.rpc('thrivv_set_gym_operator', { p_actor: access.user.id, p_gym: params.gym_id, p_user: body.userId, p_grant: body.grant });
  if (error) return NextResponse.json({ error: 'Unable to update access. Check the account ID and gym, then retry.' }, { status: 503, headers });
  return NextResponse.json({ ok: true }, { headers });
}
