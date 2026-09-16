import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import WorkoutLogForm from '@/components/WorkoutLogForm';
import { exercisesDatabase } from '@/lib/exercises';

(global as any).React = React;
const originalFetch = global.fetch;
const storageKey = 'thrivv:workout-log-draft:member-a';
const knownExercise = exercisesDatabase[0];
const savedWorkout = {
  id: 'workout-a', memberId: 'member-a', name: 'Upper body', date: '2026-09-16',
  status: 'completed', completedAt: '2026-09-16T12:00:00Z',
  exercises: [{ exerciseId: knownExercise.id, name: knownExercise.name, sets: 3, reps: 8 }],
};
let renderer: TestRenderer.ReactTestRenderer | undefined;
let storage: Map<string, string>;
let onSaved: jest.Mock;
let fakeWindow: EventTarget;
const text = () => JSON.stringify(renderer!.toJSON());
const field = (label: string, index = 0) => renderer!.root.findAllByType('label')
  .filter(node => node.findByType('span').children.join('') === label)[index].findByType('input');
const change = (label: string, value: string, index = 0) => act(() => field(label, index).props.onChange({ target: { value } }));
const addMovement = () => act(() => renderer!.root.findAllByType('button').find(button => button.children.includes('Add movement'))!.props.onClick());
const submit = () => renderer!.root.findByType('form').props.onSubmit({ preventDefault: jest.fn() });
const mount = async (memberId = 'member-a') => {
  await act(async () => { renderer = TestRenderer.create(<WorkoutLogForm memberId={memberId} onSaved={onSaved} />); });
};
const fillWorkout = (movement = knownExercise.name) => {
  change('Workout name', 'Upper body');
  change('Workout date', '2026-09-16');
  change('Movement', movement);
  change('Sets', '3');
  change('Reps per set', '8');
};

