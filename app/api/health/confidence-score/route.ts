export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
/**
 * API: Confidence Score Calculator
 * 
 * GET /api/health/confidence-score - Calculate user's confidence score
 * 
 * Returns both health score and confidence score with breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateConfidenceScore } from '@/lib/trust-scoring';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = (await getCurrentUser())?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_health_profile')
      .select('has_wearable')
      .eq('user_id', userId)
      .single();

    // Count consistency passes (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: consistencyPasses } = await supabase
      .from('verification_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('method', 'consistency_check')
      .eq('status', 'verified')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Count survey completions (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { count: surveyCompletions } = await supabase
      .from('verification_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('method', 'survey')
      .eq('status', 'verified')
      .gte('created_at', ninetyDaysAgo.toISOString());

    // Calculate days active (from first verification event)
    const { data: firstEvent } = await supabase
      .from('verification_events')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const daysActive = firstEvent
      ? Math.floor((Date.now() - new Date(firstEvent.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore({
      hasWearable: profile?.has_wearable || false,
      consistencyPassesLast30Days: consistencyPasses || 0,
      surveyCompletionsLast90Days: surveyCompletions || 0,
      daysActive,
    });

    return NextResponse.json({
      confidence_score: confidenceScore.score,
      confidence_level: confidenceScore.level,
      breakdown: confidenceScore.breakdown,
      factors: {
        has_wearable: profile?.has_wearable || false,
        consistency_passes: consistencyPasses || 0,
        survey_completions: surveyCompletions || 0,
        days_active: daysActive,
      },
    });

  } catch (error: any) {
    console.error('Confidence score calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate confidence score' },
      { status: 500 }
    );
  }
}
