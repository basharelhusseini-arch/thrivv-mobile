'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Calendar, Target, TrendingUp, UtensilsCrossed, Trash2, ChefHat, CheckCircle } from 'lucide-react';
import { NutritionPlan } from '@/types';
import PageHeader from '@/components/MemberPageHeader';
import { getTodayLog, removeMealFromToday, computeTotals, getRecipeFromMeal, type DailyLog } from '@/lib/nutrition-log';

export default function MemberNutritionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const updateHealthScore = useCallback(async (userId: string, log?: typeof todayLog) => {
    try {
      // Get the log if not provided
      const nutritionLog = log || await getTodayLog(userId);
      
      // Compute totals
      const totals = computeTotals(nutritionLog);
      
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/health/update-from-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          memberId: userId,
          date: today,
          totalCalories: totals.calories,
          totalProtein: totals.protein_g,
          totalCarbs: totals.carbs_g,
          totalFat: totals.fat_g,
          mealCount: totals.mealCount,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Failed to update health score:', errorText);
      } else {
        console.log('✅ Health score updated successfully');
      }
    } catch (error) {
      console.error('Failed to update health score:', error);
    }
  }, []);

  const fetchPlans = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/nutrition-plans?memberId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Failed to fetch nutrition plans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTodayLog = useCallback(async (id: string) => {
    const log = await getTodayLog(id);
    setTodayLog(log);
    
    // Update health score if meals are logged
    if (log.meals.length > 0) {
      await updateHealthScore(id, log);
    }
  }, [updateHealthScore]);

  useEffect(() => {
    const storedMemberId = localStorage.getItem('memberId');
    if (!storedMemberId) {
      router.push('/member/login');
      return;
    }
    setMemberId(storedMemberId);
    fetchPlans(storedMemberId);
    loadTodayLog(storedMemberId);
  }, [router, refreshKey, fetchPlans, loadTodayLog]);

  const handleRemoveMeal = async (recipeId: string) => {
    if (!memberId || !confirm('Remove this meal from today?')) return;

    try {
      await removeMealFromToday(memberId, recipeId);
      
      // Update health score after removing meal
      await updateHealthScore(memberId);
      
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to remove meal:', error);
      alert('Failed to remove meal. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <UtensilsCrossed className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading nutrition
          </span>
        </div>
      </div>
    );
  }

  const activePlan = plans.find(p => p.status === 'active');
  const todayTotals = todayLog ? computeTotals(todayLog) : null;

  return (
    <div className="member-future space-y-10" data-section="nutrition">
      <PageHeader
        section="nutrition"
        eyebrow="Fuel"
        title="Fuel your next move."
        subtitle="Your meals, macros and recipes, together in one place. Nutrition tracking is separate from your Health Score."
      />

      <main className="space-y-8">
        {/* Today's Logged Meals */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-thrivv-text-primary">Today&apos;s Logged Meals</h2>
            <Link
              href="/member/recipes"
              className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4" />
              Add from Recipes
            </Link>
          </div>

          {todayLog && todayLog.meals.length > 0 ? (
            <div className="space-y-4">
              {/* Meals List */}
              {todayLog.meals.map((meal, index) => {
                const recipe = getRecipeFromMeal(meal);
                if (!recipe) return null;

                const mealCalories = Math.round((recipe.calories * meal.servings) / recipe.servings);
                const mealProtein = Math.round((recipe.protein_g * meal.servings) / recipe.servings);
                const mealCarbs = Math.round((recipe.carbs_g * meal.servings) / recipe.servings);
                const mealFat = Math.round((recipe.fat_g * meal.servings) / recipe.servings);

                return (
                  <div key={`${meal.recipeId}-${index}`} className="p-4 bg-thrivv-bg-card/50 rounded-xl hover:bg-thrivv-bg-card transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          {meal.foodPortion?.kind === 'ingredient' ? (
                            <span className="text-lg font-semibold text-thrivv-text-primary">{recipe.name}</span>
                          ) : <Link
                            href={`/member/recipes/${meal.foodPortion?.sourceId ?? recipe.id}`}
                            className="text-lg font-semibold text-thrivv-text-primary hover:text-thrivv-gold-500 transition-colors"
                          >
                            {recipe.name}
                          </Link>}
                          <span className="text-sm text-thrivv-text-muted">
                            ({meal.foodPortion?.label ?? `${meal.servings} ${meal.servings === 1 ? 'serving' : 'servings'}`})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-thrivv-text-muted">Calories:</span>
                            <span className="ml-2 text-thrivv-gold-500 font-semibold">{mealCalories}</span>
                          </div>
                          <div>
                            <span className="text-thrivv-text-muted">Protein:</span>
                            <span className="ml-2 text-thrivv-text-primary font-semibold">{mealProtein}g</span>
                          </div>
                          <div>
                            <span className="text-thrivv-text-muted">Carbs:</span>
                            <span className="ml-2 text-thrivv-text-primary font-semibold">{mealCarbs}g</span>
                          </div>
                          <div>
                            <span className="text-thrivv-text-muted">Fat:</span>
                            <span className="ml-2 text-thrivv-text-primary font-semibold">{mealFat}g</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMeal(meal.recipeId)}
                        className="ml-4 p-2 text-thrivv-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove meal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Totals Summary */}
              {todayTotals && (
                <div className="p-6 bg-gradient-to-br from-thrivv-gold-500/10 to-thrivv-gold-500/10 border border-thrivv-gold-500/30 rounded-xl mt-6">
                  <h3 className="text-lg font-semibold text-thrivv-text-primary mb-4">Today&apos;s Totals</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-thrivv-text-muted mb-1">Total Calories</p>
                      <p className="text-2xl font-semibold text-thrivv-gold-500">{todayTotals.calories}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-thrivv-text-muted mb-1">Protein</p>
                      <p className="text-2xl font-semibold text-thrivv-text-primary">{todayTotals.protein_g}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-thrivv-text-muted mb-1">Carbs</p>
                      <p className="text-2xl font-semibold text-thrivv-text-primary">{todayTotals.carbs_g}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-thrivv-text-muted mb-1">Fat</p>
                      <p className="text-2xl font-semibold text-thrivv-text-primary">{todayTotals.fat_g}g</p>
                    </div>
                  </div>

                  {/* Target Comparison */}
                  {activePlan && (
                    <div className="mt-6 pt-6 border-t border-thrivv-gold-500/20">
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-thrivv-text-secondary">Target from active plan:</span>
                        <Link
                          href={`/nutrition/${activePlan.id}`}
                          className="text-thrivv-gold-500 hover:text-thrivv-gold-400 transition-colors"
                        >
                          View Plan →
                        </Link>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div className="text-center">
                          <p className="text-thrivv-text-muted mb-1">Target</p>
                          <p className="text-thrivv-text-primary font-medium">{activePlan.macroTargets.calories}</p>
                          <p className={`mt-1 ${
                            Math.abs(todayTotals.calories - activePlan.macroTargets.calories) <= activePlan.macroTargets.calories * 0.1
                              ? 'text-thrivv-neon-green'
                              : 'text-thrivv-gold-500'
                          }`}>
                            {todayTotals.calories > activePlan.macroTargets.calories ? '+' : ''}
                            {todayTotals.calories - activePlan.macroTargets.calories}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-thrivv-text-muted mb-1">Target</p>
                          <p className="text-thrivv-text-primary font-medium">{Math.round(activePlan.macroTargets.protein || 0)}g</p>
                          <p className={`mt-1 ${
                            Math.abs(todayTotals.protein_g - Math.round(activePlan.macroTargets.protein || 0)) <= (activePlan.macroTargets.protein || 1) * 0.15
                              ? 'text-thrivv-neon-green'
                              : 'text-thrivv-gold-500'
                          }`}>
                            {todayTotals.protein_g > (activePlan.macroTargets.protein || 0) ? '+' : ''}
                            {Math.round(todayTotals.protein_g - (activePlan.macroTargets.protein || 0))}g
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-thrivv-text-muted mb-1">Target</p>
                          <p className="text-thrivv-text-primary font-medium">{Math.round(activePlan.macroTargets.carbohydrates || 0)}g</p>
                          <p className={`mt-1 ${
                            Math.abs(todayTotals.carbs_g - Math.round(activePlan.macroTargets.carbohydrates || 0)) <= (activePlan.macroTargets.carbohydrates || 1) * 0.15
                              ? 'text-thrivv-neon-green'
                              : 'text-thrivv-gold-500'
                          }`}>
                            {todayTotals.carbs_g > (activePlan.macroTargets.carbohydrates || 0) ? '+' : ''}
                            {Math.round(todayTotals.carbs_g - (activePlan.macroTargets.carbohydrates || 0))}g
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-thrivv-text-muted mb-1">Target</p>
                          <p className="text-thrivv-text-primary font-medium">{Math.round(activePlan.macroTargets.fats || 0)}g</p>
                          <p className={`mt-1 ${
                            Math.abs(todayTotals.fat_g - Math.round(activePlan.macroTargets.fats || 0)) <= (activePlan.macroTargets.fats || 1) * 0.15
                              ? 'text-thrivv-neon-green'
                              : 'text-thrivv-gold-500'
                          }`}>
                            {todayTotals.fat_g > (activePlan.macroTargets.fats || 0) ? '+' : ''}
                            {Math.round(todayTotals.fat_g - (activePlan.macroTargets.fats || 0))}g
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="icon-badge w-20 h-20 mx-auto mb-4">
                <UtensilsCrossed className="w-10 h-10 text-thrivv-gold-500" />
              </div>
              <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">No meals logged today</h3>
              <p className="text-thrivv-text-secondary mb-6">Start tracking your nutrition by adding recipes</p>
              <Link
                href="/member/recipes"
                className="inline-flex items-center btn-primary px-6 py-3"
              >
                <ChefHat className="w-5 h-5 mr-2" />
                Browse Recipes
              </Link>
            </div>
          )}
        </div>

        {/* Nutrition Plans Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-thrivv-text-primary">My Nutrition Plans</h2>
          <Link
            href="/nutrition/new"
            className="flex items-center btn-primary px-6 py-3"
          >
            <Plus className="w-5 h-5 mr-2" />
            Generate New Plan
          </Link>
        </div>

        {plans.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <div className="icon-badge w-20 h-20 mx-auto mb-6">
              <Target className="w-10 h-10 text-thrivv-gold-500" />
            </div>
            <h3 className="text-2xl font-semibold text-thrivv-text-primary mb-2">No nutrition plans yet</h3>
            <p className="text-thrivv-text-secondary mb-8">Generate a personalized AI-powered meal plan</p>
            <Link
              href="/nutrition/new"
              className="inline-flex items-center btn-primary px-6 py-3"
            >
              <Plus className="w-5 h-5 mr-2" />
              Generate Your First Plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/nutrition/${plan.id}`}
                className="premium-card p-6 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-thrivv-text-primary">{plan.name}</h3>
                  <span className={`px-3 py-1 text-xs font-medium rounded-lg ${
                    plan.status === 'active' ? 'success-badge' :
                    plan.status === 'completed' ? 'bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20' :
                    'bg-thrivv-bg-card text-thrivv-text-muted border border-thrivv-gold-500/10'
                  }`}>
                    {plan.status}
                  </span>
                </div>
                <p className="text-thrivv-text-secondary text-sm mb-6 line-clamp-2">{plan.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-thrivv-text-secondary">
                    <Target className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                    <span className="capitalize">{plan.goal.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center text-sm text-thrivv-text-secondary">
                    <TrendingUp className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                    {plan.macroTargets.calories} calories/day
                  </div>
                  <div className="flex items-center text-sm text-thrivv-text-secondary">
                    <Calendar className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                    {plan.duration} days
                  </div>
                </div>

                <div className="flex items-center text-thrivv-gold-500 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  View Details →
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
