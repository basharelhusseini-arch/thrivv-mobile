'use client';
import { useClientSession } from '@/lib/client-session';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ingredientsDatabase, 
  searchIngredients, 
  getAllCategories, 
  getIngredientsByCategory,
  calculateNutrition,
  type Ingredient 
} from '@/lib/ingredients-database';

interface RecipeIngredient {
  ingredient: Ingredient;
  grams: number;
  id: string; // Unique ID for this ingredient instance
}

export default function RecipeBuilderPage() {
  const { user } = useClientSession();
  const router = useRouter();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [servings, setServings] = useState(1);

  // Check authentication on mount
  useEffect(() => {
    const storedMemberId = user?.id;
    if (!storedMemberId) {
      return;
    }
    setMemberId(storedMemberId);
  }, [user?.id]);

  const categories = ['All', ...getAllCategories()];

  // Filter ingredients based on search and category
  const filteredIngredients = useMemo(() => {
    let results = searchQuery 
      ? searchIngredients(searchQuery) 
      : ingredientsDatabase;

    if (selectedCategory !== 'All') {
      results = results.filter(ing => ing.category === selectedCategory);
    }

    return results.slice(0, 50); // Limit to 50 results for performance
  }, [searchQuery, selectedCategory]);

  // Add ingredient to recipe
  const addIngredient = (ingredient: Ingredient) => {
    const newIngredient: RecipeIngredient = {
      ingredient,
      grams: ingredient.commonServing?.grams || 100,
      id: `${ingredient.id}-${Date.now()}`
    };
    setRecipeIngredients([...recipeIngredients, newIngredient]);
    setSearchQuery(''); // Clear search after adding
  };

  // Update ingredient grams
  const updateGrams = (id: string, grams: number) => {
    setRecipeIngredients(recipeIngredients.map(ri => 
      ri.id === id ? { ...ri, grams } : ri
    ));
  };

  // Remove ingredient
  const removeIngredient = (id: string) => {
    setRecipeIngredients(recipeIngredients.filter(ri => ri.id !== id));
  };

  // Calculate total nutrition
  const totalNutrition = useMemo(() => {
    return recipeIngredients.reduce((total, ri) => {
      const nutrition = calculateNutrition(ri.ingredient, ri.grams);
      return {
        calories: total.calories + nutrition.calories,
        protein_g: total.protein_g + nutrition.protein_g,
        carbs_g: total.carbs_g + nutrition.carbs_g,
        fat_g: total.fat_g + nutrition.fat_g,
        fiber_g: total.fiber_g + nutrition.fiber_g,
        sugar_g: total.sugar_g + nutrition.sugar_g,
      };
    }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
  }, [recipeIngredients]);

  // Calculate per-serving nutrition
  const perServingNutrition = useMemo(() => {
    if (servings <= 0) return totalNutrition;
    return {
      calories: Math.round(totalNutrition.calories / servings),
      protein_g: Math.round(totalNutrition.protein_g / servings * 10) / 10,
      carbs_g: Math.round(totalNutrition.carbs_g / servings * 10) / 10,
      fat_g: Math.round(totalNutrition.fat_g / servings * 10) / 10,
      fiber_g: Math.round(totalNutrition.fiber_g / servings * 10) / 10,
      sugar_g: Math.round(totalNutrition.sugar_g / servings * 10) / 10,
    };
  }, [totalNutrition, servings]);

  const [saving, setSaving] = useState(false);

  const saveRecipe = async () => {
    if (!memberId) {
      alert('Please log in first to save recipes');
      router.push('/member/login');
      return;
    }

    if (!recipeName || recipeIngredients.length === 0) {
      alert('Please add a recipe name and at least one ingredient');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/custom-recipes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: send cookies with request
        body: JSON.stringify({
          name: recipeName,
          description: `Custom recipe with ${recipeIngredients.length} ingredients`,
          servings,
          ingredients: recipeIngredients.map(ri => ({
            ingredientId: ri.ingredient.id,
            ingredientName: ri.ingredient.name,
            grams: ri.grams
          })),
          totalNutrition,
          perServingNutrition
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          alert('Your session has expired. Please log in again.');
          localStorage.removeItem('memberId');
          localStorage.removeItem('memberName');
          localStorage.removeItem('memberEmail');
          router.push('/member/login');
          return;
        }
        
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const savedRecipe = await response.json();
      alert(`Recipe "${recipeName}" saved successfully! ✅\n\nYou can find it on the Recipes page.`);
      
      // Reset form
      setRecipeName('');
      setRecipeIngredients([]);
      setServings(1);
      
      // Optionally redirect to recipes page
      router.push('/member/recipes');
    } catch (error: any) {
      console.error('Error saving recipe:', error);
      alert(`Failed to save recipe: ${error.message}\n\nIf this persists, try logging out and back in.`);
    } finally {
      setSaving(false);
    }
  };

  // Show loading state while checking auth
  if (memberId === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-thrivv-gold-500/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/member/recipes"
              className="text-thrivv-gold-500 hover:text-thrivv-gold-400 transition-colors"
            >
              ← Back to Recipes
            </Link>
            <h1 className="text-2xl font-bold text-thrivv-gold-500">Recipe Builder</h1>
          </div>
          <button
            onClick={saveRecipe}
            disabled={!recipeName || recipeIngredients.length === 0 || saving}
            className="px-4 py-2 bg-thrivv-gold-500 text-black font-semibold rounded-lg hover:bg-thrivv-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Ingredient Search & Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipe Name */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-thrivv-gold-500/20">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipe Name
              </label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="e.g., My High-Protein Breakfast Bowl"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-thrivv-gold-500 transition-colors"
              />
            </div>

            {/* Ingredient Search */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-thrivv-gold-500/20">
              <h2 className="text-xl font-bold text-thrivv-gold-500 mb-4">Search Ingredients</h2>
              
              {/* Search Input */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ingredients (e.g., chicken, rice, broccoli...)"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-thrivv-gold-500 transition-colors mb-4"
              />

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap mb-4">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-thrivv-gold-500 text-black'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Ingredient Results */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredIngredients.map(ingredient => (
                  <div
                    key={ingredient.id}
                    className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-thrivv-gold-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{ingredient.name}</h3>
                        <p className="text-sm text-gray-400">{ingredient.category}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>{ingredient.calories} cal</span>
                          <span>P: {ingredient.protein_g}g</span>
                          <span>C: {ingredient.carbs_g}g</span>
                          <span>F: {ingredient.fat_g}g</span>
                          <span className="text-gray-500">(per 100g)</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addIngredient(ingredient)}
                        className="ml-4 px-4 py-2 bg-thrivv-gold-500 text-black font-semibold rounded-lg hover:bg-thrivv-gold-400 transition-colors text-sm"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
                {filteredIngredients.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No ingredients found. Try a different search term.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Recipe Summary */}
          <div className="space-y-6">
            {/* Current Recipe Ingredients */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-thrivv-gold-500/20 sticky top-24">
              <h2 className="text-xl font-bold text-thrivv-gold-500 mb-4">Your Recipe</h2>

              {recipeIngredients.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Add ingredients to start building your recipe
                </p>
              ) : (
                <>
                  {/* Servings Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Servings
                    </label>
                    <input
                      type="number"
                      value={servings}
                      onChange={(e) => setServings(Math.max(0.5, parseFloat(e.target.value) || 1))}
                      step="0.5"
                      min="0.5"
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-thrivv-gold-500"
                    />
                  </div>

                  {/* Ingredients List */}
                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {recipeIngredients.map(ri => {
                      const nutrition = calculateNutrition(ri.ingredient, ri.grams);
                      return (
                        <div key={ri.id} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium text-white flex-1">
                              {ri.ingredient.name}
                            </span>
                            <button
                              onClick={() => removeIngredient(ri.id)}
                              className="text-red-400 hover:text-red-300 text-xs ml-2"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={ri.grams}
                              onChange={(e) => updateGrams(ri.id, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-thrivv-gold-500"
                              min="0"
                              step="1"
                            />
                            <span className="text-xs text-gray-400">grams</span>
                          </div>
                          <div className="flex gap-3 mt-2 text-xs text-gray-400">
                            <span>{nutrition.calories} cal</span>
                            <span>P: {nutrition.protein_g}g</span>
                            <span>C: {nutrition.carbs_g}g</span>
                            <span>F: {nutrition.fat_g}g</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Nutrition */}
                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="font-semibold text-thrivv-gold-500 mb-3">Total Nutrition</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-white">{totalNutrition.calories}</div>
                        <div className="text-xs text-gray-400">Calories</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-white">{totalNutrition.protein_g}g</div>
                        <div className="text-xs text-gray-400">Protein</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-white">{totalNutrition.carbs_g}g</div>
                        <div className="text-xs text-gray-400">Carbs</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-white">{totalNutrition.fat_g}g</div>
                        <div className="text-xs text-gray-400">Fat</div>
                      </div>
                    </div>

                    {servings > 0 && servings !== 1 && (
                      <>
                        <h3 className="font-semibold text-thrivv-gold-500 mb-3 mt-4">
                          Per Serving ({servings} servings)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-white">{perServingNutrition.calories}</div>
                            <div className="text-xs text-gray-400">Calories</div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-white">{perServingNutrition.protein_g}g</div>
                            <div className="text-xs text-gray-400">Protein</div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-white">{perServingNutrition.carbs_g}g</div>
                            <div className="text-xs text-gray-400">Carbs</div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-white">{perServingNutrition.fat_g}g</div>
                            <div className="text-xs text-gray-400">Fat</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
