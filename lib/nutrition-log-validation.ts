import type { LoggedMeal } from './nutrition-log';

export interface NutritionEntry { entryId: string; date: string; meal: LoggedMeal }
export function validNutritionDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validEntryId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,128}$/.test(value);
}
export function parseNutritionEntry(value: unknown): NutritionEntry {
  if (!value || typeof value !== 'object') throw new Error('Invalid meal entry');
  const entry = value as NutritionEntry;
  const meal = entry.meal;
  if (!validEntryId(entry.entryId) || !validNutritionDate(entry.date) || !meal || typeof meal !== 'object'
    || typeof meal.recipeId !== 'string' || !meal.recipeId || meal.recipeId.length > 300
    || typeof meal.servings !== 'number' || !Number.isFinite(meal.servings) || meal.servings <= 0 || meal.servings > 10000
    || typeof meal.addedAt !== 'string' || !Number.isFinite(Date.parse(meal.addedAt))
    || (meal.recipeName !== undefined && (typeof meal.recipeName !== 'string' || meal.recipeName.length > 300))) {
    throw new Error('Invalid meal entry');
  }
  for (const key of ['calories', 'protein_g', 'carbs_g', 'fat_g'] as const) {
    if (meal[key] !== undefined && (typeof meal[key] !== 'number' || !Number.isFinite(meal[key]) || meal[key]! < 0 || meal[key]! > 10000000)) throw new Error('Invalid meal nutrition');
  }
  const portion = meal.foodPortion;
  if (portion && (portion.version !== 1 || !['ingredient', 'recipe'].includes(portion.kind)
    || !['g', 'portion', 'serving'].includes(portion.unit) || typeof portion.quantity !== 'number'
    || !Number.isFinite(portion.quantity) || portion.quantity <= 0 || portion.quantity > 10000
    || typeof portion.sourceId !== 'string' || portion.sourceId.length > 300
    || typeof portion.label !== 'string' || portion.label.length > 300
    || (portion.sourceUrl !== undefined && (typeof portion.sourceUrl !== 'string' || portion.sourceUrl.length > 2000)))) throw new Error('Invalid food portion');
  // Keep only the documented nutritional fields; no submitted owner or privilege fields.
  return { entryId: entry.entryId, date: entry.date, meal: {
    recipeId: meal.recipeId, servings: meal.servings, addedAt: meal.addedAt,
    ...(meal.recipeName !== undefined && { recipeName: meal.recipeName }),
    ...Object.fromEntries(['calories', 'protein_g', 'carbs_g', 'fat_g'].filter(key => meal[key as keyof LoggedMeal] !== undefined).map(key => [key, meal[key as keyof LoggedMeal]])),
    ...(portion && { foodPortion: { version: 1 as const, sourceId: portion.sourceId, kind: portion.kind,
      quantity: portion.quantity, unit: portion.unit, label: portion.label,
      ...(portion.sourceUrl !== undefined && { sourceUrl: portion.sourceUrl }),
    } }),
  } };
}
