import { supabase } from '@/lib/supabase';
/** Only server-stored scores and verification records determine the award. */
export async function reconcileDailyReward(userId: string, date: string) {
  const { data, error } = await supabase.rpc('thrivv_reconcile_gym_reward', { p_user: userId, p_date: date });
  if (error) throw new Error('Reward reconciliation unavailable');
  return data;
}