beforeEach(() => {
  storage = new Map();
  onSaved = jest.fn();
  fakeWindow = new EventTarget();
  global.fetch = jest.fn();
  Object.defineProperty(global, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(global, 'localStorage', { configurable: true, value: {
    getItem: jest.fn((key: string) => storage.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: jest.fn((key: string) => storage.delete(key)),
  } });
});

afterEach(() => {
  if (renderer) act(() => renderer!.unmount());
  renderer = undefined;
  global.fetch = originalFetch;
  delete (global as any).window;
  delete (global as any).localStorage;
});

test('adds and removes movements without losing remaining sets and reps', async () => {
  await mount();
  expect(renderer!.root.findByProps({ 'aria-label': 'Remove movement 1' }).props.disabled).toBe(true);
  fillWorkout();
  addMovement();
  change('Movement', 'Band pull-apart', 1);
  change('Sets', '2', 1);
  change('Reps per set', '12', 1);
  expect(renderer!.root.findAllByType('section')).toHaveLength(2);
  act(() => renderer!.root.findByProps({ 'aria-label': 'Remove movement 1' }).props.onClick());
  expect(renderer!.root.findAllByType('section')).toHaveLength(1);
  expect(field('Movement').props.value).toBe('Band pull-apart');
  expect(field('Sets').props.value).toBe('2');
  expect(field('Reps per set').props.value).toBe('12');
  expect(renderer!.root.findByProps({ 'aria-label': 'Remove movement 1' }).props.disabled).toBe(true);
});

test('uses library coaching tips for exact case-insensitive matches and general tips for custom movements', async () => {
  await mount();
  change('Movement', `  ${knownExercise.name.toUpperCase()}  `);
  knownExercise.tips.forEach(tip => expect(text()).toContain(tip));
  expect(text()).not.toContain('General coaching tips');
  change('Movement', 'My custom band movement');
  expect(text()).toContain('General coaching tips');
  knownExercise.tips.forEach(tip => expect(text()).not.toContain(tip));
  expect(text()).toContain('Use a controlled movement and a comfortable range of motion.');
});

test.each([
  ['Workout name', ''], ['Workout date', ''], ['Movement', '  '],
  ['Sets', ''], ['Sets', '0'], ['Sets', '1.5'], ['Sets', '101'],
  ['Reps per set', '0'], ['Reps per set', '2.5'], ['Reps per set', '1001'],
])('rejects invalid %s value %s without sending a request', async (label, value) => {
  await mount();
  fillWorkout();
  change(label, value);
  await act(async () => { await submit(); });
  expect(global.fetch).not.toHaveBeenCalled();
  expect(renderer!.root.findByProps({ role: 'alert' }).children.join('')).toContain('valid sets and reps');
  expect(onSaved).not.toHaveBeenCalled();
});

test('saves the member-bound movements once, refreshes history, and clears only the saved member draft', async () => {
  let resolve!: (response: unknown) => void;
  global.fetch = jest.fn().mockImplementation(() => new Promise(resolveRequest => { resolve = resolveRequest; }));
  const historyRefresh = jest.fn();
  fakeWindow.addEventListener('thrivv:workouts-synced', historyRefresh);
  storage.set('thrivv:workout-log-draft:member-b', 'untouched');
  await mount();
  fillWorkout();
  addMovement();
  change('Movement', '  Band pull-apart  ', 1);
  change('Sets', '2', 1);
  change('Reps per set', '12', 1);
  expect(storage.has(storageKey)).toBe(true);
  act(() => { void submit(); void submit(); });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByType('fieldset').props.disabled).toBe(true);
  const [url, request] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe('/api/workouts/log');
  expect(request.method).toBe('POST');
  expect(JSON.parse(request.body)).toEqual({
    expectedUserId: 'member-a', name: 'Upper body', date: '2026-09-16', exercises: [
      { exerciseId: knownExercise.id, name: knownExercise.name, sets: 3, reps: 8 },
      { name: 'Band pull-apart', sets: 2, reps: 12 },
    ],
  });
  await act(async () => { resolve({ ok: true, json: async () => ({ workout: savedWorkout }) }); });
  expect(onSaved).toHaveBeenCalledWith(savedWorkout);
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(historyRefresh).toHaveBeenCalledTimes(1);
  expect(storage.has(storageKey)).toBe(false);
  expect(storage.get('thrivv:workout-log-draft:member-b')).toBe('untouched');
  expect(text()).toContain('Workout saved.');
  await act(async () => { await submit(); });
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('keeps entries and the local draft after a server error and allows retry', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Workout storage is temporarily unavailable.' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ workout: savedWorkout }) });
  await mount();
  fillWorkout();
  await act(async () => { await submit(); });
  expect(text()).toContain('Workout storage is temporarily unavailable.');
  expect(field('Workout name').props.value).toBe('Upper body');
  expect(field('Movement').props.value).toBe(knownExercise.name);
  expect(field('Sets').props.value).toBe('3');
  expect(field('Reps per set').props.value).toBe('8');
  expect(storage.has(storageKey)).toBe(true);
  expect(renderer!.root.findByType('fieldset').props.disabled).toBe(false);
  expect(onSaved).not.toHaveBeenCalled();
  await act(async () => { await submit(); });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(storage.has(storageKey)).toBe(false);
});

test('restores a member draft after reload without exposing it to another member', async () => {
  await mount();
  fillWorkout('Custom movement');
  act(() => { renderer!.unmount(); renderer = undefined; });
  await mount('member-b');
  expect(field('Workout name').props.value).toBe('');
  expect(field('Movement').props.value).toBe('');
  act(() => { renderer!.unmount(); renderer = undefined; });
  await mount('member-a');
  expect(field('Workout name').props.value).toBe('Upper body');
  expect(field('Movement').props.value).toBe('Custom movement');
  expect(field('Sets').props.value).toBe('3');
  expect(field('Reps per set').props.value).toBe('8');
});
