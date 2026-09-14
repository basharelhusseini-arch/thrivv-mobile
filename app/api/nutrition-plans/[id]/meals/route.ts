import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: 'Please sign in' }, { status: 401 }); }
  const { data, error } = await supabase.from('nutrition_plans').select('meal_plans').eq('id', params.id).eq('member_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Unable to load meals' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Nutrition plan not found' }, { status: 404 });
  return NextResponse.json(data.meal_plans || [], { headers: { 'Cache-Control': 'no-store' } });
}
