import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import {
  calculateHealthScore,
  legacyColumnMapping,
} from '@/lib/health-score-v2';
import { healthToRewardPoints } from '@/lib/reward-points';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    const body = await request.json();
    const { didWorkout, calories, sleepHours, habits } = body;

    // Validation
    if (typeof didWorkout !== 'boolean') {
      return NextResponse.json(
        { error: 'didWorkout must be a boolean' },
        { status: 400 }
      );
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Count habits completed
    const habitsCompleted = habits ? Object.values(habits).filter(Boolean).length : 0;

    // Construct payload explicitly with only existing columns
    const checkinPayload = {
      user_id: user.id,
      date: today,
      did_workout: didWorkout,
      calories: calories || 0,
      sleep_hours: sleepHours || 0,
      habits_completed: habitsCompleted,
      habit_details: habits || {},
    };

    // Upsert check-in (insert or update if exists)
    const { data: checkin, error: checkinError } = await supabase
      .from('daily_checkins')
      .upsert(checkinPayload, {
        onConflict: 'user_id,date',
      })
      .select()
      .single();

    if (checkinError) {
      console.error('Check-in error:', checkinError);
      const errorMessage = checkinError.message || 'Failed to save check-in';
      const errorDetails = checkinError.details ? ` Details: ${checkinError.details}` : '';
      const errorHint = checkinError.hint ? ` Hint: ${checkinError.hint}` : '';
      return NextResponse.json(
        { 
          error: `${errorMessage}${errorDetails}${errorHint}`,
          code: checkinError.code,
          supabaseError: checkinError
        },
        { status: 500 }
      );
    }

    // If the user has already synced WHOOP for today, fold those
    // signals into the v2 score so a manual check-in doesn't clobber
    // a hybrid score. WHOOP rows are upserted by /api/whoop/sync.
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
        didWorkout,
        sleepHours: sleepHours ?? null,
        habitsCompleted,
        caloriesLogged: calories ?? null,
      },
      date: today,
    });

    const legacy = legacyColumnMapping(score.componentBreakdown);

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
      const errorMessage = scoreError.message || 'Failed to save health score';
      const errorDetails = scoreError.details ? ` Details: ${scoreError.details}` : '';
      const errorHint = scoreError.hint ? ` Hint: ${scoreError.hint}` : '';
      return NextResponse.json(
        { 
          error: `${errorMessage}${errorDetails}${errorHint}`,
          code: scoreError.code,
          supabaseError: scoreError
        },
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

    // Update reward history (upsert for idempotency)
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

    // Get user's current total reward points
    const { data: userData } = await supabase
      .from('users')
      .select('reward_points')
      .eq('id', user.id)
      .single();

    // Calculate new total (sum all history to be accurate)
    const { data: historyData } = await supabase
      .from('reward_history')
      .select('points_earned')
      .eq('user_id', user.id);

    const totalPoints = historyData?.reduce((sum, h) => sum + Number(h.points_earned), 0) || 0;

    // Update user's total reward points
    await supabase
      .from('users')
      .update({ reward_points: totalPoints })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      checkin,
      score: healthScore,
      rewardPoints: {
        earned: rewardPointsEarned,
        total: totalPoints,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      );
    }
    console.error('Check-in error (full):', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process check-in',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

// Get today's check-in
export async function GET() {
  try {
    const user = await requireAuth();
    const today = new Date().toISOString().split('T')[0];

    const { data: checkin } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    return NextResponse.json({
      checkin: checkin || null,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Get check-in error:', error);
    return NextResponse.json(
      { error: 'Failed to get check-in' },
      { status: 500 }
    );
  }
}
