import { reconcileDailyRewards, rewardBackfillWindow } from '@/lib/rewards/ledger';
import { bestDailyWorkout } from '@/lib/workout-score';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';
import { fetchWorkouts, fetchCollection } from './api';
import { scoreContext, saveDay } from '@/lib/daily-health-score';
import { addDays, dayStart, localDate } from '@/lib/score-calendar';
import { recoveryForDay } from './recovery-day';
import { getValidAccessToken } from './oauth';
import { parseWorkout } from './workouts';

export class SyncBusyError extends Error {}
export async function withWhoopLock<T>(userId: string, action: () => Promise<T>): Promise<T> {
  const owner = randomUUID();
  const { data, error } = await supabase.rpc('thrivv_lock_sync', { p_user: userId, p_owner: owner });
  if (error) throw new Error('Unable to acquire WHOOP sync lock');
  if (!data) throw new SyncBusyError('Sync already running');
  try { return await action(); }
  finally { await supabase.rpc('thrivv_release_sync', { p_user: userId, p_owner: owner }); }
}

/** Call under the per-user lock. Rewards remain separately gated. */
export async function importWorkouts(userId: string, accessToken: string, backfill?: { first: string; after: string; start: string; end: string }) {
  const context = await scoreContext(userId);
  const startDate = backfill?.first ?? addDays(context.today, -7);
  const window = backfill ?? { start: dayStart(startDate, context.timezone), end: new Date().toISOString() };
  const lastDate = backfill ? addDays(backfill.after, -1) : context.today;
  // Fetch the preceding two days as well: main sleep begins before its recovery day.
  const sleepStart = dayStart(addDays(startDate, -2), context.timezone);
  const results = await Promise.allSettled([
    fetchWorkouts(accessToken, window.start, window.end),
    fetchCollection('/developer/v2/activity/sleep', accessToken, sleepStart, window.end),
    fetchCollection('/developer/v2/recovery', accessToken, sleepStart, window.end),
  ]);
  for (const result of results) if (result.status === 'rejected') throw result.reason;
  const [raw, sleeps, recoveries] = results.map(r => r.status === 'fulfilled' ? r.value : []);
  const { data: owner, error: ownerError } = await supabase.from('whoop_connections').select('whoop_user_id').eq('id', userId).single();
  if (ownerError || !owner?.whoop_user_id || [...raw, ...sleeps, ...recoveries].some(r => r.user_id !== owner.whoop_user_id)) throw new Error('WHOOP ownership mismatch');
  const records = raw.map(parseWorkout);
  const { error } = await supabase.rpc('thrivv_store_workouts', {
    p_user: userId, p_records: records, p_start: window.start, p_end: window.end,
  });
  if (error) throw new Error('Failed to store workouts');
  const { data: workouts, error: readError } = await supabase.from('whoop_workouts').select('start_at,workout_score,score_input_valid,score_state')
    .eq('user_id', userId).is('deleted_at', null).gte('start_at', window.start).lt('start_at', window.end);
  if (readError) throw new Error('Failed to read workouts');
  for (let date = startDate; date <= lastDate; date = addDays(date, 1)) {
    const daily = (workouts || []).filter(w => localDate(w.start_at, context.timezone) === date);
    const recovery = recoveryForDay(sleeps, recoveries, date, context.timezone);
    await saveDay(context, date, { ...bestDailyWorkout(daily), recovery: recovery.value, sleepId: recovery.sleepId });
  }
  const rewards = await reconcileDailyRewards(userId, window.start, window.end);
  if (backfill) {
    const { error: cursorError } = await supabase.from('whoop_connections').update({ reward_sync_cursor: backfill.after }).eq('id', userId);
    if (cursorError) throw new Error('Failed to advance reward recovery');
    return { imported: records.length, workoutRewardsEnabled: false, dailyRewards: rewards };
  }
  const { error: syncError } = await supabase.from('whoop_connections').update({ last_sync_at: new Date().toISOString(), next_sync_at: new Date(Date.now() + 3600000).toISOString() }).eq('id', userId);
  if (syncError) throw new Error('Failed to record completed sync');
  return { imported: records.length, workoutRewardsEnabled: false, dailyRewards: rewards };
}

export async function syncMemberWorkouts(userId: string) {
  return withWhoopLock(userId, async () => {
    const token = await getValidAccessToken(userId);
    if (!token) throw new Error('WHOOP connection unavailable');
    const result = await importWorkouts(userId, token);
    const context = await scoreContext(userId);
    const backfill = await rewardBackfillWindow(userId, context.today, context.timezone);
    if (backfill) await importWorkouts(userId, token, backfill);
    return result;
  });
}
