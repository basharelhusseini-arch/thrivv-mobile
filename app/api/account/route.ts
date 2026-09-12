import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
export async function GET() {
  let user;
  try { user = await requireAuth(); }
  catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  const { data, error } = await supabase.from('users').select('first_name,last_name,email,gym_id').eq('id', user.id).single();
  if (error) return NextResponse.json({ error: 'Unable to load account' }, { status: 503 });
  let gym = null;
  if (data.gym_id) {
    const result = await supabase.from('gyms').select('id,name').eq('id', data.gym_id).single();
    if (result.error) return NextResponse.json({ error: 'Unable to load gym' }, { status: 503 });
    gym = result.data;
  }
  return NextResponse.json({ name: [data.first_name, data.last_name].filter(Boolean).join(' '), email: data.email, gym }, { headers: { 'Cache-Control': 'no-store' } });
}
