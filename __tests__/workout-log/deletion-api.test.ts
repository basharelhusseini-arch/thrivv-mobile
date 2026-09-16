import { NextRequest } from 'next/server';

const getCurrentUser = jest.fn();
const from = jest.fn();
jest.mock('@/lib/auth', () => ({ getCurrentUser: (...args: unknown[]) => getCurrentUser(...args) }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: (...args: unknown[]) => from(...args) } }));
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (...args: unknown[]) => from(...args) }) }));

import { DELETE as deleteWorkout } from '@/app/api/workouts/[id]/route';
import { DELETE as deletePlan } from '@/app/api/workout-plans/[id]/route';

function result(data: unknown, error: unknown = null) {
  const query: any = {};
  for (const method of ['delete', 'eq', 'select']) query[method] = jest.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve);
  return query;
}

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: 'owner' });
});

describe.each([
  ['logged workout', deleteWorkout, 'workouts'],
  ['training plan', deletePlan, 'workout_plans'],
] as const)('%s deletion', (_label, remove, table) => {
  const request = (query = '?expectedUserId=owner', headers: Record<string, string> = {}) => new NextRequest(`https://www.thrivv.dev/api/${table}/record-id${query}`, {
    method: 'DELETE', headers: { 'x-user-id': 'victim', ...headers },
  });
  const context = () => ({ params: Promise.resolve({ id: 'record-id' }) });

  test('deletes only a record owned by the server-authenticated member', async () => {
    const query = result([{ id: 'record-id' }]);
    from.mockReturnValue(query);
    const response = await remove(request(), context());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(from.mock.calls).toEqual([[table]]);
    expect(query.delete).toHaveBeenCalledTimes(1);
    expect(query.eq.mock.calls).toEqual([['id', 'record-id'], ['member_id', 'owner']]);
    expect(query.select).toHaveBeenCalledWith('id');
  });

  test('rejects anonymous requests without touching data', async () => {
    getCurrentUser.mockResolvedValue(null);
    expect((await remove(request(), context())).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  test.each(['?expectedUserId=other', '?expectedUserId=', '?memberId=other'])('rejects account mismatch %s', async query => {
    expect((await remove(request(query), context())).status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  test.each<Record<string, string>>([{ origin: 'https://other.example' }, { 'sec-fetch-site': 'cross-site' }])('rejects cross-origin deletion %p', async headers => {
    expect((await remove(request('?expectedUserId=owner', headers), context())).status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  test('does not report another member record or missing record as deleted', async () => {
    from.mockReturnValue(result([]));
    expect((await remove(request(), context())).status).toBe(404);
  });

  test('reports a database failure without exposing backend details', async () => {
    from.mockReturnValue(result(null, { message: 'sensitive database details' }));
    const response = await remove(request(), context());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('sensitive');
  });
});
