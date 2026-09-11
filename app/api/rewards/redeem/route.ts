import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
export async function POST(request: NextRequest) {
  let user;
  try { user = await requireAuth(); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await request.json().catch(() => null);
  if (typeof body?.offerId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body?.requestId || '')) return NextResponse.json({ error: 'Invalid redemption request' }, { status: 400 });
  const { data, error } = await supabase.rpc('thrivv_redeem', { p_user: user.id, p_offer: body.offerId, p_request: body.requestId });
  if (error) return NextResponse.json({ error: 'Offer unavailable, insufficient points, or request needs review' }, { status: 409 });
  return NextResponse.json({ redemption: data });
}
