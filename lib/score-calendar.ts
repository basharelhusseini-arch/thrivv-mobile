export function localDate(time: string | number | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(time));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
/** First instant of the local date; handles 23/25-hour DST days without fixed offsets. */
export function dayStart(date: string, timezone: string) {
  let low = Date.parse(`${date}T12:00:00Z`) - 36 * 3600000;
  let high = low + 72 * 3600000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (localDate(mid, timezone) < date) low = mid + 1; else high = mid;
  }
  if (localDate(low, timezone) !== date) throw new Error('Local calendar date does not exist');
  return new Date(low).toISOString();
}
export function sevenDayAverage(rows: { date: string; score: number | null; complete: boolean; version: string }[], today: string, membershipStart: string | null, version: string) {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i - 7)).filter(d => !membershipStart || d >= membershipStart);
  const eligible = dates.flatMap(date => {
    const row = rows.find(r => r.date === date && r.version === version && r.complete && r.score !== null);
    return row ? [row.score!] : [];
  });
  return { average: eligible.length ? Math.round(eligible.reduce((a, b) => a + b, 0) / eligible.length * 10) / 10 : null,
    coverage: eligible.length, expected: dates.length, provisional: eligible.length < dates.length };
}
