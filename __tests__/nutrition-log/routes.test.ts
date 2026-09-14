import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { GET, POST, DELETE, PATCH } from '@/app/api/nutrition-log/route';
import { parseNutritionEntry } from '@/lib/nutrition-log-validation';

const actor = 'user-a';
const date = '2026-09-14';
const entry = { entryId: 'portion:one', date, meal: { recipeId: 'food-entry:one', servings: 1, addedAt: '2026-09-14T10:00:00Z', calories: 100, protein_g: 5, carbs_g: 5, fat_g: 5 } };
let rows: any[];
let databaseError: boolean;
const auth = requireAuth as jest.Mock;
const from = supabase.from as jest.Mock;
function request(method: string, body?: unknown, owner = actor) {
  return new NextRequest(`http://localhost/api/nutrition-log?date=${date}&expectedUserId=${owner}`, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
beforeEach(() => {
  rows = []; databaseError = false; jest.clearAllMocks();
  auth.mockResolvedValue({ id: actor });
  from.mockImplementation(() => {
    const filters: Array<(row: any) => boolean> = [];
    let updates: any;
    const result = () => {
      if (databaseError) return { data: null, error: { code: '08000' } };
      const selected = rows.filter(row => filters.every(filter => filter(row)));
      if (updates) selected.forEach(row => Object.assign(row, updates));
      return { data: selected, error: null };
    };
    const query: any = {
      select: () => query, order: () => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
      is: (key: string, value: unknown) => { filters.push(row => (row[key] ?? null) === value); return query; },
      update: (value: unknown) => { updates = value; return query; },
      maybeSingle: async () => { const value = result(); return { ...value, data: value.data?.[0] || null }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
      upsert: async (entries: any[], options: any) => {
        expect(options).toEqual({ onConflict: 'user_id,entry_id', ignoreDuplicates: true });
        if (databaseError) return { error: { code: '08000' } };
        for (const row of entries) if (!rows.some(existing => existing.user_id === row.user_id && existing.entry_id === row.entry_id)) rows.push(row);
        return { error: null };
      },
    };
    return query;
  });
});

test.each([GET, POST, DELETE, PATCH])('requires the server session before every food log action', async handler => {
  auth.mockRejectedValue(new Error('Unauthorized'));
  const response = await handler(request(handler === GET ? 'GET' : 'POST', handler === GET ? undefined : {}));
  expect(response.status).toBe(401); expect(from).not.toHaveBeenCalled();
});

test('owner comes from session and cross-account replay is rejected before reading or writing', async () => {
  expect((await POST(request('POST', { expectedUserId: 'user-b', entries: [entry] }))).status).toBe(403);
  expect((await GET(request('GET', undefined, 'user-b'))).status).toBe(403);
  expect(from).not.toHaveBeenCalled();
  await POST(request('POST', { expectedUserId: actor, entries: [{ ...entry, user_id: 'user-b' }] }));
  expect(rows[0].user_id).toBe(actor);
  rows.push({ user_id: 'user-b', entry_id: 'portion:private', date, meal: { recipeId: 'private' } });
  const response = await GET(request('GET'));
  expect((await response.json()).meals).toHaveLength(1);
  expect(response.headers.get('cache-control')).toBe('no-store');
});

test('duplicate retries cannot double a meal or resurrect a deleted local import', async () => {
  const save = () => POST(request('POST', { expectedUserId: actor, entries: [entry] }));
  await Promise.all([save(), save(), save()]);
  expect(rows).toHaveLength(1);
  await DELETE(request('DELETE', { expectedUserId: actor, date, entryId: entry.entryId }));
  await save();
  expect(rows[0].deleted_at).toBeTruthy();
  expect((await (await GET(request('GET'))).json()).meals).toHaveLength(0);
});

test('update and delete cannot alter another account entry', async () => {
  rows.push({ user_id: 'user-b', entry_id: entry.entryId, date, meal: entry.meal });
  expect((await PATCH(request('PATCH', { expectedUserId: actor, date, entryId: entry.entryId, servings: 2 }))).status).toBe(404);
  await DELETE(request('DELETE', { expectedUserId: actor, date, entryId: entry.entryId }));
  expect(rows[0].deleted_at).toBeUndefined();
  expect(rows[0].meal.servings).toBe(1);
});

test('valid serving edits persist; invalid food payloads and unavailable storage never report success', async () => {
  await POST(request('POST', { expectedUserId: actor, entries: [entry] }));
  expect((await PATCH(request('PATCH', { expectedUserId: actor, date, entryId: entry.entryId, servings: 2 }))).status).toBe(200);
  expect(rows[0].meal.servings).toBe(2);
  expect((await POST(request('POST', { expectedUserId: actor, entries: [{ ...entry, meal: { ...entry.meal, servings: -1 } }] }))).status).toBe(400);
  databaseError = true;
  expect((await POST(request('POST', { expectedUserId: actor, entries: [entry] }))).status).toBe(503);
  expect((await GET(request('GET'))).status).toBe(503);
});

test('validation bounds nutritional fields and strips unrelated submitted data', () => {
  for (const servings of [Infinity, NaN, 0, -1, 10001]) expect(() => parseNutritionEntry({ ...entry, meal: { ...entry.meal, servings } })).toThrow();
  expect(() => parseNutritionEntry({ ...entry, date: '2026-02-31' })).toThrow();
  expect(() => parseNutritionEntry({ ...entry, meal: { ...entry.meal, calories: Infinity } })).toThrow();
  expect(parseNutritionEntry({ ...entry, user_id: 'user-b', meal: { ...entry.meal, role: 'admin', payload: 'unrelated' } })).toEqual(entry);
});
