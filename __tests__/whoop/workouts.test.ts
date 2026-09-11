import { parseWorkout, workoutWindow } from '@/lib/whoop/workouts';
const sample = { id: '00000000-0000-4000-8000-000000000001', start: '2026-09-01T23:30:00Z', end: '2026-09-02T00:15:00Z', updated_at: '2026-09-02T00:20:00Z', score_state: 'SCORED', score: { strain: 12.5 } };
test('elapsed duration is milliseconds across midnight, distinct from strain', () => {
  expect(parseWorkout(sample)).toMatchObject({ duration_ms: 2700000, strain: 12.5 });
});
test('pending workouts have no rewardable strain', () => {
  expect(parseWorkout({ ...sample, score_state: 'PENDING_SCORE' }).strain).toBeNull();
});
test.each([NaN, Infinity, -1, 22, '12'])('rejects invalid strain %s', strain => {
  expect(() => parseWorkout({ ...sample, score: { strain } })).toThrow();
});
test('rejects reversed time and invalid provider data', () => {
  expect(() => parseWorkout({ ...sample, end: '2020-01-01' })).toThrow();
  expect(() => parseWorkout(null)).toThrow();
});
test('reconciliation uses an explicit UTC window', () => {
  expect(workoutWindow(new Date('2026-09-08T12:00:00Z'))).toEqual({ start: '2026-09-01T12:00:00.000Z', end: '2026-09-08T12:00:00.000Z' });
});
