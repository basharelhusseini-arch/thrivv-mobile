import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import {
  calculateHealthScore,
  legacyColumnMapping,
} from '@/lib/health-score-v2';
import { healthToRewardPoints } from '@/lib/reward-points';

/**
 * POST /api/health/update-from-nutrition
 * 
 * Called automatically when user logs meals in nutrition tracker
 * Updates health score to include calories and macros from logged meals
 * 
 * Body: { memberId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's nutrition log (from localStorage via client or future Supabase)
    // For now, we'll get the logged meals data from the request body
    // In the future, this will query Supabase daily_meals table
    
    // Get existing check-in data if any
    const { data: existingCheckin } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    // Get today's nutrition totals from the request
    // This assumes the client sends the computed totals
    const { totalCalories, totalProtein, totalCarbs, totalFat, mealCount } = body;

    if (!totalCalories && totalCalories !== 0) {
      return NextResponse.json(
        { error: 'totalCalories is required' },
        { status: 400 }
      );
    }

    // Mark mealCount as observed even though the v2 scorer
    // currently keys off raw calories. This avoids removing the
    // existing payload contract.
    void mealCount;
    void totalProtein;
    void totalCarbs;
    void totalFat;

    // Pull whoop_data for today if the user has it synced — keeps
    // the score hybrid instead of regressing to manual on every
    // nutrition update.
    const { data: whoopRow } = await supabase
      .from('whoop_data')
      .select(
        'recovery_score, sleep_performance_pct, sleep_efficiency_pct, total_sleep_ms, day_strain'
      )
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    const whoop = whoopRow as
      | {
          recovery_score: number | null;
          sleep_performance_pct: number | null;
          sleep_efficiency_pct: number | null;
          total_sleep_ms: number | null;
          day_strain: number | null;
        }
      | null;

    const score = calculateHealthScore({
      whoop: whoop
        ? {
            recoveryScore: whoop.recovery_score,
            sleepPerformancePct: whoop.sleep_performance_pct,
            sleepEfficiencyPct: whoop.sleep_efficiency_pct,
            totalSleepMs: whoop.total_sleep_ms,
            dayStrain: whoop.day_strain,
          }
        : null,
      manual: {
        didWorkout: existingCheckin?.did_workout ?? null,
        sleepHours: existingCheckin?.sleep_hours ?? null,
        habitsCompleted: existingCheckin?.habits_completed ?? null,
        caloriesLogged: totalCalories,
        calorieTarget: 2200,
      },
      date: today,
    });

    const legacy = legacyColumnMapping(score.componentBreakdown);

    // Update or insert check-in with the latest calories from logged meals.
    const checkinPayload = {
      user_id: user.id,
      date: today,
      did_workout: existingCheckin?.did_workout || false,
      calories: totalCalories,
      sleep_hours: existingCheckin?.sleep_hours || 0,
      habits_completed: existingCheckin?.habits_completed || 0,
      habit_details: existingCheckin?.habit_details || {},
    };

    await supabase
      .from('daily_checkins')
      .upsert(checkinPayload, {
        onConflict: 'user_id,date',
      });

    const { data: healthScore, error: scoreError } = await supabase
      .from('health_scores')
      .upsert(
        {
          user_id: user.id,
          date: today,
          score: score.finalScore,
          training_score: legacy.training_score,
          diet_score: legacy.diet_score,
          sleep_score: legacy.sleep_score,
          habit_score: legacy.habit_score,
          activity_points: score.componentBreakdown.activity,
          recovery_points: score.componentBreakdown.recovery,
          sleep_points: score.componentBreakdown.sleep,
          recovery_sleep_points: score.componentBreakdown.recoverySleep,
          food_points: score.componentBreakdown.food,
          habit_points: score.componentBreakdown.habits,
          raw_score: score.rawScore,
          max_raw_score: score.maxRawScore,
          score_source: score.scoreSource,
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single();

    if (scoreError) {
      console.error('Score error:', scoreError);
      return NextResponse.json(
        { error: 'Failed to save health score', details: scoreError.message },
        { status: 500 }
      );
    }

    // Get user's confidence score to calculate total rewards score
    const { data: confidenceData } = await supabase.rpc('get_user_confidence_score', {
      p_user_id: user.id
    });
    
    const confidenceScore = confidenceData || 30; // Default baseline
    
    // Calculate confidence multiplier (1.0 to 1.25)
    // Formula: 1 + ((confidenceScore - 30) / 100) * 0.25
    const confidenceMultiplier = 1 + ((confidenceScore - 30) / 100) * 0.25;
    
    // Calculate total rewards score (health × confidence)
    const totalRewardsScore = Math.round(score.finalScore * confidenceMultiplier);
    
    // Calculate reward points from TOTAL score (not just health score)
    const rewardPointsEarned = healthToRewardPoints(totalRewardsScore);

    // Update reward history
    await supabase
      .from('reward_history')
      .upsert(
        {
          user_id: user.id,
          date: today,
          health_score: score.finalScore,
          confidence_score: confidenceScore,
          total_rewards_score: totalRewardsScore,
          confidence_multiplier: confidenceMultiplier,
          points_earned: rewardPointsEarned,
        },
        {
          onConflict: 'user_id,date',
        }
      );

    // Recalculate total reward points
    const { data: historyData } = await supabase
      .from('reward_history')
      .select('points_earned')
      .eq('user_id', user.id);

    const totalPoints = historyData?.reduce((sum, h) => sum + Number(h.points_earned), 0) || 0;

    await supabase
      .from('users')
      .update({ reward_points: totalPoints })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      score: healthScore,
      rewardPoints: {
        earned: rewardPointsEarned,
        total: totalPoints,
      },
      healthScore: score.finalScore,
      scoreSource: score.scoreSource,
      rawScore: score.rawScore,
      maxRawScore: score.maxRawScore,
      componentBreakdown: score.componentBreakdown,
      inputsUsed: score.inputsUsed,
      message: 'Health score updated from nutrition data',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      );
    }
    console.error('Health score update error:', error);
    return NextResponse.json(
      { error: 'Failed to update health score', details: error.message },
      { status: 500 }
    );
  }
}
