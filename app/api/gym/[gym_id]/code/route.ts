import { NextRequest, NextResponse } from 'next/server';
import { checkGymAccess } from '@/lib/gym-auth';
import { supabase } from '@/lib/supabase';
import { newGymCode } from '@/lib/gym-codes';
export async function POST(request: NextRequest, { params }: { params: { gym_id: string } }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const access = await checkGymAccess(params.gym_id);
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const { code, hash } = newGymCode();
  const { error } = await supabase.from('gym_join_codes').upsert({ gym_id: params.gym_id, code_hash: hash, created_by: access.user.id, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: 'Unable to create gym code' }, { status: 503 });
  return NextResponse.json({ code }, { headers: { 'Cache-Control': 'no-store' } });
}
