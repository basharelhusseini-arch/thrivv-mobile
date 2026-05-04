import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAdminAccess } from '@/lib/gym-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { gym_id: string } },
) {
  const access = await checkAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const membershipStart =
    typeof body?.membership_start_date === 'string' && body.membership_start_date
      ? body.membership_start_date
      : null;

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'A valid member email is required' },
      { status: 400 },
    );
  }
  if (membershipStart && !/^\d{4}-\d{2}-\d{2}$/.test(membershipStart)) {
    return NextResponse.json(
      { error: 'membership_start_date must be YYYY-MM-DD' },
      { status: 400 },
    );
  }

  // Confirm gym exists
  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('id', params.gym_id)
    .maybeSingle();
  if (!gym) {
    return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
  }

  const update: Record<string, any> = { gym_id: params.gym_id };
  if (membershipStart) update.membership_start_date = membershipStart;

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .ilike('email', email)
    .select('id, email, gym_id, membership_start_date')
    .maybeSingle();

  if (error) {
    console.error('admin/gyms assign failed', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign user' },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: `No user found with email ${email}` },
      { status: 404 },
    );
  }

  return NextResponse.json({ user: data });
}
