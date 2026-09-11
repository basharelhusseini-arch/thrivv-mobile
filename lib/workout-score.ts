/** Thrivv effort heuristic v1; product reference targets, not a medical assessment. */
export const WORKOUT_VERSION = 'workout-v1';
export const PROFILES = {
  cardio: { weights: [40, 25, 25, 10], targets: [14, 45, 30, 400] },
  strength: { weights: [45, 35, 10, 10], targets: [14, 60, 25, 300] },
  mobility: { weights: [20, 50, 25, 5], targets: [7, 30, 20, 120] },
} as const;
export type WorkoutInput = {
  strain: number | null; duration_ms: number; sport_name?: string | null;
  kilojoule?: number | null; zone_durations_ms?: (number | null)[] | null;
  score_state: string; end_at: string; deleted_at?: string | null;
};
// WHOOP v2 sport_name, never client overrides or invented numeric sport IDs.
const types: Record<string, keyof typeof PROFILES> = {
  running: 'cardio', cycling: 'cardio', swimming: 'cardio', rowing: 'cardio',
  hiit: 'cardio', basketball: 'cardio', soccer: 'cardio', tennis: 'cardio',
  weightlifting: 'strength', 'weight lifting': 'strength', 'strength trainer': 'strength',
  'functional fitness': 'strength', 'resistance training': 'strength',
  yoga: 'mobility', stretching: 'mobility', mobility: 'mobility',
};
const valid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function scoreWorkout(w: WorkoutInput, now = Date.now()) {
  if (w.deleted_at || w.score_state !== 'SCORED' || !Number.isFinite(Date.parse(w.end_at)) || Date.parse(w.end_at) > now) return null;
  if (typeof w.sport_name !== 'string' || !w.sport_name.trim()) return null;
  const zones = w.zone_durations_ms;
  if (!valid(w.strain) || w.strain > 21 || !valid(w.duration_ms) || !valid(w.kilojoule) ||
      !zones || zones.length !== 6 || !zones.every(valid)) return null;
  // Allow unrecorded HR time; never invent it. Only overrun tolerance: max(1s, 1%).
  if ((zones as number[]).reduce((a, b) => a + b, 0) > w.duration_ms + Math.max(1000, w.duration_ms * .01)) return null;
  const name = w.sport_name?.trim().toLowerCase() || '';
  const category = types[name] || 'cardio';
  const profile = PROFILES[category];
  const coefficients = category === 'mobility' ? [.5, 1, 1, 1, 1, 1] : [0, .5, 1, 1.25, 1.25, 1.25];
  const inputs = [w.strain, w.duration_ms / 60000,
    (zones as number[]).reduce((sum, ms, i) => sum + ms / 60000 * coefficients[i], 0), w.kilojoule / 4.184];
  const breakdown = inputs.map((n, i) => profile.weights[i] * Math.min(1, Math.max(0, n / profile.targets[i])));
  return { score: Math.min(100, breakdown.reduce((a, b) => a + b, 0)), category,
    label: types[name] ? name : 'Other', breakdown, version: WORKOUT_VERSION };
}

export function bestDailyWorkout(workouts: { workout_score: number | null; score_input_valid: boolean; score_state: string }[]) {
  const eligible = workouts.filter(w => w.score_input_valid && w.score_state === 'SCORED' && typeof w.workout_score === 'number' && Number.isFinite(w.workout_score) && w.workout_score >= 0 && w.workout_score <= 100);
  return { workoutScore: eligible.length ? Math.max(...eligible.map(w => w.workout_score!)) : workouts.length ? null : 0,
    workoutsComplete: eligible.length === workouts.length };
}
