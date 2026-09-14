/** Account-scoped nutrition log. Server storage is authoritative; local history is retained as a backup. */
import { getRecipeById, type Recipe } from '@/lib/recipes';
import { scaleFood, portionLabel, type BrowserFood, type LoggedFoodPortion } from '@/lib/food-portions';
import { getClientSession } from '@/lib/client-session';
import { parseNutritionEntry, validNutritionDate, type NutritionEntry } from '@/lib/nutrition-log-validation';

export interface LoggedMeal {
  foodPortion?: LoggedFoodPortion;
  id?: string; // Supabase ID (optional for localStorage)
  recipeId: string;
  servings: number;
  addedAt: string; // ISO timestamp
  // Store nutrition data with the meal so we don't need to look up recipe later
  // This is especially important for custom recipes not in recipesData
  recipeName?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: LoggedMeal[];
}

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  mealCount: number;
}

export function computeTotals(log: DailyLog): NutritionTotals {
  let calories = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;

  log.meals.forEach(meal => {
    // First, try to use stored nutrition data (for custom recipes)
    if (meal.calories !== undefined && meal.protein_g !== undefined && meal.carbs_g !== undefined && meal.fat_g !== undefined) {
      calories += meal.calories * meal.servings;
      protein_g += meal.protein_g * meal.servings;
      carbs_g += meal.carbs_g * meal.servings;
      fat_g += meal.fat_g * meal.servings;
    } else {
      // Fallback: look up recipe in recipesData
      const recipe = getRecipeById(meal.recipeId);
      if (recipe) {
        const multiplier = meal.servings / recipe.servings;
        calories += recipe.calories * multiplier;
        protein_g += recipe.protein_g * multiplier;
        carbs_g += recipe.carbs_g * multiplier;
        fat_g += recipe.fat_g * multiplier;
      }
    }
  });

  return {
    calories: Math.round(calories),
    protein_g: Math.round(protein_g),
    carbs_g: Math.round(carbs_g),
    fat_g: Math.round(fat_g),
    mealCount: log.meals.length,
  };
}


const today = () => new Date().toISOString().slice(0, 10);
async function currentOwner(memberId: string) {
  const session = await getClientSession();
  if (!memberId || !session.user || session.user.id !== memberId) throw new Error('Please refresh and sign in to your account before changing food logs.');
}
async function requestLog(memberId: string, method: string, body?: Record<string, unknown>): Promise<any> {
  const response = await fetch(`/api/nutrition-log?date=${today()}&expectedUserId=${encodeURIComponent(memberId)}`, {
    method, cache: 'no-store', credentials: 'same-origin',
    ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, expectedUserId: memberId }) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Your food log could not be saved. Please retry.');
  return data;
}

