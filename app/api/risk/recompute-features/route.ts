/**
 * POST /api/risk/recompute-features
 * 
 * Cron endpoint to recompute risk features for all users
 * Protected by CRON_SECRET environment variable
 * 
 * Recomputes:
 * - device_degree (unique devices in last 7 days)
 * - ip_degree (unique IP prefixes in last 7 days)
 * - typing baselines (mean/std of typing features)
 * - account_age_days
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting risk feature recomputation...');

    // 2. Get all unique users from recent events (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeUsers, error: usersError } = await supabase
      .from('risk_events')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo);

    if (usersError) {
      console.error('❌ Failed to fetch active users:', usersError);
      throw usersError;
    }

    const uniqueUserIds = [...new Set(activeUsers?.map(e => e.user_id) || [])];
    console.log(`📊 Found ${uniqueUserIds.length} active users`);

    let updatedCount = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 3. Recompute features for each user
    for (const userId of uniqueUserIds) {
      try {
        // 3a. Device degree (unique devices in last 7 days)
        const { data: devices } = await supabase
          .from('device_registry')
          .select('device_id')
          .eq('user_id', userId)
          .gte('last_seen_at', sevenDaysAgo);

        const deviceDegree = devices?.length || 0;

        // 3b. IP degree (unique IP prefixes in last 7 days)
        const { data: events } = await supabase
          .from('risk_events')
          .select('ip_prefix')
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo)
          .not('ip_prefix', 'is', null);

        const uniqueIps = new Set(events?.map(e => e.ip_prefix) || []);
        const ipDegree = uniqueIps.size;

        // 3c. Typing baseline (from events with typing features)
        const { data: typingEvents } = await supabase
          .from('risk_events')
          .select('typing_features')
          .eq('user_id', userId)
          .not('typing_features', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50); // Last 50 typing samples

        let avgTypingDwell: number | null = null;
        let stdTypingDwell: number | null = null;
        let avgTypingFlight: number | null = null;
        let stdTypingFlight: number | null = null;
        let typingBaselineCount = 0;

        if (typingEvents && typingEvents.length > 5) {
          const dwells: number[] = [];
          const flights: number[] = [];

          for (const event of typingEvents) {
            const tf = event.typing_features as any;
            if (tf && typeof tf.mean_dwell === 'number') {
              dwells.push(tf.mean_dwell);
              flights.push(tf.mean_flight);
            }
          }

          if (dwells.length > 5) {
            avgTypingDwell = dwells.reduce((a, b) => a + b, 0) / dwells.length;
            avgTypingFlight = flights.reduce((a, b) => a + b, 0) / flights.length;

            const dwellVariance = dwells.reduce((acc, val) => acc + Math.pow(val - avgTypingDwell!, 2), 0) / dwells.length;
            stdTypingDwell = Math.sqrt(dwellVariance);

            const flightVariance = flights.reduce((acc, val) => acc + Math.pow(val - avgTypingFlight!, 2), 0) / flights.length;
            stdTypingFlight = Math.sqrt(flightVariance);

            typingBaselineCount = dwells.length;
          }
        }

        // 3d. Account age (if we have a users table with created_at)
        // For now, compute from first risk event
        const { data: firstEvent } = await supabase
          .from('risk_events')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        let accountAgeDays = 0;
        if (firstEvent) {
          const firstSeen = new Date(firstEvent.created_at);
          const now = new Date();
          accountAgeDays = Math.floor((now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));
        }

        // 3e. Upsert features
        const { error: upsertError } = await supabase
          .from('risk_user_features')
          .upsert(
            {
              user_id: userId,
              device_degree: deviceDegree,
              ip_degree: ipDegree,
              account_age_days: accountAgeDays,
              avg_typing_dwell: avgTypingDwell,
              std_typing_dwell: stdTypingDwell,
              avg_typing_flight: avgTypingFlight,
              std_typing_flight: stdTypingFlight,
              typing_baseline_count: typingBaselineCount,
              last_computed_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id',
            }
          );

        if (upsertError) {
          console.error(`❌ Failed to upsert features for user ${userId}:`, upsertError);
        } else {
          updatedCount++;
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${userId}:`, userError);
      }
    }

    console.log(`✅ Recomputed features for ${updatedCount}/${uniqueUserIds.length} users`);

    return NextResponse.json(
      {
        success: true,
        usersProcessed: uniqueUserIds.length,
        usersUpdated: updatedCount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Feature recomputation error:', error);
    
    return NextResponse.json(
      {
        error: 'Feature recomputation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Allow GET for health check
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/risk/recompute-features',
    message: 'Use POST to trigger recomputation',
  });
}
