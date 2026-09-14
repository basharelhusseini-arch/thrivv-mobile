import { basicIngredients, searchBasicIngredients } from '@/lib/basic-ingredients';
import { scaleFood, recipeFood, completeNutrition, formatNutrient } from '@/lib/food-portions';
import { recipesData } from '@/lib/recipes';
import { addFoodPortionToToday, computeTotals, getTodayLog, removeMealFromToday } from '@/lib/nutrition-log';

import { webcrypto } from 'node:crypto';
import type { DailyLog } from '@/lib/nutrition-log';
jest.mock('@/lib/client-session', () => ({ getClientSession: jest.fn() }));
import { getClientSession } from '@/lib/client-session';
const mockSession = getClientSession as jest.Mock;
let server: Map<string, { entryId: string; date: string; meal: any; deleted?: boolean }>;
const chicken = basicIngredients.find(food => food.fdcId === 171077)!;
const egg = basicIngredients.find(food => food.fdcId === 171287)!;
let store: Map<string, string>;
beforeEach(() => {
  store = new Map(); server = new Map();
  mockSession.mockResolvedValue({ user: { id: 'test' } });
  Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true });
  const storage = {
    get length() { return store.size; }, key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  };
  Object.defineProperty(global, 'window', { value: { localStorage: storage }, configurable: true });
  Object.defineProperty(global, 'localStorage', { value: storage, configurable: true });
  global.fetch = jest.fn(async (input, init) => {
    const owner = new URL(String(input), 'http://localhost').searchParams.get('expectedUserId');
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (init?.method === 'POST') {
      for (const entry of body.entries) if (!server.has(`${owner}:${entry.entryId}`)) server.set(`${owner}:${entry.entryId}`, entry);
      return Response.json({ success: true });
    }
    if (init?.method === 'DELETE') {
      const row = server.get(`${owner}:${body.entryId}`); if (row) row.deleted = true;
    }
    const date = new Date().toISOString().slice(0, 10);
    return Response.json({ date, meals: [...server.entries()].filter(([key, row]) => key.startsWith(`${owner}:`) && row.date === date && !row.deleted).map(([, row]) => ({ ...row.meal, id: row.entryId })) });
  }) as typeof fetch;
});

test('verified USDA quantities scale grams and large eggs without premature rounding', () => {
  expect(scaleFood(chicken, 150, 'g')).toEqual({ calories: 180, protein_g: 33.75, carbs_g: 0, fat_g: 3.93 });
  expect(scaleFood(egg, 1, 'portion').calories).toBe(71.5);
  expect(scaleFood(chicken, 12.5, 'g').protein_g).toBe(2.8125);
});

test('built-in batch yields and custom per-serving values each scale once', () => {
  const recipe = recipesData.find(recipe => recipe.servings > 1)!;
  expect(scaleFood(recipeFood(recipe), recipe.servings, 'serving').calories).toBe(recipe.calories);
  expect(scaleFood(recipeFood(recipe, true), 2, 'serving').calories).toBe(recipe.calories * 2);
});

test.each([0, -1, NaN, Infinity, 10001])('rejects invalid quantity %s', quantity => {
  expect(() => scaleFood(chicken, quantity, 'g')).toThrow();
});

test('missing nutrition is not invented; zero is a valid known value', () => {
  expect(completeNutrition({ ...chicken.nutrition, calories: 0 })).toBe(true);
  expect(completeNutrition({ ...chicken.nutrition, protein_g: null as unknown as number })).toBe(false);
  expect(() => scaleFood({ ...chicken, nutrition: { ...chicken.nutrition, fat_g: NaN } }, 100, 'g')).toThrow();
  expect(formatNutrient(NaN)).toBe('—');
  expect(() => scaleFood(chicken, 1, 'serving')).toThrow();
});

test('all ingredients have unique source IDs, complete nutrition, and explicit preparation', () => {
  expect(basicIngredients).toHaveLength(22);
  expect(new Set(basicIngredients.map(food => food.id)).size).toBe(22);
  basicIngredients.forEach(food => {
    expect(food.sourceUrl).toBe(`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`);
    expect(food.sourceDescription.length).toBeGreaterThan(5);
    expect(completeNutrition(food.nutrition)).toBe(true);
    expect(food.basis).toBe('100g');
  });
  expect(basicIngredients.filter(food => /Chicken/.test(food.name)).map(food => food.name)).toEqual(expect.arrayContaining([expect.stringContaining('raw'), expect.stringContaining('cooked')]));
});