/** Deterministic identities survive retries, other tabs, and repeated imports. */
export async function legacyNutritionEntryId(date: string, meal: LoggedMeal, index: number): Promise<string> {
  if (meal.recipeId.startsWith('food-entry:')) return `portion:${meal.recipeId.slice('food-entry:'.length)}`;
  const bytes = new TextEncoder().encode(JSON.stringify([date, meal.recipeId, meal.addedAt, index]));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `legacy:${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** Only exact keys belonging to the authenticated owner are considered. No local record is deleted or rewritten. */
const importedSnapshots = new Map<string, string>();
async function importLocalLogs(memberId: string) {
  if (typeof window === 'undefined') return;
  const prefix = `nutrition_log_${memberId}_`;
  const entries: NutritionEntry[] = [];
  const imported: Array<[string, string]> = [];
  let storage: Storage;
  try { storage = window.localStorage; } catch { return; } // Server logging also works when browser storage is disabled.
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const date = key.slice(prefix.length);
    if (!validNutritionDate(date)) continue;
    let log: DailyLog;
    try {
      const raw = storage.getItem(key) || 'null';
      if (importedSnapshots.get(key) === raw) continue;
      log = JSON.parse(raw);
      imported.push([key, raw]);
      if (!log || log.date !== date || !Array.isArray(log.meals)) throw new Error();
      for (let mealIndex = 0; mealIndex < log.meals.length; mealIndex++) {
        const meal = log.meals[mealIndex];
        entries.push(parseNutritionEntry({ entryId: await legacyNutritionEntryId(date, meal, mealIndex), date, meal }));
      }
    } catch { throw new Error(`Your saved food log for ${date} could not be read. It has been kept unchanged. Contact support for help restoring it.`); }
  }
  for (let index = 0; index < entries.length; index += 100) await requestLog(memberId, 'POST', { entries: entries.slice(index, index + 100) });
  for (const [key, raw] of imported) importedSnapshots.set(key, raw);
}

export async function getTodayLog(memberId: string): Promise<DailyLog> {
  await currentOwner(memberId);
  await importLocalLogs(memberId);
  return requestLog(memberId, 'GET');
}
async function insertMeal(memberId: string, entryId: string, meal: LoggedMeal): Promise<DailyLog> {
  await currentOwner(memberId);
  await importLocalLogs(memberId);
  await requestLog(memberId, 'POST', { entries: [parseNutritionEntry({ entryId, date: today(), meal })] });
  return requestLog(memberId, 'GET');
}
export async function addFoodPortionToToday(memberId: string, food: BrowserFood, quantity: number, unit: LoggedFoodPortion['unit'], submissionId: string): Promise<DailyLog> {
  const nutrition = scaleFood(food, quantity, unit);
  return insertMeal(memberId, `portion:${submissionId}`, {
    recipeId: `food-entry:${submissionId}`, recipeName: food.name, servings: 1, addedAt: new Date().toISOString(), ...nutrition,
    foodPortion: { version: 1, sourceId: food.id, kind: food.kind, quantity, unit, label: portionLabel(food, quantity, unit), sourceUrl: food.sourceUrl },
  });
}
export async function addMealToToday(memberId: string, recipeId: string, servings = 1,
  recipeData?: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }, submissionId = crypto.randomUUID()
): Promise<DailyLog> {
  const recipe = getRecipeById(recipeId);
  // Built-in values describe the batch; saved values describe one serving.
  const data = recipeData || (recipe && { name: recipe.name, calories: recipe.calories / recipe.servings, protein_g: recipe.protein_g / recipe.servings, carbs_g: recipe.carbs_g / recipe.servings, fat_g: recipe.fat_g / recipe.servings });
  return insertMeal(memberId, `recipe:${submissionId}`, {
    recipeId, servings, addedAt: new Date().toISOString(),
    ...(data && { recipeName: data.name, calories: data.calories, protein_g: data.protein_g, carbs_g: data.carbs_g, fat_g: data.fat_g }),
  });
}
export async function removeMealFromToday(memberId: string, entryIdOrRecipeId: string): Promise<DailyLog> {
  const log = await getTodayLog(memberId);
  const meals = log.meals.filter(meal => meal.id === entryIdOrRecipeId || meal.recipeId === entryIdOrRecipeId);
  let result = log;
  for (const meal of meals) result = await requestLog(memberId, 'DELETE', { date: log.date, entryId: meal.id });
  return result;
}
export async function updateMealServings(memberId: string, entryId: string, servings: number): Promise<DailyLog> {
  await currentOwner(memberId);
  return requestLog(memberId, 'PATCH', { date: today(), entryId, servings });
}

export function getRecipeFromMeal(meal: LoggedMeal): Recipe | undefined {
  // First try to get from recipesData
  const recipe = getRecipeById(meal.recipeId);
  if (recipe) return recipe;
  
  // If not found but meal has stored nutrition data, create a minimal Recipe object
  if (meal.recipeName && meal.calories !== undefined) {
    return {
      id: meal.recipeId,
      name: meal.recipeName,
      description: 'Custom recipe',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&h=600&auto=format&fit=crop&q=80',
      imageId: '1546069901-ba9599a7e63c',
      calories: meal.calories,
      protein_g: meal.protein_g || 0,
      carbs_g: meal.carbs_g || 0,
      fat_g: meal.fat_g || 0,
      prepMinutes: 0,
      cookMinutes: 0,
      servings: meal.servings,
      ingredients: [],
      instructions: [],
      tags: ['custom'],
    };
  }
  
  return undefined;
}


export async function getTodayTotals(memberId: string): Promise<NutritionTotals> {
  return computeTotals(await getTodayLog(memberId));
}
export function getMealMacros(meal: LoggedMeal): NutritionTotals | null {
  if (meal.calories === undefined && !getRecipeById(meal.recipeId)) return null;
  return computeTotals({ date: today(), meals: [meal] });
}
