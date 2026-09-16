import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import WorkoutPlanDetailPage from '@/app/workouts/[id]/page';

(global as any).React = React;
let routeId = 'plan-a';
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useParams: () => ({ id: routeId }), useRouter: () => ({ replace }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/WorkoutDeleteButton', () => ({ __esModule: true, default: ({ id }: { id: string }) => <button data-delete-plan={id}>Delete</button> }));

const originalFetch = global.fetch;
let renderer: TestRenderer.ReactTestRenderer | undefined;
const plan = (id: string) => ({ id, memberId: 'owner', name: `Name for ${id}`, description: 'Strength training', goal: 'build_muscle', difficulty: 'beginner', status: 'active', duration: 4, frequency: 3 });
const workout = (id: string) => ({ id: `session-${id}`, workoutPlanId: id, name: `Session for ${id}`, date: '2026-09-16', exercises: [], status: 'scheduled' });
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
const text = () => JSON.stringify(renderer!.toJSON());
const deleteButtons = () => renderer!.root.findAllByType('button').filter(node => node.props['data-delete-plan']);

beforeEach(() => { routeId = 'plan-a'; jest.clearAllMocks(); });
afterEach(() => {
  if (renderer) act(() => renderer!.unmount());
  renderer = undefined;
  global.fetch = originalFetch;
});

test.each(['missing', 'failed'])('never shows or deletes the previous plan when the next route is %s', async failure => {
  global.fetch = jest.fn(async url => {
    const path = String(url);
    if (path === '/api/exercises') return response([]) as Response;
    if (path.includes('/api/workouts?')) return response(path.includes('plan-a') ? [workout('plan-a')] : []) as Response;
    if (path.endsWith('plan-a')) return response(plan('plan-a')) as Response;
    if (failure === 'failed') throw new Error('Network unavailable');
    return response({ error: 'Not found' }, false) as Response;
  });
  await act(async () => { renderer = TestRenderer.create(<WorkoutPlanDetailPage />); });
  expect(deleteButtons()[0].props['data-delete-plan']).toBe('plan-a');
  routeId = 'plan-b';
  await act(async () => { renderer!.update(<WorkoutPlanDetailPage />); });
  expect(text()).toContain('Workout plan not found');
  expect(text()).not.toContain('Name for plan-a');
  expect(text()).not.toContain('Session for plan-a');
  expect(deleteButtons()).toHaveLength(0);
});

test('ignores an old plan response arriving after the new route has loaded', async () => {
  let finishOld!: (value: Response) => void;
  global.fetch = jest.fn(async url => {
    const path = String(url);
    if (path === '/api/exercises') return response([]) as Response;
    if (path.includes('/api/workouts?')) return response([workout(path.includes('plan-a') ? 'plan-a' : 'plan-b')]) as Response;
    if (path.endsWith('plan-a')) return new Promise<Response>(resolve => { finishOld = resolve; });
    return response(plan('plan-b')) as Response;
  });
  await act(async () => { renderer = TestRenderer.create(<WorkoutPlanDetailPage />); });
  const oldSignal = (global.fetch as jest.Mock).mock.calls[0][1].signal;
  routeId = 'plan-b';
  await act(async () => { renderer!.update(<WorkoutPlanDetailPage />); });
  expect(oldSignal.aborted).toBe(true);
  expect(deleteButtons()[0].props['data-delete-plan']).toBe('plan-b');
  await act(async () => { finishOld(response(plan('plan-a')) as Response); });
  expect(text()).not.toContain('Name for plan-a');
  expect(text()).not.toContain('Session for plan-a');
  expect(text()).toContain('Session for plan-b');
  expect(deleteButtons()[0].props['data-delete-plan']).toBe('plan-b');
});

test('hides the old delete control as soon as another route starts loading', async () => {
  global.fetch = jest.fn(async url => {
    const path = String(url);
    if (path === '/api/exercises' || path.includes('/api/workouts?')) return response([]) as Response;
    if (path.endsWith('plan-a')) return response(plan('plan-a')) as Response;
    return new Promise<Response>(() => {});
  });
  await act(async () => { renderer = TestRenderer.create(<WorkoutPlanDetailPage />); });
  expect(deleteButtons()).toHaveLength(1);
  routeId = 'plan-b';
  await act(async () => { renderer!.update(<WorkoutPlanDetailPage />); });
  expect(text()).toContain('Loading workout plan...');
  expect(text()).not.toContain('Name for plan-a');
  expect(deleteButtons()).toHaveLength(0);
});

test('rejects a mismatched plan identity returned for the current URL', async () => {
  global.fetch = jest.fn(async url => response(String(url).includes('/api/workout-plans/') ? plan('plan-b') : []) as Response);
  await act(async () => { renderer = TestRenderer.create(<WorkoutPlanDetailPage />); });
  expect(text()).toContain('Workout plan not found');
  expect(deleteButtons()).toHaveLength(0);
});
