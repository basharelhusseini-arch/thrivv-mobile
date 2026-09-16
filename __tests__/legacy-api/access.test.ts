jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/lib/gym-auth', () => ({ checkAdminAccess: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/store', () => ({ store: Object.fromEntries([
  'getAllMembers', 'getMember', 'addMember', 'updateMember', 'deleteMember',
  'getAllMemberships', 'getMembership', 'addMembership', 'updateMembership', 'deleteMembership',
  'getAllTrainers', 'getTrainer', 'addTrainer', 'updateTrainer', 'deleteTrainer',
  'getAllClasses', 'getClass', 'addClass', 'updateClass', 'deleteClass',
  'getAllExercises', 'getExercise', 'addExercise', 'updateExercise', 'deleteExercise',
  'getAllRecipes', 'getRecipe', 'addRecipe', 'getMemberSessions',
  'getMemberPayments', 'createPayment', 'getMemberNotifications', 'createNotification',
  'checkInMember', 'addToWaitlist', 'removeFromWaitlist', 'processWaitlist',
  'getWhoopConnection', 'addWhoopConnection', 'deleteWhoopConnection', 'addWhoopData', 'getWhoopData',
].map(name => [name, jest.fn()])) }));

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { checkAdminAccess } from '@/lib/gym-auth';
import { store } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import * as members from '@/app/api/members/route';
import * as member from '@/app/api/members/[id]/route';
import * as memberships from '@/app/api/memberships/route';
import * as membership from '@/app/api/memberships/[id]/route';
import * as trainers from '@/app/api/trainers/route';
import * as trainer from '@/app/api/trainers/[id]/route';
import * as classes from '@/app/api/classes/route';
import * as gymClass from '@/app/api/classes/[id]/route';
import * as exercises from '@/app/api/exercises/route';
import * as exercise from '@/app/api/exercises/[id]/route';
import * as recipes from '@/app/api/recipes/route';
import * as recipe from '@/app/api/recipes/[id]/route';
import * as enroll from '@/app/api/classes/[id]/enroll/route';
import * as waitlist from '@/app/api/classes/[id]/waitlist/route';
import * as checkin from '@/app/api/classes/[id]/checkin/route';
import * as payments from '@/app/api/member/payments/route';
import * as notifications from '@/app/api/member/notifications/route';
import * as sessions from '@/app/api/member/[id]/sessions/route';
import * as connection from '@/app/api/whoop/connection/route';
import * as data from '@/app/api/whoop/data/route';

