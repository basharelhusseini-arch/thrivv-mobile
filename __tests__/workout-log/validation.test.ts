import { exercisesDatabase } from '@/lib/exercises';
import { isWorkoutLogDate, loggedWorkoutView, parseManualWorkoutInput } from '@/lib/manual-workouts';

const input = () => ({
  name: 'Evening workout',
  date: '2026-09-16',
  exercises: [{ name: 'Custom movement', sets: 3, reps: 12 }],
});

describe('manual workout validation', () => {
  test('keeps custom movements and positive whole-number sets and reps', () => {
    expect(parseManualWorkoutInput(input())).toEqual(input());
    expect(parseManualWorkoutInput({ ...input(), name: '  Evening workout  ' }).name).toBe('Evening workout');
  });

  test('uses the trusted name for a known exercise and ignores submitted coaching or reward data', () => {
    const known = exercisesDatabase[0];
    const parsed = parseManualWorkoutInput({
      ...input(), memberId: 'victim', status: 'scheduled', points: 1000,
      exercises: [{ name: 'Forged name', exerciseId: known.id, sets: 4, reps: 8, tips: ['Unsafe tip'], completed: false }],
    });
    expect(parsed).toEqual({
      name: 'Evening workout', date: '2026-09-16',
      exercises: [{ exerciseId: known.id, name: known.name, sets: 4, reps: 8 }],
    });
  });

  test.each([0, -1, 1.5, '3', null, NaN, Infinity, 101])('rejects invalid sets %p', sets => {
    expect(() => parseManualWorkoutInput({ ...input(), exercises: [{ ...input().exercises[0], sets }] })).toThrow('Sets');
  });

  test.each([0, -1, 1.5, '12', null, NaN, Infinity, 1001])('rejects invalid reps %p', reps => {
    expect(() => parseManualWorkoutInput({ ...input(), exercises: [{ ...input().exercises[0], reps }] })).toThrow('Reps');
  });

  test.each(['', ' ', 'a'.repeat(81), 'Name\u0000'])('rejects invalid workout name %p', name => {
    expect(() => parseManualWorkoutInput({ ...input(), name })).toThrow('Workout name');
  });

  test.each(['', ' ', 'a'.repeat(101), 'Name\n'])('rejects invalid movement name %p', name => {
    expect(() => parseManualWorkoutInput({ ...input(), exercises: [{ ...input().exercises[0], name }] })).toThrow('Movement name');
  });

  test.each(['unknown-exercise', '', null, 123])('rejects unknown or invalid library ID %p', exerciseId => {
    expect(() => parseManualWorkoutInput({ ...input(), exercises: [{ ...input().exercises[0], exerciseId }] })).toThrow('valid exercise');
  });

  test.each([null, [], {}, '', undefined])('rejects invalid input %p', value => {
    expect(() => parseManualWorkoutInput(value)).toThrow();
  });

  test('requires one to thirty valid exercises', () => {
    for (const exercises of [[], new Array(31).fill(input().exercises[0]), [null], 'squat']) {
      expect(() => parseManualWorkoutInput({ ...input(), exercises })).toThrow();
    }
    expect(parseManualWorkoutInput({ ...input(), exercises: new Array(30).fill(input().exercises[0]) }).exercises).toHaveLength(30);
  });

  test.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-9-1', '2026-09-16T12:00:00Z', '1899-01-01', '2101-01-01', null])('rejects invalid calendar date %p', date => {
    expect(isWorkoutLogDate(date)).toBe(false);
    expect(() => parseManualWorkoutInput({ ...input(), date })).toThrow('date');
  });

  test('accepts leap days and represents dates without timezone conversion', () => {
    expect(isWorkoutLogDate('2024-02-29')).toBe(true);
    expect(parseManualWorkoutInput(input()).date).toBe('2026-09-16');
  });

  test('returns only documented history fields', () => {
    expect(loggedWorkoutView({ id: 'log', member_id: 'owner', ...input(), completed_at: '2026-09-16T12:00:00Z' })).toEqual({
      id: 'log', memberId: 'owner', ...input(), status: 'completed', completedAt: '2026-09-16T12:00:00Z',
    });
  });
});
