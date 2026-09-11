import { localDate } from '@/lib/score-calendar';
/** Match WHOOP v2 sleep_id + cycle_id; ignore naps. Ambiguous days stay pending. */
export function recoveryForDay(sleeps: any[], recoveries: any[], date: string, timezone: string) {
  const main = sleeps.filter(s => s.nap === false && Number.isFinite(Date.parse(s.end)) && localDate(s.end, timezone) === date);
  const unique = [...new Map(main.map(s => [s.id, s])).values()];
  if (unique.length !== 1) return { value: null, sleepId: null };
  const sleep = unique[0];
  const matches = recoveries.filter(r => r.sleep_id === sleep.id && r.cycle_id === sleep.cycle_id)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const recovery = matches[0];
  const n = recovery?.score?.recovery_score;
  if (recovery?.score_state !== 'SCORED' || typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) return { value: null, sleepId: sleep.id };
  return { value: n, sleepId: sleep.id };
}
