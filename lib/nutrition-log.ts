/**
 * Nutrition Log - Single Source of Truth for Daily Meal Tracking
 * Integrates Recipes with Diet Tracker and Health Score
 * 
 * Storage Strategy:
 * 1. Primary: Supabase table `daily_meals` (if configured)
 * 2. Fallback: localStorage (for development/offline)
 */

import { recipesData, getRecipeById, type Recipe } from '@/lib/recipes';
import { scaleFood, portionLabel, type BrowserFood, type LoggedFoodPortion } from '@/lib/food-portions';

// ===== TYPES =====

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

// ===== STORAGE DETECTION =====

function isSupabaseAvailable(): boolean {
  // Check if Supabase is configured
  return false; // TODO: Implement Supabase detection
  // return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}

// ===== HELPER FUNCTIONS =====

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getStorageKey(memberId: string, date: string): string {
  return `nutrition_log_${memberId}_${date}`;
}

// ===== COMPUTE TOTALS FROM LOG =====

export function computeTotals(log: DailyLog): NutritionTotals {
  let calories = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;

  log.meals.forEach(meal => {
    // First, try to use stored nutrition data (for custom recipes)
    if ((meal.foodPortion?.version === 1 || meal.calories) && meal.calories !== undefined && meal.protein_g !== undefined && meal.carbs_g !== undefined && meal.fat_g !== undefined) {
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

// ===== LOCALSTORAGE IMPLEMENTATION =====

function getTodayLogFromLocalStorage(memberId: string): DailyLog {
  const today = getTodayDate();
  const key = getStorageKey(memberId, today);
  
  if (typeof window === 'undefined') {
    return { date: today, meals: [] };
  }

  const stored = localStorage.getItem(key);
  if (!stored) {
    return { date: today, meals: [] };
  }

  try {
    const parsed = JSON.parse(stored);
    return parsed;
  } catch (error) {
    console.error('Failed to parse nutrition log:', error);
    return { date: today, meals: [] };
  }
}

function saveTodayLogToLocalStorage(memberId: string, log: DailyLog): void {
  const key = getStorageKey(memberId, log.date);
  localStorage.setItem(key, JSON.stringify(log));
}

// ===== SUPABASE IMPLEMENTATION (Placeholder) =====

async function getTodayLogFromSupabase(memberId: string): Promise<DailyLog> {
  // TODO: Implement Supabase fetch
  // const { data, error } = await supabase
  //   .from('daily_meals')
  //   .select('*')
  //   .eq('member_id', memberId)
  //   .eq('date', getTodayDate());
  
  // For now, fallback to localStorage
  return getTodayLogFromLocalStorage(memberId);
}

async function addMealToSupabase(memberId: string, recipeId: string, servings: number): Promise<DailyLog> {
  // TODO: Implement Supabase insert
  // const { data, error } = await supabase
  //   .from('daily_meals')
  //   .insert({
  //     member_id: memberId,
  //     date: getTodayDate(),
  //     recipe_id: recipeId,
  //     servings: servings,
  //   });
  
  // For now, use localStorage
  const log = getTodayLogFromLocalStorage(memberId);
  log.meals.push({
    recipeId,
    servings,
    addedAt: new Date().toISOString(),
  });
  saveTodayLogToLocalStorage(memberId, log);
  return log;
}

async function removeMealFromSupabase(memberId: string, recipeId: string): Promise<DailyLog> {
  // TODO: Implement Supabase delete
  // For now, use localStorage
  const log = getTodayLogFromLocalStorage(memberId);
  log.meals = log.meals.filter(meal => meal.recipeId !== recipeId);
  saveTodayLogToLocalStorage(memberId, log);
  return log;
}

// ===== PUBLIC API =====

export async function getTodayLog(memberId: string): Promise<DailyLog> {
  if (isSupabaseAvailable()) {
    return await getTodayLogFromSupabase(memberId);
  }
  return getTodayLogFromLocalStorage(memberId);
}

/** Adds a browser portion atomically within this tab, with a stable ID for retries.
 * Uses the existing storage key; never merges into or rewrites legacy meal entries.
 */
export async function addFoodPortionToToday(
  memberId: string, food: BrowserFood, quantity: number,
  unit: LoggedFoodPortion['unit'], submissionId: string
): Promise<DailyLog> {
  if (!memberId || !submissionId || typeof window === 'undefined') throw new Error('Sign in before adding food.');
  const nutrition = scaleFood(food, quantity, unit);
  const date = getTodayDate();
  const key = getStorageKey(memberId, date);
  // Unlike the legacy reader, do not overwrite an unreadable existing log.
  const stored = localStorage.getItem(key);
  const log: DailyLog = stored ? JSON.parse(stored) : { date, meals: [] };
  if (log.date !== date || !Array.isArray(log.meals)) throw new Error('Your food log could not be read. Nothing was changed.');
  const recipeId = `food-entry:${submissionId}`;
  if (log.meals.some(meal => meal.recipeId === recipeId)) return log;
  log.meals.push({
    recipeId, recipeName: food.name, servings: 1, addedAt: new Date().toISOString(), ...nutrition,
    foodPortion: {
      version: 1, sourceId: food.id, kind: food.kind, quantity, unit,
      label: portionLabel(food, quantity, unit), sourceUrl: food.sourceUrl,
    },
  });
  saveTodayLogToLocalStorage(memberId, log);
  return log;
}

export async function addMealToToday(
  memberId: string,
  recipeId: string,
  servings: number = 1,
  recipeData?: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }
): Promise<DailyLog> {
  console.log('[nutrition-log] addMealToToday called:', { memberId, recipeId, servings, hasRecipeData: !!recipeData });
  
  // Try to get recipe data if not provided
  let mealData = recipeData;
  if (!mealData) {
    const recipe = getRecipeById(recipeId);
    if (recipe) {
      console.log('[nutrition-log] Recipe found in recipesData:', recipe.name);
      mealData = {
        name: recipe.name,
        calories: recipe.calories,
        protein_g: recipe.protein_g,
        carbs_g: recipe.carbs_g,
        fat_g: recipe.fat_g,
      };
    } else {
      console.log('[nutrition-log] Recipe not in recipesData (likely a custom recipe):', recipeId);
    }
  }

  if (isSupabaseAvailable()) {
    return await addMealToSupabase(memberId, recipeId, servings);
  }

  // localStorage implementation
  console.log('[nutrition-log] Using localStorage');
  const log = getTodayLogFromLocalStorage(memberId);
  console.log('[nutrition-log] Current log:', log);
  
  // Check if already added today (prevent duplicates)
  const existingIndex = log.meals.findIndex(m => m.recipeId === recipeId);
  if (existingIndex >= 0) {
    // Update servings instead of adding duplicate
    console.log('[nutrition-log] Updating existing meal servings');
    log.meals[existingIndex].servings += servings;
  } else {
    console.log('[nutrition-log] Adding new meal');
    const newMeal: LoggedMeal = {
      recipeId,
      servings,
      addedAt: new Date().toISOString(),
    };
    
    // Add nutrition data if available
    if (mealData) {
      newMeal.recipeName = mealData.name;
      newMeal.calories = mealData.calories;
      newMeal.protein_g = mealData.protein_g;
      newMeal.carbs_g = mealData.carbs_g;
      newMeal.fat_g = mealData.fat_g;
    }
    
    log.meals.push(newMeal);
  }
  
  saveTodayLogToLocalStorage(memberId, log);
  console.log('[nutrition-log] Meal added successfully, new log:', log);
  return log;
}

export async function removeMealFromToday(
  memberId: string,
  recipeId: string
): Promise<DailyLog> {
  if (isSupabaseAvailable()) {
    return await removeMealFromSupabase(memberId, recipeId);
  }

  // localStorage implementation
  const log = getTodayLogFromLocalStorage(memberId);
  log.meals = log.meals.filter(meal => meal.recipeId !== recipeId);
  saveTodayLogToLocalStorage(memberId, log);
  return log;
}

export async function updateMealServings(
  memberId: string,
  recipeId: string,
  servings: number
): Promise<DailyLog> {
  const log = await getTodayLog(memberId);
  const meal = log.meals.find(m => m.recipeId === recipeId);
  
  if (meal) {
    meal.servings = servings;
    saveTodayLogToLocalStorage(memberId, log);
  }
  
  return log;
}

// ===== UTILITY FUNCTIONS =====

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

export function getTodayTotals(memberId: string): NutritionTotals {
  const log = getTodayLogFromLocalStorage(memberId);
  return computeTotals(log);
}

export function getMealMacros(meal: LoggedMeal): NutritionTotals | null {
  const recipe = getRecipeById(meal.recipeId);
  if (!recipe) return null;

  const multiplier = meal.servings / recipe.servings;
  return {
    calories: Math.round(recipe.calories * multiplier),
    protein_g: Math.round(recipe.protein_g * multiplier),
    carbs_g: Math.round(recipe.carbs_g * multiplier),
    fat_g: Math.round(recipe.fat_g * multiplier),
    mealCount: 1,
  };
}
