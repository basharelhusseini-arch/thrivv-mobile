/**
 * API: Consistency Check Background Job
 * 
 * POST /api/consistency-check - Run silent consistency validation
 * 
 * This is a CRON job that:
 * - Validates recent data entries
 * - Creates verification events for passing checks
 * - FLAGS suspicious data but NEVER penalizes users
 * - Operates silently - no user-facing notifications
 * 
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateSleepDuration,
  validateWorkoutLog,
  validateNutritionLog,
  validateMetricChange,
} from '@/lib/trust-scoring';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify CRON secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid CRON secret' },
        { status: 401 }
      );
    }

    console.log('🔍 Starting consistency check job...');

    // Check recent entries (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const results = {
      sleep: { checked: 0, passed: 0, flagged: 0 },
      workouts: { checked: 0, passed: 0, flagged: 0 },
      meals: { checked: 0, passed: 0, flagged: 0 },
    };

    // ========================================
    // 1. CHECK SLEEP LOGS
    // ========================================
    const { data: sleepLogs } = await supabase
      .from('health_scores')
      .select('user_id, sleep_score, date')
      .gte('date', yesterday.toISOString().split('T')[0])
      .gt('sleep_score', 0);

    for (const log of sleepLogs || []) {
      results.sleep.checked++;

      // Estimate hours from score (this is simplified - adjust based on your actual data)
      const estimatedHours = (log.sleep_score / 100) * 8; // Rough estimate
      
      const validation = validateSleepDuration(estimatedHours);

      if (validation.result === 'pass') {
        results.sleep.passed++;

        // Create verification event
        await supabase.from('verification_events').insert({
          user_id: log.user_id,
          entity_type: 'sleep',
          entity_id: null,
          method: 'consistency_check',
          status: 'verified',
          confidence: 'medium',
          multiplier: 1.05,
          metadata: { validation: 'sleep_duration', score: log.sleep_score },
        });
      } else if (validation.result === 'flag') {
        results.sleep.flagged++;

        // Log flag but don't penalize
        await supabase.from('verification_events').insert({
          user_id: log.user_id,
          entity_type: 'sleep',
          entity_id: null,
          method: 'consistency_check',
          status: 'flagged',
          confidence: 'low',
          multiplier: 1.0, // NO PENALTY - just no boost
          metadata: { validation: 'sleep_duration', reason: validation.reason },
        });
      }
    }

    // ========================================
    // 2. CHECK WORKOUT LOGS (if workout table exists)
    // ========================================
    // Note: Adjust this query based on your actual workout schema
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, member_id, duration')
      .not('workout_plan_id', 'is', null)
      .gte('created_at', yesterday.toISOString())
      .limit(1000);

    if (workouts) {
      for (const workout of workouts) {
        results.workouts.checked++;

        // Count workouts today for this user
        const { count } = await supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', workout.member_id)
          .not('workout_plan_id', 'is', null)
          .gte('created_at', new Date().toISOString().split('T')[0]);

        const validation = validateWorkoutLog({
          durationMinutes: workout.duration || 30, // Default if missing
          workoutsToday: count || 1,
        });

        if (validation.result === 'pass') {
          results.workouts.passed++;

          await supabase.from('verification_events').insert({
            user_id: workout.member_id,
            entity_type: 'workout',
            entity_id: workout.id,
            method: 'consistency_check',
            status: 'verified',
            confidence: 'medium',
            multiplier: 1.05,
            metadata: { validation: 'workout_plausibility' },
          });
        } else if (validation.result === 'flag') {
          results.workouts.flagged++;

          await supabase.from('verification_events').insert({
            user_id: workout.member_id,
            entity_type: 'workout',
            entity_id: workout.id,
            method: 'consistency_check',
            status: 'flagged',
            confidence: 'low',
            multiplier: 1.0, // NO PENALTY
            metadata: { validation: 'workout_plausibility', reason: validation.reason },
          });
        }
      }
    }

    // ========================================
    // 3. CHECK NUTRITION LOGS (if nutrition tracking exists)
    // ========================================
    // This is a placeholder - adjust based on your meal tracking schema
    // const { data: meals } = await supabase
    //   .from('meals')
    //   .select('id, user_id, calories')
    //   .gte('created_at', yesterday.toISOString());

    console.log('✅ Consistency check complete:', results);

    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      results,
      message: 'Consistency check completed silently',
    });

  } catch (error: any) {
    console.error('❌ Consistency check error:', error);
    return NextResponse.json(
      {
        error: 'Consistency check failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error',
      },
      { status: 500 }
    );
  }
}
