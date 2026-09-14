import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyAdminAccess, legacyJson, legacyMemberAccess } from '@/lib/legacy-api-access';
import { Recipe } from '@/types';
import { isValidImageUrl, getFallbackImageUrl } from '@/lib/recipe-image-helper';

// Helper function to add backwards-compatible fields and ensure valid imageUrl
function mapRecipeWithCompatFields(recipe: Recipe): Recipe {
  // Ensure imageUrl is valid, use fallback if not
  let imageUrl = recipe.imageUrl;
  if (!isValidImageUrl(imageUrl)) {
    console.warn(`[DEV] Invalid imageUrl for recipe ${recipe.id}: ${imageUrl}`);
    imageUrl = getFallbackImageUrl(recipe);
  }
  
  return {
    ...recipe,
    imageUrl, // Always return absolute, valid URL
    prepTime: recipe.prepMinutes,
    cookTime: recipe.cookMinutes,
    totalTime: recipe.prepMinutes + recipe.cookMinutes,
    protein: recipe.protein_g,
    carbohydrates: recipe.carbs_g,
    fats: recipe.fat_g,
  };
}

export async function GET() {
  try {
    const access = await legacyMemberAccess();
    if (!access.ok) return access.response;
    const recipes = store.getAllRecipes().map(mapRecipeWithCompatFields);
    return legacyJson(recipes);
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    return legacyJson({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await legacyAdminAccess();
    if (!access.ok) return access.response;
    const body = await request.json();
    const recipe = store.addRecipe(body);
    return legacyJson(recipe, { status: 201 });
  } catch (error) {
    return legacyJson({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