type Handler = (request: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;
const user = { id: 'member-a', email: 'member@example.test', firstName: 'Test', lastName: 'Member' };
const context = { params: Promise.resolve({ id: 'record-a' }) };
const request = (method = 'GET', body?: unknown, query = '') => new NextRequest(`https://thrivv.example.test/api/test${query}`, {
  method,
  ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
});
function noStoreAccess() {
  for (const fn of Object.values(store)) expect(fn).not.toHaveBeenCalled();
}
beforeEach(() => {
  jest.clearAllMocks();
  (getCurrentUser as jest.Mock).mockResolvedValue(user);
  (checkAdminAccess as jest.Mock).mockResolvedValue({ ok: false, status: 403, reason: 'Admin access required' });
});

const administrativeRoutes = { members, member, memberships, membership, trainers, trainer, classes, gymClass };
test.each(Object.entries(administrativeRoutes))('%s blocks every method before touching legacy data', async (_name, routes) => {
  for (const status of [401, 403, 503]) {
    (checkAdminAccess as jest.Mock).mockResolvedValue({ ok: false, status, reason: 'Denied' });
    for (const [method, handler] of Object.entries(routes)) {
      const response = await (handler as Handler)(request(method, method === 'GET' ? undefined : { id: 'record-a' }), context);
      expect(response.status).toBe(status);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    }
  }
  noStoreAccess();
});

test('admin access verification exceptions fail closed', async () => {
  (checkAdminAccess as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  expect((await members.GET()).status).toBe(503);
  noStoreAccess();
});

test('authorized administrator reads preserve profiles without password material', async () => {
  (checkAdminAccess as jest.Mock).mockResolvedValue({ ok: true, user });
  const profile = { id: 'record-a', firstName: 'Member', email: 'real@example.test', password: 'private-hash' };
  (store.getAllMembers as jest.Mock).mockReturnValue([profile]);
  (store.getMember as jest.Mock).mockReturnValue(profile);
  for (const response of [await members.GET(), await member.GET(request(), context)]) {
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('private-hash');
    expect(response.headers.get('X-Thrivv-Data-Source')).toBe('legacy-memory');
  }
});

test('authorized administrator can still create, update and remove a legacy record', async () => {
  (checkAdminAccess as jest.Mock).mockResolvedValue({ ok: true, user });
  (store.addTrainer as jest.Mock).mockReturnValue({ id: 'record-a', firstName: 'Alex' });
  (store.updateTrainer as jest.Mock).mockReturnValue({ id: 'record-a', firstName: 'Ali' });
  (store.deleteTrainer as jest.Mock).mockReturnValue(true);
  expect((await trainers.POST(request('POST', { firstName: 'Alex' }))).status).toBe(201);
  expect((await trainer.PUT(request('PUT', { firstName: 'Ali' }), context)).status).toBe(200);
  expect(store.updateTrainer).toHaveBeenCalledWith('record-a', { firstName: 'Ali' });
  expect((await trainer.DELETE(request('DELETE'), context)).status).toBe(200);
});

test.each(Object.entries({ exercises, exercise, recipes, recipe }))('%s permits authenticated reference reads and restricts edits', async (_name, routes) => {
  (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);
  expect((await (routes.GET as Handler)(request(), context)).status).toBe(401);
  noStoreAccess();
  (store.getAllExercises as jest.Mock).mockReturnValue([]);
  (store.getExercise as jest.Mock).mockReturnValue({ id: 'record-a', name: 'Squat' });
  (store.getAllRecipes as jest.Mock).mockReturnValue([]);
  (store.getRecipe as jest.Mock).mockReturnValue({ id: 'record-a', name: 'Lunch' });
  expect((await (routes.GET as Handler)(request(), context)).status).toBe(200);
  for (const [method, handler] of Object.entries(routes)) {
    if (method === 'GET') continue;
    expect((await (handler as Handler)(request(method, {}), context)).status).toBe(403);
  }
});

const retiredActions = [
  ['enrollment', enroll.POST, 'POST'], ['cancel enrollment', enroll.DELETE, 'DELETE'],
  ['waitlist', waitlist.POST, 'POST'], ['remove waitlist', waitlist.DELETE, 'DELETE'],
  ['checkin', checkin.POST, 'POST'], ['payment', payments.POST, 'POST'],
  ['WHOOP connection', connection.POST, 'POST'], ['WHOOP data', data.POST, 'POST'],
] as const;
test.each(retiredActions)('%s cannot impersonate a member or issue a fake confirmation', async (_name, handler, method) => {
  (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);
  expect((await handler(request(method, { memberId: user.id }))).status).toBe(401);
  expect((await handler(request(method, { memberId: 'another-member' }))).status).toBe(403);
  const response = await handler(request(method, { memberId: user.id }));
  expect(response.status).toBe(503);
  expect(await response.json()).toHaveProperty('code');
  noStoreAccess();
  expect(supabase.from).not.toHaveBeenCalled();
});

test('retired actions reject malformed input and accept a session without a browser member ID', async () => {
  expect((await enroll.POST(new NextRequest('https://thrivv.example.test/api', { method: 'POST', body: '{bad' }))).status).toBe(400);
  expect((await enroll.POST(request('POST'))).status).toBe(503);
});

test.each([['payments', payments.GET], ['notifications', notifications.GET], ['connection', connection.GET], ['data', data.GET]] as const)('%s never reads another account', async (_name, handler) => {
  (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);
  expect((await handler(request())).status).toBe(401);
  expect((await handler(request('GET', undefined, '?memberId=another-member'))).status).toBe(403);
  noStoreAccess();
  expect(supabase.from).not.toHaveBeenCalled();
});

test('payments and notifications expose no old simulated receipts or confirmations', async () => {
  for (const handler of [payments.GET, notifications.GET]) {
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  }
  noStoreAccess();
});

test('legacy session history is self-only and is never marked verified', async () => {
  expect((await sessions.GET(request(), { params: Promise.resolve({ id: 'another-member' }) })).status).toBe(403);
  expect(store.getMemberSessions).not.toHaveBeenCalled();
  (store.getMemberSessions as jest.Mock).mockReturnValue(2);
  const response = await sessions.GET(request(), { params: Promise.resolve({ id: user.id }) });
  expect(await response.json()).toEqual({ memberId: user.id, completedSessions: 2, source: 'legacy', verified: false });
  expect(store.getMemberSessions).toHaveBeenCalledWith(user.id);
});

function database(result: { data: unknown; error: unknown }) {
  const chain: any = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(), lte: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result), then: (resolve: (result: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

test('WHOOP compatibility status is real, session-scoped, and omits credentials', async () => {
  const query = database({ data: { whoop_connected_at: '2026-09-14', whoop_access_token: 'private-token', whoop_refresh_token: 'private-refresh' }, error: null });
  const response = await connection.GET(request());
  expect(query.eq).toHaveBeenCalledWith('id', user.id);
  expect(await response.json()).toEqual({ memberId: user.id, connected: true, connectedAt: '2026-09-14' });
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  noStoreAccess();
});

test('WHOOP compatibility data exposes measured fields from the current account only', async () => {
  const query = database({ data: [{ id: 'day-a', date: '2026-09-14', recovery_score: 80, day_strain: 12, total_sleep_ms: 28800000, sleep_performance_pct: 85, sleep_efficiency_pct: 90, resting_hr: 55, updated_at: 'now', raw_payload: 'private-provider-payload' }], error: null });
  const response = await data.GET(request('GET', undefined, '?startDate=2026-09-01&endDate=2026-09-14'));
  const rows = await response.json();
  expect(query.eq).toHaveBeenCalledWith('user_id', user.id);
  expect(query.limit).toHaveBeenCalledWith(366);
  expect(query.gte).toHaveBeenCalledWith('date', '2026-09-01');
  expect(rows[0]).toMatchObject({ memberId: user.id, recovery: 80, strain: 12, sleep: { totalSleep: 480 } });
  expect(JSON.stringify(rows)).not.toContain('private-provider-payload');
});

test('WHOOP unavailable reads do not report a false disconnect or empty successful sync', async () => {
  database({ data: null, error: { message: 'offline' } });
  expect((await connection.GET(request())).status).toBe(503);
  expect((await data.GET(request())).status).toBe(503);
});

test('old disconnect endpoint cannot clear tokens or alter another account', async () => {
  expect((await connection.DELETE(request('DELETE', undefined, '?memberId=another-member'))).status).toBe(403);
  expect((await connection.DELETE(request('DELETE'))).status).toBe(503);
  noStoreAccess();
  expect(supabase.from).not.toHaveBeenCalled();
});
