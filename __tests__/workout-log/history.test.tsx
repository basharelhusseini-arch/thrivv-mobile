jest.mock('@/lib/use-workout-progress',()=>({useWorkoutProgress:()=>({progress:[],error:''})}));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import LoggedWorkoutHistory from '@/components/LoggedWorkoutHistory';

(global as any).React = React;
jest.mock('next/navigation', () => ({useRouter: () => ({push: jest.fn()})}));
jest.mock('@/components/WorkoutCoachingTips', () => ({
  __esModule: true,
  default: ({ exerciseId }: { exerciseId?: string }) => <p>{exerciseId ? `Coaching tips: ${exerciseId}` : 'General coaching tips'}</p>,
}));

const originalFetch = global.fetch;
let renderer: TestRenderer.ReactTestRenderer | undefined;
let fakeWindow: EventTarget;
const workout = {
  id: 'workout-a', memberId: 'member-a', name: 'Upper body session', date: '2026-09-16',
  status: 'completed', completedAt: '2026-09-16T12:00:00.000Z',
  exercises: [
    { exerciseId: 'bench-press', name: 'Bench Press', sets: 3, reps: 8 },
    { name: 'My band movement', sets: 2, reps: 12 },
  ],
};
const response = (workouts: unknown[]) => ({ ok: true, json: async () => ({ workouts }) });
const text = () => JSON.stringify(renderer!.toJSON());
const retry = () => renderer!.root.findByType('button').props.onClick();

beforeEach(() => {
  fakeWindow = new EventTarget();
  Object.defineProperty(global, 'window', { configurable: true, value: fakeWindow });
});

afterEach(() => {
  if (renderer) act(() => renderer!.unmount());
  renderer = undefined;
  global.fetch = originalFetch;
  delete (global as any).window;
});

test('loads logged workouts with dates, sets, reps and coaching tips for every movement', async () => {
  global.fetch = jest.fn().mockResolvedValue(response([workout]));
  await act(async () => { renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />); });
  expect(global.fetch).toHaveBeenCalledWith('/api/workouts/log?expectedUserId=member-a&offset=0', expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }));
  expect(text()).toContain('Upper body session');
  expect(renderer!.root.findByType('time').props.dateTime).toBe('2026-09-16');
  expect(renderer!.root.findAllByType('details')).toHaveLength(1);
  expect(renderer!.root.findAllByType('li')).toHaveLength(2);
  expect(text()).toContain('Bench Press');
  expect(text()).toContain('Coaching tips: bench-press');
  expect(text()).toContain('General coaching tips');
  const counts = renderer!.root.findAllByType('p').map(node => node.children.join(''));
  expect(counts).toContain('3 sets x 8 reps');
  expect(counts).toContain('2 sets x 12 reps');
});

test('shows loading, failure with retry, and an empty state', async () => {
  let reject!: (error: Error) => void;
  global.fetch = jest.fn()
    .mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }))
    .mockResolvedValueOnce(response([]));
  await act(async () => { renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />); });
  expect(text()).toContain('Loading logged workouts...');
  await act(async () => { reject(new Error('offline')); });
  expect(renderer!.root.findByProps({ role: 'alert' })).toBeDefined();
  await act(async () => { retry(); });
  expect(text()).toContain('No workouts logged yet.');
  expect(text()).not.toContain('Unable to load');
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('refreshes after a workout is saved', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([workout]));
  await act(async () => { renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />); });
  await act(async () => { fakeWindow.dispatchEvent(new Event('thrivv:workouts-synced')); });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(text()).toContain('Upper body session');
});

