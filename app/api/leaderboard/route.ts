import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
export async function GET() {
  try {
    const user = await requireAuth();
    const { data, error } = await supabase.rpc('thrivv_weekly_points_leaderboard', { p_user: user.id });
    if (error) throw new Error('Unable to read gym leaderboard');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: 'Unable to load leaderboard' }, { status: e instanceof Error && e.message === 'Unauthorized' ? 401 : 503 }); }
}
