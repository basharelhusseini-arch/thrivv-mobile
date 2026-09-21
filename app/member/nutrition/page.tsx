'use client';
import { useTranslation } from '@/lib/i18n/client';


import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Calendar, Target, TrendingUp, UtensilsCrossed, Trash2, ChefHat, CheckCircle } from 'lucide-react';
import { NutritionPlan } from '@/types';
import PageHeader from '@/components/MemberPageHeader';
import { getTodayLog, removeMealFromToday, computeTotals, getRecipeFromMeal, getMealMacros, type DailyLog } from '@/lib/nutrition-log';

import { useClientSession } from '@/lib/client-session';

export default function MemberNutritionPage() {
  const { t, locale } = useTranslation();
  const session = useClientSession();
  const memberId = session.user?.id;
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const router = useRouter();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPlans = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/nutrition-plans?memberId=${id}`);
      if (!response.ok) throw new Error('Your nutrition plans could not be loaded. Please retry.');
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      setError('Your nutrition plans could not be loaded. Please retry.');
    }
  }, []);

  const loadTodayLog = useCallback(async (id: string) => {
    try { setTodayLog(await getTodayLog(id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load your food log.'); }
  }, []);

  useEffect(() => {
    if (session.status === 'unauthenticated') { router.replace('/member/login?redirect=/member/nutrition'); return; }
    if (!memberId) return;
    setError('');
    setLoading(true);
    Promise.all([fetchPlans(memberId), loadTodayLog(memberId)]).finally(() => setLoading(false));
  }, [session.status, memberId, router, refreshKey, fetchPlans, loadTodayLog]);

  const handleRemoveMeal = async (entryId: string) => {
    if (!memberId || removing) return;
    setRemoving(entryId);
    setError('');
    try { setTodayLog(await removeMealFromToday(memberId, entryId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove this meal. Please retry.'); }
    finally { setRemoving(null); }
  };

  if (session.status === 'error') return <div role="alert" className="premium-card p-6">{t("Your session could not be checked.")} <button className="underline" onClick={() => session.refresh()}>{t("Retry")}</button></div>;

  if (loading || session.status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <UtensilsCrossed className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">{t("Loading nutrition")}</span>
        </div>
      </div>
    );
  }

  const activePlan = plans.find(p => p.status === 'active');
  const todayTotals = todayLog ? computeTotals(todayLog) : null;

  return (
    <div className="member-future space-y-6" data-section="nutrition">
      <PageHeader
        section="nutrition"
        eyebrow={t("Fuel")}
        title={t("Fuel your next move.")}
        subtitle={t("Your meals, macros and recipes, together in one place. Nutrition tracking is separate from your Health Score.")}
      />

      <main className="space-y-6">
        {error && <div role="alert" className="rounded-xl border border-red-500/30 p-4 text-sm text-red-300">{t(error)} <button className="underline" onClick={() => setRefreshKey(key => key + 1)}>{t("Retry")}</button></div>}
        {/* Today's Logged Meals */}
        <div className="premium-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-semibold text-thrivv-text-primary">{t("Today’s food log")}</h2>
            <Link
              href="/member/recipes"
              className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4" />{t("Add food")}</Link>
          </div>

          {todayLog && todayLog.meals.length > 0 ? (
            <div className="space-y-4">
              {/* Meals List */}
              {todayLog.meals.map((meal, index) => {
                const recipe = getRecipeFromMeal(meal);
                if (!recipe) return null;

                const macros = getMealMacros(meal);
                const mealCalories = macros?.calories ?? 0;
                const mealProtein = macros?.protein_g ?? 0;
                const mealCarbs = macros?.carbs_g ?? 0;
                const mealFat = macros?.fat_g ?? 0;

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
                            <span className="text-thrivv-text-muted">{t("Calories:")}</span>
                            <span className="ms-2 text-thrivv-gold-500 font-semibold">{mealCalories}</span>
                          </div>
                          <div>
                            <span className="text-thrivv-text-muted">{t("Protein:")}</span>
                            <span className="ms-2 text-thrivv-text-primary font-semibold">{mealProtein}{t("g")}</span>
                          </div>
                          <div>
                            <span className="text-thrivv-text-muted">{t("Carbs:")}</span>
                            <span className="ms-2 text-thrivv-text-primary font-semibold">{mealCarbs}{t("g")}</span>
                          </div>
                          <div>
                            <span className="text-thrivv-text-muted">{t("Fat:")}</span>
                            <span className="ms-2 text-thrivv-text-primary font-semibold">{mealFat}{t("g")}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMeal(meal.id || meal.recipeId)}
                        disabled={removing !== null}
                        aria-label={t("Remove {0}", { 0: recipe.name })}
                        className="ms-4 p-2 text-thrivv-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={t("Remove meal")}
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
                  <h3 className="text-lg font-semibold text-thrivv-text-primary mb-4">{t("Daily totals")}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-thrivv-text-muted mb-1">{t("Total Calories")}</p>
                      <p className="text-2xl font-semibold text-thrivv-gold-500">{todayTotals.calories}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-thrivv-text-muted mb-1">{t("Protein")}</p>
                      <p className="text-2xl font-semibold text-thrivv-text-primary">{todayTotals.protein_g}{t("g")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-thrivv-text-muted mb-1">{t("Carbs")}</p>
                      <p className="text-2xl font-semibold text-thrivv-text-primary">{todayTotals.carbs_g}{t("g")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-thrivv-text-muted mb-1">{t("Fat")}</p>
                      <p className="text-2xl font-semibold text-thrivv-text-primary">{todayTotals.fat_g}{t("g")}</p>
                    </div>
                  </div>

                  {/* Target Comparison */}
                  {activePlan && (
                    <div className="mt-6 pt-6 border-t border-thrivv-gold-500/20">
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-thrivv-text-secondary">{t("Target from active plan:")}</span>
                        <Link
                          href={`/nutrition/${activePlan.id}`}
                          className="text-thrivv-gold-500 hover:text-thrivv-gold-400 transition-colors"
                        >{t("View Plan →")}</Link>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div className="text-center">
                          <p className="text-thrivv-text-muted mb-1">{t("Target")}</p>
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
                          <p className="text-thrivv-text-muted mb-1">{t("Target")}</p>
                          <p className="text-thrivv-text-primary font-medium">{Math.round(activePlan.macroTargets.protein || 0)}{t("g")}</p>
                          <p className={`mt-1 ${
                            Math.abs(todayTotals.protein_g - Math.round(activePlan.macroTargets.protein || 0)) <= (activePlan.macroTargets.protein || 1) * 0.15
                              ? 'text-thrivv-neon-green'
                              : 'text-thrivv-gold-500'
                          }`}>
                            {todayTotals.protein_g > (activePlan.macroTargets.protein || 0) ? '+' : ''}
                            {Math.round(todayTotals.protein_g - (activePlan.macroTargets.protein || 0))}{t("g")}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-thrivv-text-muted mb-1">{t("Target")}</p>
                          <p className="text-thrivv-text-primary font-medium">{Math.round(activePlan.macroTargets.carbohydrates || 0)}{t("g")}</p>
                          <p className={`mt-1 ${
                            Math.abs(todayTotals.carbs_g - Math.round(activePlan.macroTargets.carbohydrates || 0)) <= (activePlan.macroTargets.carbohydrates || 1) * 0.15
                              ? 'text-thrivv-neon-green'
                              : 'text-thrivv-gold-500'
                          }`}>
                            {todayTotals.carbs_g > (activePlan.macroTargets.carbohydrates || 0) ? '+' : ''}
                            {Math.round(todayTotals.carbs_g - (activePlan.macroTargets.carbohydrates || 0))}{t("g")}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-thrivv-text-muted mb-1">{t("Target")}</p>
                          <p className="text-thrivv-text-primary font-medium">{Math.round(activePlan.macroTargets.fats || 0)}{t("g")}</p>
                          <p className={`mt-1 ${
                            Math.abs(todayTotals.fat_g - Math.round(activePlan.macroTargets.fats || 0)) <= (activePlan.macroTargets.fats || 1) * 0.15
                              ? 'text-thrivv-neon-green'
                              : 'text-thrivv-gold-500'
                          }`}>
                            {todayTotals.fat_g > (activePlan.macroTargets.fats || 0) ? '+' : ''}
                            {Math.round(todayTotals.fat_g - (activePlan.macroTargets.fats || 0))}{t("g")}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : !todayLog ? <p className="py-6 text-sm text-thrivv-text-secondary">{t("Your food log is unavailable. Retry above to load it.")}</p> : (
            <div className="text-center py-8">
              <div className="icon-badge w-20 h-20 mx-auto mb-4">
                <UtensilsCrossed className="w-10 h-10 text-thrivv-gold-500" />
              </div>
              <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">{t("No meals logged today")}</h3>
              <p className="text-thrivv-text-secondary mb-6">{t("Start tracking your nutrition by adding recipes")}</p>
              <Link
                href="/member/recipes"
                className="inline-flex items-center btn-primary px-6 py-3"
              >
                <ChefHat className="w-5 h-5 me-2" />{t("Browse Recipes")}</Link>
            </div>
          )}
        </div>

        {/* Nutrition Plans Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-thrivv-text-primary">{t("My Nutrition Plans")}</h2>
          <Link
            href="/nutrition/new"
            className="flex items-center btn-primary px-6 py-3"
          >
            <Plus className="w-5 h-5 me-2" />{t("Generate New Plan")}</Link>
        </div>

        {plans.length === 0 ? (
          <div className="premium-card p-6 text-center">
            <div className="icon-badge w-20 h-20 mx-auto mb-6">
              <Target className="w-10 h-10 text-thrivv-gold-500" />
            </div>
            <h3 className="text-2xl font-semibold text-thrivv-text-primary mb-2">{t("No nutrition plans yet")}</h3>
            <p className="text-thrivv-text-secondary mb-8">{t("Generate a personalized AI-powered meal plan")}</p>
            <Link
              href="/nutrition/new"
              className="inline-flex items-center btn-primary px-6 py-3"
            >
              <Plus className="w-5 h-5 me-2" />{t("Generate Your First Plan")}</Link>
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
                    <Target className="w-4 h-4 me-2 text-thrivv-gold-500" />
                    <span className="capitalize">{plan.goal.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center text-sm text-thrivv-text-secondary">
                    <TrendingUp className="w-4 h-4 me-2 text-thrivv-gold-500" />
                    {plan.macroTargets.calories}{t("calories/day")}</div>
                  <div className="flex items-center text-sm text-thrivv-text-secondary">
                    <Calendar className="w-4 h-4 me-2 text-thrivv-gold-500" />
                    {plan.duration}{t("days")}</div>
                </div>

                <div className="flex items-center text-thrivv-gold-500 text-sm font-medium group-hover:translate-x-1 transition-transform">{t("View Details →")}</div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
