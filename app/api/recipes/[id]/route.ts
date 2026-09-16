import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { legacyJson, legacyMemberAccess } from '@/lib/legacy-api-access';
import { Recipe } from '@/types';

// Helper function to add backwards-compatible fields
function mapRecipeWithCompatFields(recipe: Recipe): Recipe {
  return {
    ...recipe,
    prepTime: recipe.prepMinutes,
    cookTime: recipe.cookMinutes,
    totalTime: recipe.prepMinutes + recipe.cookMinutes,
    protein: recipe.protein_g,
    carbohydrates: recipe.carbs_g,
    fats: recipe.fat_g,
  };
}

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const access = await legacyMemberAccess();
    if (!access.ok) return access.response;
    const recipe = store.getRecipe(params.id);
    if (!recipe) {
      return legacyJson(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }
    return legacyJson(mapRecipeWithCompatFields(recipe));
  } catch (error) {
    return legacyJson(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}
