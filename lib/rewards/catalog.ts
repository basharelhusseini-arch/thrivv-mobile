export const REWARD_TIERS = {
  restaurant: { label: 'Restaurant / café', points: 400, discount: 10 },
  supplement: { label: 'Supplements', points: 600, discount: 10 },
  gym_class: { label: 'Gym classes', points: 800, discount: 15 },
} as const;
export type RewardCategory = keyof typeof REWARD_TIERS;
export type RewardOffer = {
  id: string; name: string; points: number; partner_name: string; category: RewardCategory | null;
  discount_percent: number | null; terms: string; instructions: string; website_url: string | null;
  gym_id?: string | null; location_label?: string; lowStock?: boolean;
  expires_at: string | null; available?: boolean; active?: boolean; remaining?: number;
};
export type RewardReceipt = {
  id: string; offer_id: string; points: number; status: string; created_at: string;
  discount_code: string | null; expires_at: string | null; offer_snapshot: Partial<RewardOffer>;
  reward_offers?: { name: string } | null;
};
export function safePartnerUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value !== 'string' || value.length > 2000) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function receiptExpired(receipt: Pick<RewardReceipt, 'expires_at'>, now = Date.now()) {
  return !!receipt.expires_at && new Date(receipt.expires_at).getTime() <= now;
}
