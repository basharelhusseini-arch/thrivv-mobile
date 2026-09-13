import { supabase } from '@/lib/supabase';
import { scoreContext, readScore } from '@/lib/daily-health-score';
import { addDays, dayStart, localDate } from '@/lib/score-calendar';
export async function gymRewardStatus(userId: string) {
  const context = await scoreContext(userId);
  const score = await readScore(context);
  const { data: config, error: configError } = await supabase.from('gym_reward_config').select('*').eq('singleton', true).single();
  if (configError) throw new Error('Workout verification setup unavailable');
  const verificationEnabled = process.env.GYM_WORKOUT_VERIFICATION_ENABLED === 'true' && config.verification_enabled;
  const rewardsEnabled = process.env.GYM_DAILY_REWARDS_ENABLED === 'true' && config.rewards_enabled;
  const [workouts, scans, rewards] = await Promise.all([
    supabase.from('whoop_workouts').select('id,start_at,end_at,sport_name,workout_score,score_input_valid,score_state').eq('user_id', userId).is('deleted_at', null)
      .gte('start_at', dayStart(addDays(context.today, -7), context.timezone)).order('start_at', { ascending: false }).limit(200),
    supabase.from('gym_workout_verifications').select('workout_id,gym_id,start_at,end_at').eq('user_id', userId).gte('score_date', addDays(context.today, -7)),
    supabase.from('daily_reward_entitlements').select('score_date,awarded,status,gym_id').eq('user_id', userId).gte('score_date', addDays(context.today, -7)),
  ]);
  if (workouts.error || scans.error || rewards.error) throw new Error('Verification status unavailable');
  const now = Date.now();
  const entries = (workouts.data || []).map(w => {
    const date = localDate(new Date(w.start_at), context.timezone);
    const recorded = scans.data?.find(v => v.workout_id === w.id);
    const verification = recorded && recorded.gym_id === context.gymId && Date.parse(recorded.start_at) === Date.parse(w.start_at) && Date.parse(recorded.end_at) === Date.parse(w.end_at) ? recorded : null;
    const reward = rewards.data?.find(r => r.score_date === date && r.gym_id === context.gymId);
    const withinWindow = now >= Date.parse(w.end_at) && now <= Date.parse(w.end_at) + 2 * 3600000;
    const membershipEligible = Boolean(context.gymId && context.membershipStart && date >= context.membershipStart);
    return { ...w, date, verified: Boolean(verification), scanUntil: new Date(Date.parse(w.end_at) + 2 * 3600000).toISOString(),
      canScan: Boolean(verificationEnabled && membershipEligible && withinWindow && !recorded),
      status: verification ? (reward?.status === 'credited' ? 'Points credited for this day' : reward?.status === 'review_required' ? 'Points under review' : 'Gym verified — score or reward eligibility pending')
        : recorded ? 'Workout or membership changed — verification needs review' : !membershipEligible ? 'Join a gym before your workout' : !verificationEnabled ? 'Verification not activated' : !withinWindow ? 'Scan window closed' : 'Scan gym QR to unlock points' };
  });
  const entitlement = rewards.data?.find(r => r.score_date === context.today);
  return { gymId: context.gymId, date: context.today, timezone: context.timezone, serverNow: now, verificationEnabled, rewardsEnabled,
    effectiveDate: config.effective_date, score: score?.score ?? null, estimatedPoints: score?.subtotal ?? null,
    scoreComplete: Boolean(score?.complete), creditedPoints: entitlement ? Number(entitlement.awarded) : 0,
    rewardStatus: !rewardsEnabled ? 'not_activated' : entitlement?.status ?? (config.effective_date > context.today ? 'before_activation' : 'pending'), workouts: entries };
}
