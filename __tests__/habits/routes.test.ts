import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { memberRecords as store } from '@/lib/member-records';
import { GET as list, POST as create } from '@/app/api/habits/route';
import { GET as listEntries } from '@/app/api/habits/entries/route';
import { GET as read, PUT as update, DELETE as remove } from '@/app/api/habits/[id]/route';
import { GET as readEntries, POST as addEntry } from '@/app/api/habits/[id]/entries/route';
import { PUT as toggle } from '@/app/api/habits/[id]/entries/[entryId]/route';

jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn() }));
jest.mock('@/lib/member-records', () => ({ memberRecords: {
  getMemberHabits: jest.fn(), getHabit: jest.fn(), addHabit: jest.fn(), updateHabit: jest.fn(), deleteHabit: jest.fn(),
  getMemberHabitEntries: jest.fn(), getHabitEntries: jest.fn(), addHabitEntry: jest.fn(), updateHabitEntry: jest.fn(),
} }));
const auth = getCurrentUser as jest.Mock;
const data = store as jest.Mocked<typeof store>;
const owner = 'member-a';
const habit = { id: 'habit-a', memberId: owner, name: 'Stretch', category: 'fitness' as const, frequency: 'daily' as const, createdAt: '2026-01-01', status: 'active' as const };
const entry = { id: 'entry-a', memberId: owner, habitId: habit.id, date: '2026-01-01', completed: false };
const ctx = { params: Promise.resolve({ id: habit.id }) };
const entryCtx = { params: Promise.resolve({ id: habit.id, entryId: entry.id }) };
function request(method = 'GET', body?: unknown, query = '', origin = 'https://www.thrivv.dev') {
  return new NextRequest(`https://www.thrivv.dev/api/habits${query}`, {
    method,
    headers: { origin, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  auth.mockResolvedValue({ id: owner });
  data.getHabit.mockResolvedValue(habit);
  data.getMemberHabits.mockResolvedValue([habit]);
  data.getHabitEntries.mockResolvedValue([entry]);
  data.getMemberHabitEntries.mockResolvedValue([entry]);
  data.addHabit.mockImplementation(async fields => ({ ...fields, id: habit.id, createdAt: habit.createdAt }));
  data.updateHabit.mockImplementation(async (id, fields) => ({ ...habit, ...fields, id }));
  data.addHabitEntry.mockImplementation(async fields => ({ ...fields, id: entry.id }));
  data.updateHabitEntry.mockImplementation(async (id, fields) => ({ ...entry, ...fields, id }));
});

test('all habit reads and mutations require a current session', async () => {
  auth.mockResolvedValue(null);
  const responses = await Promise.all([
    list(request()), listEntries(request()), read(request(), ctx), readEntries(request(), ctx),
    create(request('POST', {})), update(request('PUT', {}), ctx), remove(request('DELETE'), ctx),
    addEntry(request('POST', {}), ctx), toggle(request('PUT', {}), entryCtx),
  ]);
  expect(responses.map(response => response.status)).toEqual(Array(9).fill(401));
  for (const operation of [data.getHabit, data.getMemberHabits, data.getMemberHabitEntries, data.addHabit, data.updateHabit, data.deleteHabit, data.addHabitEntry, data.updateHabitEntry]) expect(operation).not.toHaveBeenCalled();
});

test('lists use the session actor and reject another member in the query', async () => {
  expect(await (await list(request())).json()).toEqual([habit]);
  expect(await (await listEntries(request())).json()).toEqual([entry]);
  expect(data.getMemberHabits).toHaveBeenCalledWith(owner);
  expect(data.getMemberHabitEntries).toHaveBeenCalledWith(owner);
  expect((await list(request('GET', undefined, '?memberId=victim'))).status).toBe(403);
});

test('another member cannot read, change, delete, or append to a habit', async () => {
  data.getHabit.mockResolvedValue({ ...habit, memberId: 'victim' });
  const responses = await Promise.all([
    read(request(), ctx), update(request('PUT', { name: 'Changed' }), ctx), remove(request('DELETE'), ctx),
    readEntries(request(), ctx), addEntry(request('POST', { date: entry.date, completed: true }), ctx), toggle(request('PUT', { completed: true }), entryCtx),
  ]);
  expect(responses.map(response => response.status)).toEqual(Array(6).fill(404));
  expect(data.updateHabit).not.toHaveBeenCalled(); expect(data.deleteHabit).not.toHaveBeenCalled(); expect(data.addHabitEntry).not.toHaveBeenCalled(); expect(data.updateHabitEntry).not.toHaveBeenCalled();
});

test('new habits derive their identity from the session and ignore client ids and timestamps', async () => {
  const response = await create(request('POST', { name: '  Stretch  ', category: 'fitness', frequency: 'daily', id: 'forged-id', createdAt: '1900-01-01', memberId: owner }));
  expect(response.status).toBe(201);
  expect(data.addHabit).toHaveBeenCalledWith({ name: 'Stretch', category: 'fitness', frequency: 'daily', status: 'active', memberId: owner });
  expect((await create(request('POST', { ...habit, memberId: 'victim' }))).status).toBe(403);
});

test('own updates cannot reassign member or record identities', async () => {
  expect((await update(request('PUT', { name: 'Walk', id: 'forged', memberId: owner, createdAt: '1900-01-01' }), ctx)).status).toBe(200);
  expect(data.updateHabit).toHaveBeenCalledWith(habit.id, { name: 'Walk' }, owner);
  expect((await update(request('PUT', { memberId: 'victim' }), ctx)).status).toBe(403);
});

test.each([{ name: {} }, { name: '' }, { category: 'not-a-category' }, { frequency: 'invalid' }, { targetCount: -2 }, { description: [] }, { status: 'broken' }, { color: 'url(x)' }])('invalid editable fields are rejected: %j', async fields => {
  expect((await update(request('PUT', fields), ctx)).status).toBe(400);
  expect(data.updateHabit).not.toHaveBeenCalled();
});

test('new entries use the owned parent and actor, never client entry ids or parent ids', async () => {
  expect((await addEntry(request('POST', { date: entry.date, completed: true, id: 'forged', habitId: 'other-parent', memberId: owner }), ctx)).status).toBe(201);
  expect(data.addHabitEntry).toHaveBeenCalledWith({ date: entry.date, completed: true, habitId: habit.id, memberId: owner });
  expect((await addEntry(request('POST', { date: entry.date, completed: true, memberId: 'victim' }), ctx)).status).toBe(403);
});

test('toggles update only completion and scope legacy duplicate ids to the owner and parent', async () => {
  data.getHabitEntries.mockResolvedValue([{ ...entry, memberId: 'victim' }, entry]);
  expect((await toggle(request('PUT', { completed: true, habitId: 'victim-habit', id: 'forged', date: '1900-01-01' }), entryCtx)).status).toBe(200);
  expect(data.updateHabitEntry).toHaveBeenCalledWith(entry.id, { completed: true }, { memberId: owner, habitId: habit.id });
  data.getHabitEntries.mockResolvedValue([{ ...entry, memberId: 'victim' }]);
  expect((await toggle(request('PUT', { completed: false }), entryCtx)).status).toBe(404);
});

test('entry lists filter another member even if legacy parent ids collide', async () => {
  data.getHabitEntries.mockResolvedValue([entry, { ...entry, memberId: 'victim' }]);
  expect(await (await readEntries(request(), ctx)).json()).toEqual([entry]);
});

test.each(['2026-02-31', '2026-13-01', '2099-01-01', {}, null])('invalid or future entry date is rejected: %j', async date => {
  expect((await addEntry(request('POST', { date, completed: true }), ctx)).status).toBe(400);
  expect(data.addHabitEntry).not.toHaveBeenCalled();
});

test('same-origin bodyless DELETE works while cross-origin requests cannot mutate data', async () => {
  expect((await remove(request('DELETE'), ctx)).status).toBe(200);
  expect(data.deleteHabit).toHaveBeenCalledWith(habit.id, owner);
  data.deleteHabit.mockClear();
  expect((await remove(request('DELETE', undefined, '', 'https://attacker.test'), ctx)).status).toBe(403);
  const crossSite = new NextRequest('https://www.thrivv.dev/api/habits', { method: 'DELETE', headers: { 'sec-fetch-site': 'cross-site' } });
  expect((await remove(crossSite, ctx)).status).toBe(403);
  expect(data.deleteHabit).not.toHaveBeenCalled();
});

test('malformed and non-JSON bodies fail before a write, without exposing internal errors', async () => {
  const malformed = new NextRequest('https://www.thrivv.dev/api/habits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken' });
  expect((await create(malformed)).status).toBe(400);
  const wrongType = new NextRequest('https://www.thrivv.dev/api/habits', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
  expect((await create(wrongType)).status).toBe(415);
  expect(data.addHabit).not.toHaveBeenCalled();
  data.getMemberHabits.mockImplementation(() => { throw new Error('private backend detail'); });
  const response = await list(request());
  expect(response.status).toBe(503); expect(await response.text()).not.toContain('private backend detail');
  expect(response.headers.get('cache-control')).toContain('no-store');
});
