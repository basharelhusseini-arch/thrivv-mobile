import { supabase } from '@/lib/supabase';

export async function creditDailyReward(userId: string, date: string, health: number, confidence: number, total: number, multiplier: number, amount: number): Promise<number> {
  const { data, error } = await supabase.rpc('thrivv_credit_daily', {
    p_user: userId, p_date: date, p_health: health, p_confidence: confidence,
    p_total: total, p_multiplier: multiplier, p_amount: amount,
  });
  if (error) throw new Error('Reward accounting failed');
  return Number(data);
}
