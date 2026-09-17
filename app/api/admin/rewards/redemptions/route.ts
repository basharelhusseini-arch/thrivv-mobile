import { NextRequest } from 'next/server';
import { actor, bodyOf, handled, HttpError, json, pageOffset, textField, uuid } from '@/lib/admin/http';
import { supabase } from '@/lib/supabase';
export function GET(req: NextRequest) { return handled(async () => {
  await actor(); const offset = pageOffset(req);
  const reference = req.nextUrl.searchParams.get('reference');
  const status = req.nextUrl.searchParams.get('status');
  let query = supabase.from('reward_redemptions').select('id,offer_id,points,status,created_at,expires_at,offer_snapshot,resolved_at', { count: 'exact' });
  if (reference) { if (!uuid(reference)) throw new HttpError(400, 'Enter a complete redemption reference'); query = query.eq('id', reference); }
  if (status === 'expired') query = query.eq('status', 'issued').lte('expires_at', new Date().toISOString());
  else if (status && ['issued','fulfilled','rejected','cancelled'].includes(status)) query = query.eq('status', status);
  const { data, error, count } = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + 24);
  if (error) throw error;
  return json({ redemptions: data || [], total: count || 0 });
}); }
export function POST(req: NextRequest) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(req);
  if (!uuid(b.redemptionId) || !['used','rejected','replace','refund'].includes(b.action)) throw new HttpError(400, 'Invalid resolution');
  const { data, error } = await supabase.rpc('thrivv_resolve_redemption', { p_actor: user.id, p_request: b.requestId, p_redemption: b.redemptionId,
    p_action: b.action, p_reason: textField(b.reason, 'Reason', 3, 500), p_reference: textField(b.reference, 'Merchant confirmation reference', 3, 200) });
  if (error) throw new HttpError(409, 'Not resolved. Check the current status, expiry and replacement code stock.');
  return json({ result: data });
}); }