test('clears previous member history on an account switch and ignores their late response', async () => {
  let resolveA!: (result: ReturnType<typeof response>) => void;
  let resolveB!: (result: ReturnType<typeof response>) => void;
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(response([workout]))
    .mockImplementationOnce(() => new Promise(resolve => { resolveA = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { resolveB = resolve; }));
  global.fetch = fetchMock;
  await act(async () => { renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />); });
  expect(text()).toContain('Upper body session');
  await act(async () => { fakeWindow.dispatchEvent(new Event('thrivv:workouts-synced')); });
  await act(async () => { renderer!.update(<LoggedWorkoutHistory memberId="member-b" />); });
  expect(text()).not.toContain('Upper body session');
  expect(fetchMock.mock.calls[1][1].signal.aborted).toBe(true);
  await act(async () => { resolveB(response([{ ...workout, id: 'workout-b', memberId: 'member-b', name: 'Member B workout' }])); });
  await act(async () => { resolveA(response([workout])); });
  expect(text()).toContain('Member B workout');
  expect(text()).not.toContain('Upper body session');
});

test('aborts an outstanding request and removes the refresh listener on unmount', async () => {
  global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
  await act(async () => { renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />); });
  const signal = (global.fetch as jest.Mock).mock.calls[0][1].signal;
  act(() => { renderer!.unmount(); renderer = undefined; });
  expect(signal.aborted).toBe(true);
  act(() => { fakeWindow.dispatchEvent(new Event('thrivv:workouts-synced')); });
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('deleting a logged workout updates history and preserves the remaining coaching tips', async () => {
  const remaining = { ...workout, id: 'workout-b', name: 'Another workout' };
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response([workout, remaining]))
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce(response([remaining]));
  await act(async () => { renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />); });
  const remove = renderer!.root.findAllByType('button').find(node => node.children.includes('Delete logged workout'))!;
  await act(async () => { remove.props.onClick(); });
  expect(text()).not.toContain('Upper body session');
  expect(text()).toContain('Another workout');
  expect(text()).toContain('Coaching tips: bench-press');
  expect(renderer!.root.findAllByType('details')).toHaveLength(1);
  expect(global.fetch).toHaveBeenCalledWith('/api/workouts/workout-a?expectedUserId=member-a', expect.objectContaining({ method: 'DELETE' }));
});

test('deleting the last logged workout exposes the empty state', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response([workout]))
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce(response([]));
  await act(async () => { renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />); });
  const remove = renderer!.root.findAllByType('button').find(node => node.children.includes('Delete logged workout'))!;
  await act(async () => { remove.props.onClick(); });
  expect(text()).toContain('No workouts logged yet.');
  expect(renderer!.root.findAllByType('details')).toHaveLength(0);
});

test('announces deletion and focuses the surviving heading after removing the focused workout', async () => {
  const focus = jest.fn();
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response([workout]))
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce(response([]));
  await act(async () => {
    renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />, {
      createNodeMock: element => element.type === 'h2' ? { focus } : null,
    });
  });
  expect(focus).not.toHaveBeenCalled();
  const region = renderer!.root.findByProps({ 'aria-live': 'polite' });
  expect(region.props['aria-atomic']).toBe('true');
  expect(region.children).toHaveLength(0);
  const remove = renderer!.root.findAllByType('button').find(node => node.children.includes('Delete logged workout'))!;
  await act(async () => { remove.props.onClick(); });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByType('h2').props.tabIndex).toBe(-1);
  expect(renderer!.root.findAllByType('details')).toHaveLength(0);
  expect(text()).toContain('Logged workout deleted.');
});

test('does not announce or move focus for failed deletion and clears notices on an account switch', async () => {
  const focus = jest.fn();
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response([workout]))
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(response([]));
  await act(async () => {
    renderer = TestRenderer.create(<LoggedWorkoutHistory memberId="member-a" />, {
      createNodeMock: element => element.type === 'h2' ? { focus } : null,
    });
  });
  const remove = renderer!.root.findAllByType('button').find(node => node.children.includes('Delete logged workout'))!;
  await act(async () => { remove.props.onClick(); });
  expect(focus).not.toHaveBeenCalled();
  expect(text()).not.toContain('Logged workout deleted.');
  await act(async () => { remove.props.onClick(); });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(text()).toContain('Logged workout deleted.');
  await act(async () => { renderer!.update(<LoggedWorkoutHistory memberId="member-b" />); });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(text()).not.toContain('Logged workout deleted.');
});
