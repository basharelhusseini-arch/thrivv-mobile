'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, UtensilsCrossed, Trash2 } from 'lucide-react';
import { recipesData, type Recipe } from '@/lib/recipes';
import FoodQuantityPicker from '@/components/FoodQuantityPicker';
import { searchBasicIngredients } from '@/lib/basic-ingredients';
import { recipeFood, formatNutrient, type BrowserFood } from '@/lib/food-portions';
import PageHeader from '@/components/PageHeader';

export default function MemberRecipesPage() {
  const [tab, setTab] = useState<'recipes' | 'ingredients'>('recipes');
  const [customError, setCustomError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'protein' | 'calories' | 'carbs'>('protein');
  const [customRecipes, setCustomRecipes] = useState<any[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    highProtein: false,
    lowCarb: false,
    lowCalorie: false,
    vegetarian: false,
    mealPrep: false,
  });

  // Fetch custom recipes on mount
  useEffect(() => {
    fetchCustomRecipes();
  }, []);

  const fetchCustomRecipes = async () => {
    try {
      const response = await fetch('/api/custom-recipes');
      if (!response.ok) throw new Error('Unable to load custom recipes');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid recipe response');
      setCustomRecipes(data);
      setCustomError(false);
    } catch (error) {
      setCustomError(true);
    }
  };

  const deleteCustomRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/custom-recipes/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setCustomRecipes(customRecipes.filter(r => r.id !== id));
        alert('Recipe deleted successfully!');
      } else {
        alert('Failed to delete recipe');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Error deleting recipe');
    }
  };

  // Preserve the existing static and custom recipe sources. Images are unused only here.
  const allRecipes = useMemo(() => {
    const formattedCustomRecipes: Recipe[] = customRecipes.map(cr => {
      const ingredients = (cr.ingredients || []).map((ing: any) => ({
        item: ing.ingredientName,
        quantity: ing.grams,
        unit: 'g',
      }));
      return {
        id: cr.id,
        name: cr.name,
        description: cr.description || 'Custom recipe',
        imageUrl: '',
        imageId: '',
        calories: cr.calories_per_serving,
        protein_g: cr.protein_per_serving,
        carbs_g: cr.carbs_per_serving,
        fat_g: cr.fat_per_serving,
        prepMinutes: 0,
        cookMinutes: 0,
        servings: cr.servings,
        ingredients,
        instructions: ['Custom recipe - instructions not provided'],
        tags: ['custom'],
        isCustom: true,
      };
    });

    return [...recipesData, ...formattedCustomRecipes];
  }, [customRecipes]);

  const toggleFilter = (filter: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  };

  const clearAllFilters = () => {
    setFilters({
      highProtein: false,
      lowCarb: false,
      lowCalorie: false,
      vegetarian: false,
      mealPrep: false,
    });
    setSearchQuery('');
  };

  const filteredAndSortedRecipes = useMemo(() => {
    let recipes: Recipe[] = allRecipes;

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      recipes = recipes.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    const activeFilters = Object.entries(filters).some(([_, value]) => value);
    if (activeFilters) {
      recipes = recipes.filter(recipe => {
        const nutrition = recipeFood(recipe, Boolean((recipe as Recipe & { isCustom?: boolean }).isCustom)).nutrition;
        if (filters.highProtein && !(nutrition.protein_g >= 30)) return false;
        if (filters.lowCarb && !(nutrition.carbs_g <= 30)) return false;
        if (filters.lowCalorie && !(nutrition.calories <= 400)) return false;
        if (filters.vegetarian && !recipe.tags.includes('vegetarian')) return false;
        if (filters.mealPrep && !recipe.tags.includes('meal-prep')) return false;
        return true;
      });
    }

    // Apply sorting
    const nutrient = sortBy === 'protein' ? 'protein_g' : sortBy === 'carbs' ? 'carbs_g' : 'calories';
    recipes = [...recipes].sort((a, b) => {
      const left = recipeFood(a, Boolean((a as Recipe & { isCustom?: boolean }).isCustom)).nutrition[nutrient];
      const right = recipeFood(b, Boolean((b as Recipe & { isCustom?: boolean }).isCustom)).nutrition[nutrient];
      if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : 0;
      if (!Number.isFinite(right)) return -1;
      return sortBy === 'protein' ? right - left : left - right;
    });

    return recipes;
  }, [searchQuery, filters, sortBy, allRecipes]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Recipes"
        title="Browse Recipes"
        subtitle="Your existing meals and everyday ingredients, ready to log."
        action={
          <Link
            href="/recipes/builder"
            className="btn-primary px-5 py-2.5 inline-flex items-center gap-2"
          >
            <UtensilsCrossed className="w-4 h-4" />
            Build Your Recipe
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3" aria-label="Food categories">
        <button type="button" aria-pressed={tab === 'recipes'} onClick={() => setTab('recipes')} className={tab === 'recipes' ? 'btn-primary px-5 py-3' : 'btn-ghost px-5 py-3'}>Meals &amp; Recipes</button>
        <button type="button" aria-pressed={tab === 'ingredients'} onClick={() => setTab('ingredients')} className={tab === 'ingredients' ? 'btn-primary px-5 py-3' : 'btn-ghost px-5 py-3'}>Basic Ingredients</button>
      </div>
      {customError && tab === 'recipes' && <p role="status" className="text-sm text-thrivv-gold-500">Your custom recipes could not be loaded. <button onClick={fetchCustomRecipes} className="underline">Retry</button></p>}
      {tab === 'ingredients' ? <IngredientList /> : <>
      {/* Search and Filters Bar */}
      <div className="mb-8 space-y-4">
        {/* Search and Filter Toggle */}
        <div className="flex gap-3">
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-thrivv-text-muted" />
            <input
              type="text"
              placeholder="Search recipes by name or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium w-full pl-12 pr-4 py-3"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost px-6 py-3 flex items-center gap-2 relative ${showFilters ? 'bg-thrivv-gold-500/10' : ''}`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-thrivv-gold-500 text-black text-xs font-semibold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="premium-card p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-thrivv-text-primary">Filter Recipes</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-thrivv-gold-500 hover:text-thrivv-gold-400 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => toggleFilter('highProtein')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  filters.highProtein
                    ? 'bg-thrivv-gold-500 text-black'
                    : 'bg-thrivv-bg-card text-thrivv-text-secondary hover:bg-thrivv-gold-500/10 border border-thrivv-gold-500/20'
                }`}
              >
                High Protein (≥30g)
              </button>
              <button
                onClick={() => toggleFilter('lowCarb')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  filters.lowCarb
                    ? 'bg-thrivv-gold-500 text-black'
                    : 'bg-thrivv-bg-card text-thrivv-text-secondary hover:bg-thrivv-gold-500/10 border border-thrivv-gold-500/20'
                }`}
              >
                Low Carb (≤30g)
              </button>
              <button
                onClick={() => toggleFilter('lowCalorie')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  filters.lowCalorie
                    ? 'bg-thrivv-gold-500 text-black'
                    : 'bg-thrivv-bg-card text-thrivv-text-secondary hover:bg-thrivv-gold-500/10 border border-thrivv-gold-500/20'
                }`}
              >
                Low Calorie (≤400)
              </button>
              <button
                onClick={() => toggleFilter('vegetarian')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  filters.vegetarian
                    ? 'bg-thrivv-gold-500 text-black'
                    : 'bg-thrivv-bg-card text-thrivv-text-secondary hover:bg-thrivv-gold-500/10 border border-thrivv-gold-500/20'
                }`}
              >
                Vegetarian
              </button>
              <button
                onClick={() => toggleFilter('mealPrep')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  filters.mealPrep
                    ? 'bg-thrivv-gold-500 text-black'
                    : 'bg-thrivv-bg-card text-thrivv-text-secondary hover:bg-thrivv-gold-500/10 border border-thrivv-gold-500/20'
                }`}
              >
                Meal Prep
              </button>
            </div>
          </div>
        )}

        {/* Sort Options */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-thrivv-text-secondary">Sort per serving:</span>
          <button
            onClick={() => setSortBy('protein')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              sortBy === 'protein'
                ? 'bg-thrivv-gold-500 text-black'
                : 'bg-thrivv-bg-card text-thrivv-text-secondary hover:bg-thrivv-gold-500/10'
            }`}
          >
            Highest Protein
          </button>
          <button
            onClick={() => setSortBy('calories')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              sortBy === 'calories'
                ? 'bg-thrivv-gold-500 text-black'
                : 'bg-thrivv-bg-card text-thrivv-text-secondary hover:bg-thrivv-gold-500/10'
            }`}
          >
            Lowest Calories
          </button>
          <button
            onClick={() => setSortBy('carbs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              sortBy === 'carbs'
                ? 'bg-thrivv-gold-500 text-black'
                : 'bg-thrivv-bg-card text-thrivv-text-secondary hover:bg-thrivv-gold-500/10'
            }`}
          >
            Lowest Carbs
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-thrivv-text-secondary text-sm">
          Showing <span className="text-thrivv-gold-500 font-semibold">{filteredAndSortedRecipes.length}</span> of {allRecipes.length} recipes
          {customRecipes.length > 0 && (
            <span className="text-thrivv-gold-500 ml-2">
              ({customRecipes.length} custom)
            </span>
          )}
        </p>
      </div>

      {/* Text-only browsing; detail pages retain their existing images. */}
      {filteredAndSortedRecipes.length === 0 ? (
        <div className="premium-card p-8 text-center">
          <p className="text-thrivv-text-secondary">No recipes found. Try another search or clear the filters.</p>
          <button onClick={clearAllFilters} className="btn-primary px-5 py-3 mt-4">Clear Filters</button>
        </div>
      ) : <ul className="space-y-4">
        {filteredAndSortedRecipes.map(recipe => {
          const custom = Boolean((recipe as Recipe & { isCustom?: boolean }).isCustom);
          const food = recipeFood(recipe, custom);
          return <li key={recipe.id} className="premium-card p-5 sm:p-6">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <Link href={`/member/recipes/${recipe.id}`} className="text-lg font-semibold text-thrivv-text-primary hover:text-thrivv-gold-500">{recipe.name}</Link>
                {custom && <span className="block text-xs text-thrivv-gold-500 mt-1">Your recipe</span>}
                <p className="text-sm text-thrivv-text-secondary mt-1">{recipe.description}</p>
                <p className="text-xs text-thrivv-text-muted mt-2">Per 1 serving · Recipe yield: {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}</p>
              </div>
              {custom && <button onClick={() => deleteCustomRecipe(recipe.id)} aria-label={`Delete ${recipe.name}`} className="btn-ghost p-2 shrink-0"><Trash2 className="w-4 h-4" /></button>}
            </div>
            <FoodMacros food={food} />
            <FoodQuantityPicker food={food} />
          </li>;
        })}
      </ul>}
      </>}
    </div>
  );
}

function FoodMacros({ food }: { food: BrowserFood }) {
  return <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
    {([['Calories', 'calories', 'kcal'], ['Protein', 'protein_g', 'g'], ['Carbs', 'carbs_g', 'g'], ['Fat', 'fat_g', 'g']] as const).map(([label, key, unit]) => (
      <div key={key}><dt className="text-thrivv-text-muted">{label}</dt><dd className="font-semibold text-thrivv-text-primary">{formatNutrient(food.nutrition[key])} {unit}</dd></div>
    ))}
  </dl>;
}

function IngredientList() {
  const [query, setQuery] = useState('');
  const foods = searchBasicIngredients(query);
  return <section className="space-y-4" aria-label="Basic Ingredients">
    <label className="block text-sm text-thrivv-text-secondary">Search ingredients
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Chicken, rice, egg whites…" className="input-premium w-full px-4 py-3 mt-2" />
    </label>
    <p className="text-sm text-thrivv-text-muted">{foods.length} ingredients · Nutrition per 100 g of edible food. Choose the preparation that matches what you weighed.</p>
    {foods.length === 0 && <p role="status" className="premium-card p-6">No ingredients found. Try another search.</p>}
    <ul className="space-y-4">{foods.map(food => <li key={food.id} className="premium-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-thrivv-text-primary">{food.name}</h2>
      <p className="text-xs text-thrivv-text-muted mt-1">Per 100 g</p>
      <FoodMacros food={food} />
      <details className="mt-3 text-xs text-thrivv-text-muted"><summary className="cursor-pointer">Nutrition source</summary>
        <p className="mt-2">{food.sourceDescription}</p>
        <a href={food.sourceUrl} target="_blank" rel="noreferrer" className="text-thrivv-gold-500 underline">USDA FoodData Central · FDC {food.fdcId}</a>
      </details>
      <FoodQuantityPicker food={food} />
    </li>)}</ul>
  </section>;
}
