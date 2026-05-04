import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAdminAccess } from '@/lib/gym-auth';

export async function GET() {
  const access = await checkAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  const { data: gyms, error } = await supabase
    .from('gyms')
    .select('id, name, owner_email, pilot_start_date, pilot_member_count, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('admin/gyms list failed', error);
    return NextResponse.json({ error: 'Failed to load gyms' }, { status: 500 });
  }

  // Attach a member count per gym (single grouped query)
  const ids = (gyms || []).map((g) => g.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: memberRows } = await supabase
      .from('users')
      .select('gym_id')
      .in('gym_id', ids);
    for (const row of memberRows || []) {
      if (!row.gym_id) continue;
      counts.set(row.gym_id, (counts.get(row.gym_id) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    gyms: (gyms || []).map((g) => ({
      ...g,
      member_count: counts.get(g.id) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
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

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const ownerEmail =
    typeof body?.owner_email === 'string' ? body.owner_email.trim().toLowerCase() : '';
  const pilotStart =
    typeof body?.pilot_start_date === 'string' && body.pilot_start_date
      ? body.pilot_start_date
      : null;
  const pilotMemberCount =
    typeof body?.pilot_member_count === 'number' && body.pilot_member_count >= 0
      ? Math.floor(body.pilot_member_count)
      : 0;

  if (!name) {
    return NextResponse.json({ error: 'Gym name is required' }, { status: 400 });
  }
  if (!ownerEmail || !ownerEmail.includes('@')) {
    return NextResponse.json({ error: 'A valid owner email is required' }, { status: 400 });
  }
  if (pilotStart && !/^\d{4}-\d{2}-\d{2}$/.test(pilotStart)) {
    return NextResponse.json(
      { error: 'pilot_start_date must be YYYY-MM-DD' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('gyms')
    .insert({
      name,
      owner_email: ownerEmail,
      pilot_start_date: pilotStart,
      pilot_member_count: pilotMemberCount,
    })
    .select()
    .single();

  if (error) {
    console.error('admin/gyms create failed', error);
    return NextResponse.json({ error: error.message || 'Failed to create gym' }, { status: 500 });
  }

  return NextResponse.json({ gym: data }, { status: 201 });
}
