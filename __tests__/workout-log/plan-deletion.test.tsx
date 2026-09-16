import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import MemberWorkoutsPage from '@/app/member/workouts/page';

(global as any).React = React;
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
let mockMemberId = 'owner';
jest.mock('@/lib/client-session', () => ({ useClientSession: () => ({ user: { id: mockMemberId } }) }));
jest.mock('@/components/MemberPageHeader', () => ({ __esModule: true, default: () => <h1>Workouts</h1> }));
jest.mock('@/components/MemberNextAction', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/LoggedWorkoutHistory', () => ({ __esModule: true, default: () => null }));

const originalFetch = global.fetch;
let renderer: TestRenderer.ReactTestRenderer | undefined;
let fakeWindow: EventTarget;
const plan = { id: 'plan-one', memberId: 'owner', name: 'Strength plan', description: 'Weekly strength sessions', status: 'active', duration: 4, frequency: 3 };
const activity = { date: '2026-09-16', timezone: 'Asia/Dubai', workouts: [], manual: null };
const response = (body: unknown) => ({ ok: true, json: async () => body });
const text = () => JSON.stringify(renderer!.toJSON());
const button = (label: string) => renderer!.root.findAllByType('button').find(node => node.children.includes(label))!;

beforeEach(() => {
  mockMemberId = 'owner';
  fakeWindow = new EventTarget();
  Object.defineProperty(global, 'window', { configurable: true, value: fakeWindow });
});
afterEach(() => {
  if (renderer) act(() => renderer!.unmount());
  renderer = undefined;
  global.fetch = originalFetch;
  delete (global as any).window;
});

test('training plans have a separate delete control and update after the last plan is removed', async () => {
  let plans = [plan];
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'DELETE') { plans = []; return response({ success: true }) as Response; }
    return response(String(url).includes('/api/workout-plans?') ? plans : activity) as Response;
  });
  await act(async () => { renderer = TestRenderer.create(<MemberWorkoutsPage />); });
  await act(async () => button('Training plans').props.onClick());
  expect(text()).toContain('1 saved plan');
  const planLink = renderer!.root.findByProps({ href: '/workouts/plan-one' });
  expect(planLink.findAllByType('button')).toHaveLength(0);
  await act(async () => button('Delete training plan').props.onClick());
  expect(global.fetch).toHaveBeenCalledWith('/api/workout-plans/plan-one?expectedUserId=owner', expect.objectContaining({ method: 'DELETE' }));
  expect(text()).not.toContain('Strength plan');
  expect(text()).toContain('Build a plan around your goals.');
  expect(renderer!.root.findByProps({ href: '/workouts/new' })).toBeDefined();
});

test('a late pre-delete refresh cannot restore a deleted plan card', async () => {
  let planFetches = 0;
  let finishStale!: (value: Response) => void;
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'DELETE') return response({ success: true }) as Response;
    if (!String(url).includes('/api/workout-plans?')) return response(activity) as Response;
    planFetches += 1;
    if (planFetches === 2) return new Promise<Response>(resolve => { finishStale = resolve; });
    return response(planFetches === 1 ? [plan] : []) as Response;
  });
  await act(async () => { renderer = TestRenderer.create(<MemberWorkoutsPage />); });
  await act(async () => button('Training plans').props.onClick());
  await act(async () => { fakeWindow.dispatchEvent(new Event('thrivv:workouts-synced')); });
  await act(async () => button('Delete training plan').props.onClick());
  expect(text()).not.toContain('Strength plan');
  await act(async () => finishStale(response([plan]) as Response));
  expect(text()).not.toContain('Strength plan');
  expect(text()).toContain('Build a plan around your goals.');
});

test('announces plan deletion and focuses the surviving list heading even when the last card disappears', async () => {
  const focus = jest.fn();
  let plans = [plan];
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'DELETE') { plans = []; return response({ success: true }) as Response; }
    return response(String(url).includes('/api/workout-plans?') ? plans : activity) as Response;
  });
  await act(async () => {
    renderer = TestRenderer.create(<MemberWorkoutsPage />, {
      createNodeMock: element => element.type === 'h2' ? { focus } : null,
    });
  });
  await act(async () => button('Training plans').props.onClick());
  expect(focus).not.toHaveBeenCalled();
  expect(renderer!.root.findByProps({ 'aria-live': 'polite' }).children).toHaveLength(0);
  await act(async () => button('Delete training plan').props.onClick());
  expect(focus).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByType('h2').props.tabIndex).toBe(-1);
  expect(text()).toContain('Training plan deleted.');
  expect(renderer!.root.findAllByType('article')).toHaveLength(0);
  mockMemberId = 'another-owner';
  await act(async () => { renderer!.update(<MemberWorkoutsPage />); });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(text()).not.toContain('Training plan deleted.');
});

test('a failed plan deletion does not announce success or move focus away from the dialog', async () => {
  const focus = jest.fn();
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'DELETE') return { ok: false, status: 503 } as Response;
    return response(String(url).includes('/api/workout-plans?') ? [plan] : activity) as Response;
  });
  await act(async () => {
    renderer = TestRenderer.create(<MemberWorkoutsPage />, {
      createNodeMock: element => element.type === 'h2' ? { focus } : null,
    });
  });
  await act(async () => button('Training plans').props.onClick());
  await act(async () => button('Delete training plan').props.onClick());
  expect(focus).not.toHaveBeenCalled();
  expect(text()).not.toContain('Training plan deleted.');
  expect(text()).toContain('Strength plan');
});
