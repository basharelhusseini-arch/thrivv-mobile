import { NextRequest } from 'next/server';
import { actor, bodyOf, handled, HttpError, json, textField, uuid } from '@/lib/admin/http';
import { supabase } from '@/lib/supabase';
import { REWARD_TIERS, safePartnerUrl } from '@/lib/rewards/catalog';
export const dynamic = 'force-dynamic';
export function GET() { return handled(async () => {
  const user = await actor();
  const { data, error } = await supabase.rpc('thrivv_reward_catalog', { p_actor: user.id, p_admin: true });
  if (error) throw error;
  return json({ offers: data || [] });
}); }
export function POST(request: NextRequest) { return handled(async () => {
  const user = await actor(); const b = await bodyOf(request);
  const action = b.action;
  if (!['create', 'codes', 'active'].includes(action)) throw new HttpError(400, 'Invalid reward action');
  const offerId = textField(b.offerId, 'Offer ID', 1, 100);
  const reason = textField(b.reason, 'Reason', 3, 500);
  let input: Record<string, unknown> = {};
  if (action === 'create') {
    if (typeof b.category !== 'string' || !Object.prototype.hasOwnProperty.call(REWARD_TIERS, b.category)) throw new HttpError(400, 'Choose a reward category');
    const url = safePartnerUrl(b.website_url);
    if (b.website_url && !url) throw new HttpError(400, 'Use a valid HTTPS partner website');
    if (typeof b.expires_at !== 'string' || !Number.isFinite(Date.parse(b.expires_at)) || Date.parse(b.expires_at) <= Date.now()) throw new HttpError(400, 'Choose a future expiry date');
    if (b.gym_id && !uuid(b.gym_id)) throw new HttpError(400, 'Choose a valid branch');
    input = { gym_id: b.gym_id || null, location_label: typeof b.location_label === 'string' ? b.location_label.trim().slice(0, 200) : '', name: textField(b.name, 'Offer name', 3, 120), partner_name: textField(b.partner_name, 'Partner name', 2, 120), category: b.category,
      terms: textField(b.terms, 'Terms', 3, 2000), instructions: textField(b.instructions, 'How to use', 3, 2000), website_url: url, expires_at: new Date(b.expires_at).toISOString() };
  } else if (action === 'codes') {
    if (!Array.isArray(b.codes) || !b.codes.length || b.codes.length > 100 || b.codes.some((c: unknown) => typeof c !== 'string' || !/^[A-Za-z0-9_-]{3,100}$/.test(c))) throw new HttpError(400, 'Add 1–100 codes using letters, numbers, hyphens or underscores');
    input = { codes: [...new Set(b.codes)] };
  } else {
    if (typeof b.active !== 'boolean' || (b.active && b.partnerApproved !== true)) throw new HttpError(400, 'Confirm the partner approved these codes and offer terms');
    input = { active: b.active, partnerApproved: b.partnerApproved === true };
  }
  const { data, error } = await supabase.rpc('thrivv_manage_reward', { p_actor: user.id, p_request: b.requestId, p_action: action, p_offer: offerId, p_reason: reason, p_data: input });
  if (error) throw new HttpError(409, 'Not saved. Check for duplicate codes, an expired offer, or missing code inventory.');
  return json({ offer: data });
}); }
