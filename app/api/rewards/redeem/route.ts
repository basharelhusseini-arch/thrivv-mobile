import { bodyOf, handled, actor, json, HttpError } from '@/lib/admin/http';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
export async function POST(request: NextRequest) { return handled(async () => {
  const user = await actor(false); const body = await bodyOf(request);
  if (typeof body.offerId !== 'string' || body.offerId.length > 100) throw new HttpError(400, 'Invalid offer');
  const { data, error } = await supabase.rpc('thrivv_redeem', { p_user: user.id, p_offer: body.offerId, p_request: body.requestId });
  if (error) throw new HttpError(409, 'Offer unavailable, insufficient points, or a correction needs review');
  return json({ redemption: data });
}); }
