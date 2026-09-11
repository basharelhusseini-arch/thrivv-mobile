import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { invitationHash } from '@/lib/gym-invitations';
export async function POST(request: NextRequest) {
  let user;
  try { user = await requireAuth(); }
  catch { return NextResponse.json({ error: 'Sign in to join your gym' }, { status: 401 }); }
  let hash: string;
  try { hash = invitationHash((await request.json()).token); }
  catch { return NextResponse.json({ error: 'Invalid invitation' }, { status: 400 }); }
  const { data, error } = await supabase.rpc('thrivv_accept_invitation', { p_user: user.id, p_hash: hash });
  if (error) return NextResponse.json({ error: 'Invitation expired, invalid, or account already belongs to another gym' }, { status: 409 });
  return NextResponse.json({ gymId: data });
}
