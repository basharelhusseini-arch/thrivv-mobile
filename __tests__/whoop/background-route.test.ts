jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/whoop/sync', () => ({ syncMemberWorkouts: jest.fn() }));

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncMemberWorkouts } from '@/lib/whoop/sync';
import { GET, POST } from '@/app/api/internal/whoop/process/route';

const originalSecret = process.env.CRON_SECRET;
let due: { id: string }[];
let queueError: object | null;
const defer = jest.fn(async () => ({ error: null }));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = 'cron-test-secret';
  due = [];
  queueError = null;
  (supabase.from as jest.Mock).mockImplementation(() => {
    const queue: any = {};
    for (const method of ['select', 'not', 'lte', 'order']) queue[method] = jest.fn(() => queue);
    queue.limit = jest.fn(async () => ({ data: due, error: queueError }));
    queue.update = jest.fn(() => ({ eq: defer }));
    return queue;
  });
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

function request(method: 'GET' | 'POST' = 'GET', authorization = 'Bearer cron-test-secret') {
  return new NextRequest('https://thrivv.dev/api/internal/whoop/process', { method, headers: { authorization } });
}

test('rejects requests without the exact cron bearer secret', async () => {
  expect((await GET(request('GET', 'Bearer wrong'))).status).toBe(401);
  expect(supabase.from).not.toHaveBeenCalled();
});

test('GET syncs the due batch and defers individual failures', async () => {
  due = [{ id: 'member-1' }, { id: 'member-2' }];
  (syncMemberWorkouts as jest.Mock).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('WHOOP unavailable'));
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ queued: 2, synced: 1, deferred: 1 });
  expect(syncMemberWorkouts).toHaveBeenCalledTimes(2);
  expect(defer).toHaveBeenCalledWith('id', 'member-2');
});

test('POST remains an authorized manual trigger and queue errors are retryable', async () => {
  queueError = { message: 'offline' };
  expect((await POST(request('POST'))).status).toBe(503);
});
