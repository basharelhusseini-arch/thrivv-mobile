import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { gymCodeHash } from '@/lib/gym-codes';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  let user;
  try { user = await requireAuth(); }
  catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  let hash;
  try { hash = gymCodeHash((await request.json()).code); }
  catch { return NextResponse.json({ error: 'Enter the complete gym code' }, { status: 400 }); }
  const { data, error } = await supabase.rpc('thrivv_join_gym_code', { p_user: user.id, p_hash: hash });
  if (error) return NextResponse.json({ error: 'Unable to join gym. Please retry.' }, { status: 503 });
  if (!data.ok) {
    const messages: Record<string, string> = { invalid: 'That gym code is invalid or has been replaced.', limited: 'Too many attempts. Try again in 15 minutes.', membership: 'You already belong to a gym. Contact your administrator to change gyms.' };
    return NextResponse.json({ error: messages[data.reason] || 'Unable to join gym' }, { status: data.reason === 'limited' ? 429 : 409 });
  }
  return NextResponse.json({ gym: data.gym }, { headers: { 'Cache-Control': 'no-store' } });
}
