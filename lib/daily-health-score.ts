import { supabase } from '@/lib/supabase';
import { HEALTH_VERSION, calculateHealthScoreV3 } from './health-score-v3';
import { localDate, addDays, sevenDayAverage } from './score-calendar';

export async function scoreContext(userId: string, now = new Date()) {
  const { data: user, error } = await supabase.from('users').select('gym_id,timezone,membership_start_date,reward_points').eq('id', userId).single();
  if (error || !user) throw new Error('Unable to load score membership');
  let timezone = user.timezone || 'UTC';
  if (user.gym_id) {
    const { data: gym, error: gymError } = await supabase.from('gyms').select('timezone').eq('id', user.gym_id).single();
    if (gymError || !gym) throw new Error('Unable to load gym calendar');
    timezone = gym.timezone;
  }
  const { data: config, error: configError } = await supabase.from('health_scoring_config').select('effective_date').eq('version', HEALTH_VERSION).single();
  if (configError) throw new Error('Scoring migration is required');
  return { userId, gymId: user.gym_id as string | null, timezone: timezone as string,
    today: localDate(now, timezone), membershipStart: user.membership_start_date as string | null,
    cutover: config?.effective_date as string | null, balance: user.reward_points };
}
export type ScoreContext = Awaited<ReturnType<typeof scoreContext>>;
export async function readScore(context: ScoreContext, date = context.today) {
  if (!context.cutover || date < context.cutover) return null;
  const { data, error } = await supabase.from('health_score_days').select('*').eq('user_id', context.userId).eq('date', date).eq('version', HEALTH_VERSION).eq('timezone', context.timezone).maybeSingle();
  if (error) throw new Error('Unable to read score');
  return data && data.gym_id === context.gymId ? data : null;
}
export async function saveDay(context: ScoreContext, date: string, inputs?: {
  workoutScore: number | null; workoutsComplete: boolean; recovery: number | null; sleepId: string | null;
}) {
  if (!context.cutover || date < context.cutover || (context.membershipStart && date < context.membershipStart)) return null;
  const previous = await readScore(context, date);
  const { data: checkin, error } = await supabase.from('daily_checkins').select('habit_details').eq('user_id', context.userId).eq('date', date).maybeSingle();
  if (error) throw new Error('Unable to read habits');
  const workoutScore = inputs ? inputs.workoutScore : previous?.workout_score ?? null;
  const recovery = inputs ? inputs.recovery : previous?.whoop_recovery ?? null;
  const workoutsComplete = inputs ? inputs.workoutsComplete : previous?.workouts_complete ?? false;
  const recoveryComplete = inputs ? inputs.recovery !== null : previous?.recovery_complete ?? false;
  const result = calculateHealthScoreV3(workoutScore, recoveryComplete ? recovery : null, checkin?.habit_details, workoutsComplete);
  const payload = { ...result, user_id: context.userId, date, timezone: context.timezone, gym_id: context.gymId,
    workout_score: workoutScore, whoop_recovery: recovery ?? previous?.whoop_recovery ?? null,
    recovery_sleep_id: inputs?.sleepId ?? previous?.recovery_sleep_id ?? null,
    workouts_complete: workoutsComplete, recovery_complete: recoveryComplete, updated_at: new Date().toISOString() };
  const { data, error: writeError } = await supabase.from('health_score_days').upsert(payload, { onConflict: 'user_id,date,version' }).select().single();
  if (writeError) throw new Error('Unable to save score');
  return data;
}
export async function scoreSnapshot(userId: string) {
  const context = await scoreContext(userId);
  const score = await readScore(context);
  const { data: rows, error } = await supabase.from('health_score_days').select('*').eq('user_id', userId).eq('version', HEALTH_VERSION).eq('timezone', context.timezone)
    .gte('date', addDays(context.today, -7)).lt('date', context.today).order('date');
  if (error) throw new Error('Unable to read score history');
  const history = (rows || []).filter(r => r.gym_id === context.gymId && context.cutover && r.date >= context.cutover && (!context.membershipStart || r.date >= context.membershipStart));
  const { data: connection, error: connectionError } = await supabase.from('whoop_connections').select('whoop_connected_at,last_sync_at').eq('id', userId).maybeSingle();
  if (connectionError) throw new Error('Unable to read sync status');
  const lastSyncedAt = connection?.last_sync_at ?? null;
  const status = !connection?.whoop_connected_at ? 'Connect WHOOP' : !lastSyncedAt ? 'Sync pending'
    : Date.now() - Date.parse(lastSyncedAt) > 2 * 3600000 ? 'Sync delayed' : !score?.complete ? 'Incomplete score' : 'Score updated';
  return { score, history, ...sevenDayAverage(history, context.today, context.membershipStart, HEALTH_VERSION),
    status, lastSyncedAt, date: context.today, timezone: context.timezone, scoringEnabled: Boolean(context.cutover && context.today >= context.cutover) };
}
