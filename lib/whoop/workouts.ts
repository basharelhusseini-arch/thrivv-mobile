import { scoreWorkout } from '@/lib/workout-score';
/** WHOOP duration here is elapsed end-start time, not active training time. */
export type ImportedWorkout = {
  id: string; start_at: string; end_at: string; duration_ms: number;
  strain: number | null; score_state: string; source_updated_at: string;
  sport_name: string | null; kilojoule: number | null; zone_durations_ms: (number | null)[] | null;
  score_input_valid: boolean; workout_score: number | null; workout_breakdown: unknown;
};
export function parseWorkout(value: unknown): ImportedWorkout {
  const w = value as Record<string, any>;
  if (!w || typeof w.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(w.id)) throw new Error('Invalid WHOOP workout id');
  const start = Date.parse(w.start); const end = Date.parse(w.end); const updated = Date.parse(w.updated_at);
  if (![start, end, updated].every(Number.isFinite) || end < start) throw new Error('Invalid WHOOP timestamps');
  if (!['SCORED', 'PENDING_SCORE', 'UNSCORABLE'].includes(w.score_state)) throw new Error('Invalid WHOOP score state');
  const strain = w.score_state === 'SCORED' ? w.score?.strain ?? null : null;
  if (w.score_state === 'SCORED' && strain !== null && (typeof strain !== 'number' || !Number.isFinite(strain) || strain < 0 || strain > 21)) throw new Error('Invalid WHOOP strain');
  const metric = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
  const zones = w.score?.zone_durations;
  const input = { strain, duration_ms: end-start, end_at: new Date(end).toISOString(), score_state: w.score_state,
    sport_name: typeof w.sport_name === 'string' ? w.sport_name : null,
    kilojoule: metric(w.score?.kilojoule),
    zone_durations_ms: zones ? ['zero','one','two','three','four','five'].map(n => metric(zones[`zone_${n}_milli`])) : null };
  const result = scoreWorkout(input);
  return { ...input, score_input_valid: result !== null, workout_score: result?.score ?? null, workout_breakdown: result, id: w.id, start_at: new Date(start).toISOString(), end_at: new Date(end).toISOString(),
    duration_ms: end-start, strain, score_state: w.score_state, source_updated_at: new Date(updated).toISOString() };
}

export function workoutWindow(now = new Date()) {
  return { start: new Date(now.getTime() - 7 * 86400000).toISOString(), end: now.toISOString() };
}
