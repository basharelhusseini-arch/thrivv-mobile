import { NextRequest, NextResponse } from 'next/server';
import { checkGymAccess } from '@/lib/gym-auth';
import { supabase } from '@/lib/supabase';
import { newInvitation } from '@/lib/gym-invitations';
export async function POST(request: NextRequest, { params }: { params: { gym_id: string } }) {
  const access = await checkGymAccess(params.gym_id);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const { token, hash } = newInvitation();
  const { error } = await supabase.from('gym_invitations').insert({ token_hash: hash,
    gym_id: params.gym_id, created_by: access.user.id, expires_at: new Date(Date.now()+7*86400000).toISOString() });
  if (error) return NextResponse.json({ error: 'Unable to create invitation' }, { status: 503 });
  return NextResponse.json({ path: `/join/${token}`, expiresInDays: 7 });
}
