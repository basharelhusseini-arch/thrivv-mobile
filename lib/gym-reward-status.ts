import { calculateHealthScoreV3 } from '@/lib/health-score-v3';
import { supabase } from '@/lib/supabase';
import { scoreContext, readScore } from '@/lib/daily-health-score';
import { addDays, dayStart, localDate } from '@/lib/score-calendar';
export async function gymRewardStatus(userId: string) {
  const context = await scoreContext(userId);
  const score = await readScore(context).catch(() => null);
  const { data: config, error: configError } = await supabase.from('gym_reward_config').select('*').eq('singleton', true).single();
  if (configError) throw new Error('Workout verification setup unavailable');
  const verificationEnabled = config.verification_enabled === true;
  const rewardsEnabled = config.rewards_enabled === true;

  const [workouts, scans, rewards, connection, checkin, manualScan] = await Promise.all([
    supabase.from('whoop_workouts').select('id,start_at,end_at,sport_name,workout_score,score_input_valid,score_state').eq('user_id', userId).is('deleted_at', null)
      .gte('start_at', dayStart(addDays(context.today, -7), context.timezone)).order('start_at', { ascending: false }).limit(200),
    supabase.from('gym_workout_verifications').select('workout_id,gym_id,start_at,end_at').eq('user_id', userId).gte('score_date', addDays(context.today, -7)),
    supabase.from('daily_reward_entitlements').select('score_date,awarded,status,gym_id,source').eq('user_id', userId).gte('score_date', addDays(context.today, -7)),
    supabase.from('whoop_connections').select('whoop_connected_at').eq('id', userId).maybeSingle(),
    supabase.from('daily_checkins').select('did_workout,habit_details').eq('user_id', userId).eq('date', context.today).maybeSingle(),
    supabase.from('manual_gym_verifications').select('gym_id,timezone').eq('user_id', userId).eq('score_date', context.today).maybeSingle(),
  ]);
  if (rewards.error || checkin.error || manualScan.error) throw new Error('Verification status unavailable');
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
      status: verification ? (reward?.status === 'credited' ? 'Points credited for this day' : reward?.status === 'review_required' ? 'Points under review' : 'Performance verified — scan today’s attendance QR to earn points')
        : recorded ? 'Workout or membership changed — verification needs review' : !membershipEligible ? 'Join a gym before your workout' : !verificationEnabled ? 'Verification not activated' : !withinWindow ? 'Scan window closed' : 'Ready for gym verification' };
  });
  const entitlement = rewards.data?.find(r => r.score_date === context.today);
  const manualEligible = true; // Attendance earning does not depend on owning a wearable.
  const manualEnabled = config.manual_rewards_enabled === true && verificationEnabled && Date.parse(config.manual_effective_at) <= now;
  const manualVerified = Boolean(manualScan.data && manualScan.data.gym_id === context.gymId && manualScan.data.timezone === context.timezone);
  const checkedIn = checkin.data?.did_workout === true;
  const manual = { eligible: manualEligible, enabled: manualEnabled, checkedIn, verified: manualVerified,
    canScan: Boolean(manualEligible && manualEnabled && context.gymId && context.membershipStart && context.today >= context.membershipStart && checkedIn
      && (!entitlement || entitlement.source === 'manual') && (!manualScan.data || manualVerified)),
    estimatedPoints: 40 + calculateHealthScoreV3(null, null, checkin.data?.habit_details).habit_score };
  return { mode: 'manual' as const, whoopConnected: Boolean(connection.data?.whoop_connected_at), manual, redemptionEnabled: rewardsEnabled || config.manual_rewards_enabled === true, gymId: context.gymId, date: context.today, timezone: context.timezone, serverNow: now, verificationEnabled, rewardsEnabled: manualEligible ? manualEnabled : rewardsEnabled,
    effectiveDate: config.effective_date, score: score?.score ?? null,
    estimatedPoints: manualEnabled ? manual.estimatedPoints : null,
    scoreComplete: Boolean(score?.complete), creditedPoints: entitlement ? Number(entitlement.awarded) : 0,
    rewardStatus: entitlement?.status ?? (manualEligible && manualEnabled ? (checkedIn ? 'verification_required' : 'checkin_required') : !rewardsEnabled ? 'not_activated' : config.effective_date > context.today ? 'before_activation' : 'pending'), workouts: entries };
}