test('repeated and concurrent submissions add once; intentional additional portion adds separately', async () => {
  await Promise.all(Array.from({ length: 10 }, () => addFoodPortionToToday('test', chicken, 150, 'g', 'same-request')));
  expect((await getTodayLog('test')).meals).toHaveLength(1);
  const log = await addFoodPortionToToday('test', chicken, 50, 'g', 'another-request');
  expect(log.meals).toHaveLength(2);
  expect(computeTotals(log).calories).toBe(240);
  expect((await removeMealFromToday('test', 'food-entry:same-request')).meals).toHaveLength(1);
});

test('legacy entries and totals remain unchanged when new ingredients are added', async () => {
  const date = new Date().toISOString().slice(0, 10);
  const legacy = { recipeId: recipesData[0].id, servings: 2, addedAt: '2026-01-01T00:00:00Z', calories: 123, protein_g: 10, carbs_g: 8, fat_g: 2 };
  store.set(`nutrition_log_test_${date}`, JSON.stringify({ date, meals: [legacy] }));
  const before = computeTotals(await getTodayLog('test'));
  const log = await addFoodPortionToToday('test', chicken, 100, 'g', 'new');
  expect(log.meals[0]).toMatchObject(legacy);
  expect(store.get(`nutrition_log_test_${date}`)).toBe(JSON.stringify({ date, meals: [legacy] }));
  expect(computeTotals(log).calories).toBe(before.calories + 120);
});

test('unreadable history is preserved; server saves work when browser writes are unavailable', async () => {
  const key = `nutrition_log_test_${new Date().toISOString().slice(0, 10)}`;
  store.set(key, 'broken history');
  await expect(addFoodPortionToToday('test', chicken, 100, 'g', 'new')).rejects.toThrow();
  expect(store.get(key)).toBe('broken history');
  store.clear();
  localStorage.setItem = () => { throw new Error('Storage full'); };
  expect((await addFoodPortionToToday('test', chicken, 100, 'g', 'new')).meals).toHaveLength(1);
});

test('recipe portions retain their source link and exact nutrition alongside ingredients', async () => {
  const recipe = recipesData.find(recipe => recipe.servings > 1)!;
  const food = recipeFood(recipe);
  const log = await addFoodPortionToToday('test', food, 1.5, 'serving', 'recipe-request');
  expect(log.meals[0].foodPortion).toMatchObject({ sourceId: recipe.id, kind: 'recipe', label: '1.5 servings' });
  expect(log.meals[0].calories).toBe(recipe.calories / recipe.servings * 1.5);
  await expect(getTodayLog('different-member')).rejects.toThrow('sign in');
  mockSession.mockResolvedValue({ user: { id: 'different-member' } });
  expect((await getTodayLog('different-member')).meals).toHaveLength(0);
});

test('new entries with known zero calories still count their other recorded nutrients', async () => {
  const food = { ...chicken, nutrition: { calories: 0, protein_g: 0, carbs_g: 0.1, fat_g: 0 } };
  const log = await addFoodPortionToToday('test', food, 1000, 'g', 'zero');
  expect(computeTotals(log)).toMatchObject({ calories: 0, carbs_g: 1, mealCount: 1 });
});

test('ingredient search handles everyday names, preparation, case, and no matches', () => {
  expect(searchBasicIngredients(' EGG WHITES ').map(food => food.fdcId)).toEqual([172183]);
  expect(searchBasicIngredients('chicken')).toHaveLength(2);
  expect(searchBasicIngredients('White rice — raw')).toHaveLength(1);
  expect(searchBasicIngredients('unavailable food')).toEqual([]);
  expect(searchBasicIngredients('')).toHaveLength(22);
});

test('re-import does not resurrect removed local entries, including after a fresh device read', async () => {
  const date = new Date().toISOString().slice(0, 10);
  const backup = JSON.stringify({ date, meals: [{ recipeId: 'food-entry:old', servings: 1, addedAt: new Date().toISOString(), calories: 100, protein_g: 5, carbs_g: 5, fat_g: 5 }] });
  store.set(`nutrition_log_test_${date}`, backup);
  const first = await getTodayLog('test');
  await removeMealFromToday('test', first.meals[0].id!);
  expect((await getTodayLog('test')).meals).toHaveLength(0);
  expect(store.get(`nutrition_log_test_${date}`)).toBe(backup);
});

test('imports only authenticated owner history and reports failed persistence', async () => {
  const date = new Date().toISOString().slice(0, 10);
  store.set(`nutrition_log_other-user_${date}`, 'other users corrupted history');
  expect((await getTodayLog('test')).meals).toHaveLength(0);
  (global.fetch as jest.Mock).mockResolvedValueOnce(Response.json({ error: 'Service unavailable' }, { status: 503 }));
  await expect(addFoodPortionToToday('test', chicken, 100, 'g', 'failed')).rejects.toThrow('Service unavailable');
});
