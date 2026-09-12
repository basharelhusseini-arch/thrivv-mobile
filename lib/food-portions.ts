/** New browser entries carry an explicit nutrition basis; legacy logs remain unchanged. */
export interface FoodNutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface BrowserFood {
  id: string;
  name: string;
  kind: 'recipe' | 'ingredient';
  basis: 'serving' | '100g';
  nutrition: FoodNutrition;
  portion?: { label: string; grams: number };
  sourceUrl?: string;
}

export interface LoggedFoodPortion {
  version: 1;
  sourceId: string;
  kind: BrowserFood['kind'];
  quantity: number;
  unit: 'g' | 'serving' | 'portion';
  label: string;
  sourceUrl?: string;
}

export function completeNutrition(nutrition: FoodNutrition): boolean {
  return ['calories', 'protein_g', 'carbs_g', 'fat_g'].every(key => {
    const value = nutrition[key as keyof FoodNutrition];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  });
}

export function scaleFood(food: BrowserFood, quantity: number, unit: LoggedFoodPortion['unit']): FoodNutrition {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) {
    throw new Error('Enter a quantity greater than 0 and no more than 10,000.');
  }
  if (!completeNutrition(food.nutrition)) throw new Error('Nutrition data is incomplete for this food.');
  let factor: number;
  if (food.basis === 'serving' && unit === 'serving') factor = quantity;
  else if (food.basis === '100g' && unit === 'g') factor = quantity / 100;
  else if (food.basis === '100g' && unit === 'portion' && food.portion && Number.isFinite(food.portion.grams) && food.portion.grams > 0) {
    factor = quantity * food.portion.grams / 100;
  } else throw new Error('Choose a supported quantity unit.');
  // Preserve precision in storage; round only for display and daily totals.
  return Object.fromEntries(Object.entries(food.nutrition).map(([key, value]) => [key, value * factor])) as unknown as FoodNutrition;
}

export function portionLabel(food: BrowserFood, quantity: number, unit: LoggedFoodPortion['unit']): string {
  if (unit === 'g') return `${quantity} g`;
  if (unit === 'portion') return `${quantity} × ${food.portion?.label} (${quantity * (food.portion?.grams ?? 0)} g)`;
  return `${quantity} ${quantity === 1 ? 'serving' : 'servings'}`;
}

export function recipeFood(recipe: FoodNutrition & { id: string; name: string; servings: number }, isCustom = false): BrowserFood {
  // Existing built-in log fallback uses the recipe's batch yield. Custom API values are explicitly per serving.
  const divisor = isCustom ? 1 : recipe.servings;
  const validYield = Number.isFinite(divisor) && divisor > 0;
  return {
    id: recipe.id, name: recipe.name, kind: 'recipe', basis: 'serving',
    nutrition: Object.fromEntries(['calories', 'protein_g', 'carbs_g', 'fat_g'].map(key => {
      const value = recipe[key as keyof FoodNutrition];
      return [key, validYield && typeof value === 'number' ? value / divisor : NaN];
    })) as unknown as FoodNutrition,
  };
}

export function formatNutrient(value: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 10) / 10) : '—';
}
