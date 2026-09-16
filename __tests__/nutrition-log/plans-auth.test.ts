import { NextRequest } from 'next/server';
jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/store', () => ({ store: { generateNutritionPlan: jest.fn() } }));
jest.mock('@/lib/meal-plan-generator', () => ({ generateWeeklyMealPlans: jest.fn() }));
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { store } from '@/lib/store';
import { generateWeeklyMealPlans } from '@/lib/meal-plan-generator';
import * as list from '@/app/api/nutrition-plans/route';
import * as detail from '@/app/api/nutrition-plans/[id]/route';
import { GET as meals } from '@/app/api/nutrition-plans/[id]/meals/route';
import { POST as generate } from '@/app/api/nutrition-plans/generate/route';
const auth = requireAuth as jest.Mock;
const from = supabase.from as jest.Mock;
const context = { params: Promise.resolve({ id: 'plan-id' }) };
let query: any;
beforeEach(() => {
  jest.clearAllMocks(); auth.mockResolvedValue({ id: 'owner' });
  query = { select: jest.fn(() => query), eq: jest.fn(() => query), order: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn(() => query), update: jest.fn(() => query), delete: jest.fn(() => query),
    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  from.mockReturnValue(query);
});
function request(body?: any) { return new NextRequest('http://localhost/api/nutrition-plans', { method: body ? 'POST' : 'GET', ...(body ? { body: JSON.stringify(body) } : {}) }); }

test.each([list.GET, list.POST, detail.GET, detail.PATCH, detail.DELETE, meals, generate])('all nutrition-plan actions require a server-authenticated user', async handler => {
  auth.mockRejectedValue(new Error('Unauthorized'));
  const response = await handler(request(), context);
  expect(response.status).toBe(401); expect(from).not.toHaveBeenCalled();
});

test('list is always account-scoped and refuses a different requested member', async () => {
  await list.GET(request()); expect(query.eq).toHaveBeenCalledWith('member_id', 'owner');
  from.mockClear();
  const response = await list.GET(new NextRequest('http://localhost/api/nutrition-plans?memberId=another-user'));
  expect(response.status).toBe(403); expect(from).not.toHaveBeenCalled();
});

test.each([detail.GET, detail.PATCH, detail.DELETE, meals])('detail access includes ownership in its database filter', async handler => {
  await handler(request({ name: 'Updated plan' }), context);
  expect(query.eq).toHaveBeenCalledWith('member_id', 'owner');
});

test('creating or generating plans for another member is rejected', async () => {
  for (const handler of [list.POST, generate]) expect((await handler(request({ memberId: 'another-user' }))).status).toBe(403);
  expect(from).not.toHaveBeenCalled(); expect(store.generateNutritionPlan).not.toHaveBeenCalled();
});

test('unsaved nutrition generation reports failure instead of a fake saved plan', async () => {
  (store.generateNutritionPlan as jest.Mock).mockReturnValue({ id: 'new-plan', goal: 'maintenance', macroTargets: { calories: 2000, protein: 100, carbohydrates: 250, fats: 67 } });
  (generateWeeklyMealPlans as jest.Mock).mockReturnValue({ mealPlans: [], warnings: [] });
  query.single.mockResolvedValue({ data: null, error: { message: 'database unavailable' } });
  const response = await generate(request({ memberId: 'owner', goal: 'maintenance', gender: 'male', age: 25, height: 180, weight: 80, activityLevel: 'moderate', duration: 7 }));
  expect(response.status).toBe(503); expect((await response.json()).success).toBe(false);
});
