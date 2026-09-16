import { NextRequest } from 'next/server';

const from = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...args: unknown[]) => from(...args) }),
}));

import { POST } from '@/app/api/consistency-check/route';

type WorkoutRow = {
  id: string;
  member_id: string;
  workout_plan_id: string | null;
  duration: number | null;
  created_at: string;
};

type WorkoutQuery = {
  select: jest.Mock;
  not: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  limit: jest.Mock;
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
};

let rows: WorkoutRow[];
let events: Record<string, unknown>[];
let workoutQueries: ReturnType<typeof workoutQuery>[];
const originalSecret = process.env.CRON_SECRET;

function workoutQuery() {
  let selected = [...rows];
  let countOnly = false;
  const query: WorkoutQuery = {
    select: jest.fn((_columns: string, options?: { head?: boolean }) => {
      countOnly = Boolean(options?.head);
      return query;
    }),
    not: jest.fn((column: keyof WorkoutRow, operator: string, value: unknown) => {
      if (operator === 'is' && value === null) selected = selected.filter(row => row[column] !== null);
      return query;
    }),
    eq: jest.fn((column: keyof WorkoutRow, value: unknown) => {
      selected = selected.filter(row => row[column] === value);
      return query;
    }),
    gte: jest.fn((column: 'created_at', value: string) => {
      selected = selected.filter(row => row[column] >= value);
      return query;
    }),
    limit: jest.fn((count: number) => {
      selected = selected.slice(0, count);
      return query;
    }),
    then: (resolve: (value: unknown) => unknown): Promise<unknown> => Promise.resolve({
      data: countOnly ? null : selected,
      count: countOnly ? selected.length : null,
    }).then(resolve),
  };
  return query;
}

function request() {
  return new NextRequest('https://www.thrivv.dev/api/consistency-check', {
    method: 'POST', headers: { authorization: 'Bearer test-cron-secret' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = 'test-cron-secret';
  rows = [];
  events = [];
  workoutQueries = [];
  from.mockImplementation((table: string) => {
    if (table === 'health_scores') {
      const query = { select: () => query, gte: () => query, gt: async () => ({ data: [] }) };
      return query;
    }
    if (table === 'verification_events') return { insert: async (event: Record<string, unknown>) => { events.push(event); return { error: null }; } };
    if (table === 'workouts') {
      const query = workoutQuery();
      workoutQueries.push(query);
      return query;
    }
    throw new Error(`Unexpected table: ${table}`);
  });
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

test('personal workout logs never create consistency verification events', async () => {
  rows = [{ id: 'manual-log', member_id: 'member-a', workout_plan_id: null, duration: null, created_at: new Date().toISOString() }];
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).results.workouts).toEqual({ checked: 0, passed: 0, flagged: 0 });
  expect(events).toEqual([]);
  expect(workoutQueries[0].not).toHaveBeenCalledWith('workout_plan_id', 'is', null);
});

test('personal logs do not inflate the daily count or flag a generated workout', async () => {
  const created_at = new Date().toISOString();
  rows = [
    { id: 'planned-workout', member_id: 'member-a', workout_plan_id: 'plan-a', duration: 30, created_at },
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `manual-${index}`, member_id: 'member-a', workout_plan_id: null, duration: null, created_at,
    })),
  ];
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).results.workouts).toEqual({ checked: 1, passed: 1, flagged: 0 });
  expect(events).toEqual([expect.objectContaining({
    entity_id: 'planned-workout', user_id: 'member-a', status: 'verified', method: 'consistency_check',
  })]);
  expect(workoutQueries).toHaveLength(2);
  expect(workoutQueries[1].not).toHaveBeenCalledWith('workout_plan_id', 'is', null);
});
