import { supabase } from '@/lib/supabase';
/** Explicit columns only: credentials and raw provider payloads never leave the server. */
export async function memberDetail(id: string) {
  const member = await supabase.from('users').select('id,first_name,last_name,email,gym_id,membership_start_date,reward_points,created_at').eq('id', id).maybeSingle();
  if (member.error) throw new Error('Member unavailable');
  if (!member.data) return null;
  const results = await Promise.all([
    supabase.from('health_score_days').select('date,score,training_score,recovery_score,habit_score,complete,updated_at,gym_id').eq('user_id', id).order('date', { ascending: false }).limit(30),
    supabase.from('reward_history').select('id,date,points_earned').eq('user_id', id).order('date', { ascending: false }).limit(30),
    supabase.from('whoop_connections').select('last_sync_at,next_sync_at,whoop_connected_at').eq('id', id).maybeSingle(),
    supabase.from('admin_support_actions').select('id,status,result_code,reason,created_at,finished_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('gym_membership_history').select('old_gym_id,new_gym_id,old_start,new_start,changed_at').eq('user_id', id).order('changed_at', { ascending: false }).limit(30),
    supabase.from('reward_transactions').select('id,kind,amount,score_date,gym_id,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(30),
    supabase.from('daily_reward_entitlements').select('score_date,gym_id,awarded,desired,status,updated_at').eq('user_id',id).order('score_date',{ascending:false}).limit(30),
  ]);
  const section = (r: typeof results[number]) => ({ available: !r.error, data: r.error ? null : r.data });
  return { member: member.data, scores: section(results[0]), rewards: section(results[1]), sync: section(results[2]), actions: section(results[3]), membershipHistory: section(results[4]), ledger: section(results[5]), dailyRewards: section(results[6]), pointsAdjustments: { available: false, reason: 'Reward accounting must be reconciled before adjustments are enabled.' } };
}
