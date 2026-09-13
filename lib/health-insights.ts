type Score = { complete: boolean; score: number | null; subtotal: number; training_score: number | null; recovery_score: number | null; habit_score: number; whoop_recovery: number | null; workouts_complete: boolean };
type Workout = { sport_name: string | null; workout_score: number | null; score_input_valid: boolean };
/** App-metric explanations only; no external AI or unsupported health inferences. */
export function healthInsights(score: Score | null, workouts: Workout[]): string[] {
  if (!score) return ['Your Health Score is unavailable. Sync WHOOP to load your recorded workouts and recovery; no missing values are treated as zero.', 'You can record habits you actually completed while waiting for your wearable data. Thrivv’s score is an app metric, not a clinical assessment.'];
  const insights: string[] = [];
  const part = (n: number | null, max: number) => n === null ? 'unavailable' : `${n}/${max}`;
  insights.push(`${score.complete ? 'Today’s score' : 'Provisional subtotal'}: ${score.complete ? score.score : score.subtotal}/110 — Training ${part(score.training_score,80)}, Recovery ${part(score.recovery_score,20)}, Habits ${part(score.habit_score,10)}.${score.complete ? '' : ' Missing or pending WHOOP inputs still need to sync.'}`);
  const best = workouts.filter(w => w.score_input_valid && w.workout_score !== null).sort((a,b) => b.workout_score! - a.workout_score!)[0];
  if (best) insights.push(`Your highest eligible workout is ${best.sport_name || 'a WHOOP workout'} (${best.workout_score}/100). Only the highest workout supplies the training component; additional workouts do not stack.`);
  else insights.push(score.workouts_complete ? 'The completed sync has no eligible workouts for today. That is a recorded zero for training, not a failed sync.' : 'Workout data is incomplete. A missing workout score is not evidence that you did not train.');
  const components = [['Training',score.training_score],['Recovery',score.recovery_score],['Habits',score.habit_score]] as const;
  const known = components.filter((x): x is readonly ['Training'|'Recovery'|'Habits', number] => x[1] !== null);
  if (known.length) { const max = Math.max(...known.map(x => x[1])); if (max>0) insights.push(`${known.filter(x=>x[1]===max).map(x=>x[0]).join(' and ')} contributed the most recorded points (${max}).`); }
  if (score.whoop_recovery === null || score.recovery_score === null) insights.push('Recovery is unavailable. Sync WHOOP again when its recovery score is ready; sleep duration and quality cannot be inferred from this missing value.');
  else {
    insights.push(`WHOOP Recovery is ${score.whoop_recovery}/100, contributing ${score.recovery_score}/20. This is WHOOP’s recovery metric, not measured sleep quality or duration.`);
    if (score.whoop_recovery < 34) insights.push('Recovery is low in this record. Consider rest or gentle movement according to how you feel; do not add intensity just to earn points.');
    else insights.push('Keep training appropriate to how you feel and your usual plan. A higher app score is not a reason to push beyond that plan.');
  }
  if (score.habit_score < 10) insights.push(`Habits contributed ${score.habit_score}/10. Record eligible habits you actually completed; an unlogged habit does not prove it was not done.`);
  insights.push('Keep a consistent opportunity for sleep and review your next recovery reading. This app metric cannot diagnose why recovery changed.');
  return insights;
}
