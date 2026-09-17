import { NextRequest } from 'next/server';

const getCurrentUser = jest.fn();
const from = jest.fn();
jest.mock('@/lib/auth', () => ({ getCurrentUser: (...args: unknown[]) => getCurrentUser(...args) }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: (...args: unknown[]) => from(...args) } }));

import { GET, POST } from '@/app/api/workouts/log/route';
import { exercisesDatabase } from '@/lib/exercises';

const payload = () => ({ name: 'My workout', date: '2026-09-16', exercises: [{ name: 'Custom movement', sets: 3, reps: 12 }] });
function request(method = 'GET', body?: unknown, query = '', headers: Record<string, string> = {}) {
  return new NextRequest(`https://www.thrivv.dev/api/workouts/log${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'victim', ...headers },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
function result(data: unknown, error: unknown = null) {
  const chain: any = {};
  for (const method of ['select', 'eq', 'is', 'order', 'insert', 'range']) chain[method] = jest.fn(() => chain);
  chain.single = jest.fn(async () => ({ data, error }));
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve);
  return chain;
}
const row = () => ({ id: 'log-1', member_id: 'owner', ...payload(), completed_at: '2026-09-16T12:00:00Z' });

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: 'owner' });
});

test('anonymous requests cannot read or save logs', async () => {
  getCurrentUser.mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  expect((await POST(request('POST', payload()))).status).toBe(401);
  expect(from).not.toHaveBeenCalled();
});

test('history is owner-scoped, standalone, completed and newest first', async () => {
  const query = result([row()]);
  from.mockReturnValue(query);
  const response = await GET(request('GET', undefined, '?expectedUserId=owner'));
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(from).toHaveBeenCalledWith('workouts');
  expect(query.eq).toHaveBeenCalledWith('member_id', 'owner');
  expect(query.eq).toHaveBeenCalledWith('status', 'completed');
  expect(query.is).toHaveBeenCalledWith('workout_plan_id', null);
  expect(query.order.mock.calls).toEqual([['date', { ascending: false }], ['completed_at', { ascending: false }], ['id']]);
  expect(await response.json()).toEqual({ hasMore: false, workouts: [{ id: 'log-1', memberId: 'owner', ...payload(), status: 'completed', completedAt: row().completed_at }] });
});

test.each(['?expectedUserId=victim', '?memberId=victim'])('rejects foreign account requests %s', async query => {
  expect((await GET(request('GET', undefined, query))).status).toBe(403);
  expect(from).not.toHaveBeenCalled();
});

test.each([{ expectedUserId: 'victim' }, { memberId: 'victim' }])('rejects account-switch or spoofed owner on save %p', async fields => {
  expect((await POST(request('POST', { ...payload(), ...fields }))).status).toBe(403);
  expect(from).not.toHaveBeenCalled();
});

test('creates a completed record with server identity, UUID and timestamp only', async () => {
  const query = result(row());
  from.mockReturnValue(query);
  const exercise = exercisesDatabase[0];
  const response = await POST(request('POST', {
    ...payload(), expectedUserId: 'owner', memberId: 'owner', id: 'forged-id', status: 'scheduled',
    completedAt: '1900-01-01', workoutPlanId: 'victim-plan', points: 1000,
    exercises: [{ exerciseId: exercise.id, name: 'Forged name', sets: 4, reps: 8, tips: ['Unsafe cue'] }],
  }));
  expect(response.status).toBe(201);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(query.insert).toHaveBeenCalledWith({
    id: expect.stringMatching(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/),
    member_id: 'owner', workout_plan_id: null, name: 'My workout', date: '2026-09-16',
    exercises: [{ exerciseId: exercise.id, name: exercise.name, sets: 4, reps: 8 }],
    status: 'completed', completed_at: expect.any(String),
  });
  expect(Number.isFinite(Date.parse(query.insert.mock.calls[0][0].completed_at))).toBe(true);
  expect(from.mock.calls).toEqual([['workouts']]);
  expect((await response.json()).workout.memberId).toBe('owner');
});

test.each<Record<string, string>>([{ origin: 'https://other.example' }, { 'sec-fetch-site': 'cross-site' }])('rejects cross-site writes %p', async headers => {
  expect((await POST(request('POST', payload(), '', headers))).status).toBe(403);
  expect(from).not.toHaveBeenCalled();
});

test.each([
  { name: '' }, { date: '2026-02-30' }, { exercises: [] },
  { exercises: [{ name: 'Movement', sets: -1, reps: 10 }] },
  { exercises: [{ name: 'Movement', sets: 3, reps: 1.5 }] },
  { exercises: [{ name: 'Movement', exerciseId: 'unknown', sets: 3, reps: 10 }] },
])('rejects invalid workout data without saving %p', async invalid => {
  expect((await POST(request('POST', { ...payload(), ...invalid }))).status).toBe(400);
  expect(from).not.toHaveBeenCalled();
});

test('rejects malformed and oversized payloads', async () => {
  const malformed = new NextRequest('https://www.thrivv.dev/api/workouts/log', { method: 'POST', body: '{bad' });
  expect((await POST(malformed)).status).toBe(400);
  expect((await POST(request('POST', { ...payload(), extra: 'a'.repeat(32000) }))).status).toBe(413);
  expect(from).not.toHaveBeenCalled();
});

test('returns an empty history instead of an error when there are no logs', async () => {
  from.mockReturnValue(result(null));
  expect(await (await GET(request())).json()).toEqual({ workouts: [], hasMore: false });
});

test('database failures are not reported as saved or exposed to the caller', async () => {
  from.mockReturnValue(result(null, { message: 'sensitive backend detail' }));
  const response = await POST(request('POST', payload()));
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain('sensitive');
  expect((await GET(request())).status).toBe(503);
});
test('retries use the same owner-scoped save reference without creating another workout',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const duplicate=result(null,{code:'23505'});const original=result(row());from.mockReturnValueOnce(duplicate).mockReturnValueOnce(original);
 const response=await POST(request('POST',{...payload(),requestId:id}));expect(response.status).toBe(200);expect(original.eq).toHaveBeenCalledWith('member_id','owner');expect(original.eq).toHaveBeenCalledWith('log_request_id',id);
});
test('save retries compare JSONB content rather than object key order',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 from.mockReturnValueOnce(result(null,{code:'23505'})).mockReturnValueOnce(result({...row(),exercises:[{reps:12,sets:3,name:'Custom movement'}]}));
 expect((await POST(request('POST',{...payload(),requestId:id}))).status).toBe(200);
});
