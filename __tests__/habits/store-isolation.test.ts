import { store } from '@/lib/store';
import type { Habit, HabitEntry } from '@/types';

const internal = store as unknown as { habits: Habit[]; habitEntries: HabitEntry[] };
const savedHabits = internal.habits;
const savedEntries = internal.habitEntries;
beforeEach(() => { internal.habits = []; internal.habitEntries = []; });
afterAll(() => { internal.habits = savedHabits; internal.habitEntries = savedEntries; });

test('new habit and entry ids remain unique when created in the same millisecond', () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(12345);
  try {
    const first = store.addHabit({ memberId: 'a', name: 'One', category: 'health', frequency: 'daily', status: 'active' });
    const second = store.addHabit({ memberId: 'b', name: 'Two', category: 'health', frequency: 'daily', status: 'active' });
    const entryA = store.addHabitEntry({ memberId: 'a', habitId: first.id, date: '2026-01-01', completed: false });
    const entryB = store.addHabitEntry({ memberId: 'b', habitId: second.id, date: '2026-01-01', completed: false });
    expect(new Set([first.id, second.id, entryA.id, entryB.id]).size).toBe(4);
  } finally { clock.mockRestore(); }
});

test('scoped toggles cannot alter another member with a colliding legacy entry id', () => {
  const victim = { id: 'old-id', memberId: 'victim', habitId: 'victim-habit', date: '2026-01-01', completed: false };
  const own = { ...victim, memberId: 'owner', habitId: 'owner-habit' };
  internal.habitEntries = [victim, own];
  const result = store.updateHabitEntry('old-id', { completed: true }, { memberId: 'owner', habitId: 'owner-habit' });
  expect(result).toEqual({ ...own, completed: true });
  expect(internal.habitEntries[0]).toEqual(victim);
  expect(store.updateHabitEntry('old-id', { completed: true }, { memberId: 'owner', habitId: 'victim-habit' })).toBeNull();
});

test('deleting a habit preserves another member entry with a colliding legacy parent id', () => {
  const habit: Habit = { id: 'old-habit', memberId: 'owner', name: 'Own', category: 'health', frequency: 'daily', status: 'active', createdAt: '2026-01-01' };
  const victimEntry: HabitEntry = { id: 'victim-entry', memberId: 'victim', habitId: habit.id, date: '2026-01-01', completed: true };
  internal.habits = [habit];
  internal.habitEntries = [victimEntry, { ...victimEntry, id: 'own-entry', memberId: 'owner' }];
  expect(store.deleteHabit(habit.id)).toBe(true);
  expect(internal.habitEntries).toEqual([victimEntry]);
});
