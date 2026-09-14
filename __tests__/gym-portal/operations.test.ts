jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/gym-auth', () => ({ checkGymAccess: jest.fn() }));
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkGymAccess } from '@/lib/gym-auth';
import { GET as members } from '@/app/api/gym/[gym_id]/members/route';
import { GET as activity } from '@/app/api/gym/[gym_id]/activity/route';
import { dailyCreditForScan, gymActivityData, gymMembersData, memberSearch, mergeGymScans, uniqueGymVisitors } from '@/lib/gym-operations-data';

const ctx = { params: { gym_id: 'gym-a' } };
beforeEach(() => jest.clearAllMocks());

test.each([401, 403, 503])('member and activity APIs fail closed when gym access returns %s', async status => {
  (checkGymAccess as jest.Mock).mockResolvedValue({ ok: false, status, reason: 'No gym access' });
  for (const route of [members, activity]) {
    const response = await route(new NextRequest('https://thrivv.dev/api/gym/gym-a/members'), ctx);
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toContain('no-store');
  }
  expect(supabase.from).not.toHaveBeenCalled();
});

function chain(data: unknown, error: unknown = null, count = 1) {
  const query: any = { then: (resolve: (value: unknown) => void) => resolve({ data, error, count }) };
  for (const name of ['select', 'eq', 'in', 'lte', 'gte', 'order', 'limit', 'or', 'range']) query[name] = jest.fn().mockReturnValue(query);
  return query;
}

test('roster filters both embedded verification sources to this gym and requests only operational fields', async () => {
  const query = chain([{ id: 'u1', first_name: 'Test', last_name: 'Member', membership_start_date: '2026-09-01', whoop: [{ scanned_at: '2026-09-11T12:00:00Z' }], manual: [{ scanned_at: '2026-09-12T12:00:00Z' }] }]);
  (supabase.from as jest.Mock).mockReturnValue(query);
  const result = await gymMembersData('gym-a', 'Test Member', 25);
  expect(query.eq.mock.calls).toEqual([['gym_id', 'gym-a'], ['whoop.gym_id', 'gym-a'], ['manual.gym_id', 'gym-a']]);
  expect(query.limit.mock.calls).toEqual([[1, { referencedTable: 'whoop' }], [1, { referencedTable: 'manual' }]]);
  expect(query.range).toHaveBeenCalledWith(25, 49);
  expect(query.select.mock.calls[0][0]).not.toMatch(/email|sleep|calories|token|reward_points/);
  expect(result.members[0]).toEqual({ id: 'u1', name: 'Test Member', joined_at: '2026-09-01', last_verified_at: '2026-09-12T12:00:00Z' });
  expect(memberSearch('Test),gym_id.eq.other,*')).toEqual(['Test', 'gym', 'id', 'eq', 'other']);
});

test('merged pagination visits every manual and WHOOP row exactly once even at shared timestamps', () => {
  const make = (source: 'manual' | 'whoop') => Array.from({ length: 70 }, (_, i) => ({ user_id: `u${i}`, request_id: `${i}`.padStart(3, '0'), score_date: '2026-09-12', scanned_at: '2026-09-12T12:00:00Z', source }));
  const manual = make('manual'), whoop = make('whoop');
  let cursor = { manual: 0, whoop: 0 }; const seen: string[] = [];
  while (true) {
    const page = mergeGymScans(manual.slice(cursor.manual, cursor.manual + 26), whoop.slice(cursor.whoop, cursor.whoop + 26), cursor);
    seen.push(...page.rows.map(row => `${row.source}:${row.request_id}`)); cursor = page.next;
    if (!page.has_more) break;
  }
  expect(seen).toHaveLength(140); expect(new Set(seen).size).toBe(140);
});

test('scan credit attribution matches member, day and source without estimating a per-scan award', () => {
  const scan = { user_id: 'u', score_date: '2026-09-12', source: 'manual' as const, request_id: 'r', scanned_at: '2026-09-12T12:00:00Z' };
  const entries = [{ user_id: 'u', score_date: '2026-09-12', source: 'whoop', awarded: 70, status: 'credited' }, { user_id: 'u', score_date: '2026-09-11', source: 'manual', awarded: 50, status: 'credited' }];
  expect(dailyCreditForScan(scan, entries)).toEqual({ points: null, status: 'not_credited' });
  expect(dailyCreditForScan(scan, [...entries, { user_id: 'u', score_date: '2026-09-12', source: 'manual', awarded: 40, status: 'credited' }])).toEqual({ points: 40, status: 'credited' });
});

test('activity uses a fixed snapshot and gym-scoped credit queries; ledger failure stays unavailable', async () => {
  const scan = { user_id: 'u', score_date: '2026-09-12', request_id: 'r', scanned_at: '2026-09-12T12:00:00Z' };
  const queries: Record<string, any> = {
    manual_gym_verifications: chain([scan]), gym_workout_verifications: chain([]),
    users: chain([{ id: 'u', first_name: 'Test', last_name: 'Member' }]), daily_reward_entitlements: chain(null, { message: 'Private failure' }),
  };
  (supabase.from as jest.Mock).mockImplementation(table => queries[table]);
  const result = await gymActivityData('gym-a', { manual: 0, whoop: 0 }, '2026-09-12T15:00:00Z');
  for (const table of ['manual_gym_verifications', 'gym_workout_verifications', 'daily_reward_entitlements']) expect(queries[table].eq).toHaveBeenCalledWith('gym_id', 'gym-a');
  expect(queries.manual_gym_verifications.lte).toHaveBeenCalledWith('scanned_at', '2026-09-12T15:00:00Z');
  expect(result.next.through).toBe('2026-09-12T15:00:00Z');
  expect(result.rows[0].daily_credit).toEqual({ points: null, status: 'unavailable' });
  expect(JSON.stringify(result)).not.toContain('Private failure');
});

test('unique visitors deduplicate across sources and never turn an unavailable source into zero', async () => {
  (supabase.from as jest.Mock).mockImplementation(table => chain(table === 'manual_gym_verifications' ? [{ user_id: 'u' }, { user_id: 'v' }] : [{ user_id: 'u' }]));
  expect(await uniqueGymVisitors('gym-a', '2026-09-05')).toBe(2);
  (supabase.from as jest.Mock).mockReturnValue(chain(null, { message: 'Unavailable' }));
  expect(await uniqueGymVisitors('gym-a', '2026-09-05')).toBeNull();
});
