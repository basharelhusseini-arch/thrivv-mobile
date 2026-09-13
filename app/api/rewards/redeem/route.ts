import { bodyOf, handled, actor, json, HttpError } from '@/lib/admin/http';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
export async function POST(request: NextRequest) { return handled(async () => {
  const user = await actor(false); const body = await bodyOf(request);
  if (process.env.GYM_DAILY_REWARDS_ENABLED !== 'true') throw new HttpError(503, 'Rewards are not activated');
  if (typeof body.offerId !== 'string' || body.offerId.length > 100) throw new HttpError(400, 'Invalid offer');
  const { data, error } = await supabase.rpc('thrivv_redeem', { p_user: user.id, p_offer: body.offerId, p_request: body.requestId });
  if (error) throw new HttpError(409, 'Offer unavailable, insufficient points, or a correction needs review');
  return json({ redemption: data });
}); }
