import { supabase } from '@/lib/supabase';
import { addDays, dayStart } from '@/lib/score-calendar';

/** Only call after a successful, ownership-verified import covering this exact window.
 * Amounts and eligibility come from stored scores inside the database transaction.
 */
export async function reconcileDailyRewards(userId: string, start: string, end: string) {
  if (process.env.DAILY_HEALTH_REWARDS_ENABLED !== 'true') return { enabled: false };
  const { data, error } = await supabase.rpc('thrivv_reconcile_daily_rewards', {
    p_user: userId, p_start: start, p_end: end,
  });
  if (error) throw new Error('Reward accounting failed; retry required');
  return data;
}

/** Rotating historical windows prevent outages beyond seven days from losing eligibility.
 * Every successful pass advances; missing recovery on one day cannot starve later dates.
 */
export async function rewardBackfillWindow(userId: string, today: string, timezone: string) {
  if (process.env.DAILY_HEALTH_REWARDS_ENABLED !== 'true') return null;
  const { data: config, error } = await supabase.from('reward_config').select('enabled,activation_date').eq('id', true).single();
  if (error) throw new Error('Reward configuration unavailable');
  if (!config.enabled || !config.activation_date || config.activation_date >= addDays(today, -7)) return null;
  const { data: connection, error: connectionError } = await supabase.from('whoop_connections').select('reward_sync_cursor').eq('id', userId).single();
  if (connectionError) throw new Error('Reward recovery cursor unavailable');
  const boundary = addDays(today, -7);
  const cursor = connection.reward_sync_cursor;
  const first = cursor && cursor >= config.activation_date && cursor < boundary ? cursor : config.activation_date;
  const after = addDays(first, 7) < boundary ? addDays(first, 7) : boundary;
  return { first, after, start: dayStart(first, timezone), end: dayStart(after, timezone) };
}
