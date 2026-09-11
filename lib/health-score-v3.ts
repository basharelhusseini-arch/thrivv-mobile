export const HEALTH_VERSION = 'health-v3';
// Fixed v3 eligibility snapshot. Changes require a new formula version/cutover.
export const ELIGIBLE_HABITS = ['sauna', 'steamRoom', 'iceBath', 'coldShower', 'meditation', 'stretching'] as const;
export function eligibleHabits(input: unknown) {
  const record = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return Object.fromEntries(ELIGIBLE_HABITS.map(key => [key, record[key] === true]));
}
export const roundPoint = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;
export function calculateHealthScoreV3(workoutScore: number | null, recoveryScore: number | null, habits: unknown, workoutsComplete = true) {
  const bounded = (n: number | null) => n !== null && Number.isFinite(n) && n >= 0 && n <= 100;
  const training_score = bounded(workoutScore) ? roundPoint(workoutScore! * .8) : null;
  const recovery_score = bounded(recoveryScore) ? roundPoint(recoveryScore! * .2) : null;
  const habit_score = roundPoint(10 * Object.values(eligibleHabits(habits)).filter(Boolean).length / ELIGIBLE_HABITS.length);
  const complete = workoutsComplete && training_score !== null && recovery_score !== null;
  const subtotal = roundPoint((training_score ?? 0) + (recovery_score ?? 0) + habit_score);
  return { training_score, recovery_score, habit_score, score: complete ? subtotal : null, subtotal, complete, version: HEALTH_VERSION };
}
