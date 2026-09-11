import { requireAuth } from '@/lib/auth';
/**
 * POST /api/risk/score
 * 
 * Privacy-safe risk scoring endpoint
 * - Authenticates user
 * - Tracks devices (first-party cookie, not fingerprinting)
 * - Computes risk score based on behavioral signals
 * - Returns action: allow | step_up | hold | block
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  getOrCreateDeviceId, 
  getIpPrefix, 
  parseUserAgent,
  getDeviceIdFromRequest,
  createDeviceIdCookie 
} from '@/lib/device';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RiskScoreRequest {
  eventType: 'login' | 'signup' | 'reward_redeem' | 'payment' | 'profile_edit' | 'password_change';
  typingFeatures?: {
    mean_dwell: number;
    std_dwell: number;
    mean_flight: number;
    std_flight: number;
    backspace_ratio: number;
    paste_count: number;
    sample_size: number;
  };
}

interface RiskScoreResponse {
  riskScore: number;
  action: 'allow' | 'step_up' | 'hold' | 'block';
  reasons: string[];
  deviceId: string;
}

export async function POST(request: NextRequest) {
  try {
    let user;
    try { user = await requireAuth(); }
    catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const body: RiskScoreRequest = await request.json();
    const { eventType, typingFeatures } = body;
    const userId = user.id;

    console.log(`🔒 Risk scoring request: user=${userId}, event=${eventType}`);

    // 2. Get or create device ID
    let deviceId = getDeviceIdFromRequest(request);
    let setCookieHeader: string | null = null;
    
    if (!deviceId) {
      const result = createDeviceIdCookie();
      deviceId = result.deviceId;
      setCookieHeader = result.setCookieHeader;
      console.log(`🆕 Created new device ID: ${deviceId}`);
    }

    // 3. Extract coarse IP prefix (privacy-safe)
    const ipPrefix = getIpPrefix(request);
    console.log(`🌐 IP prefix: ${ipPrefix || 'unknown'}`);

    // 4. Parse User-Agent
    const userAgent = request.headers.get('user-agent');
    const { ua_family, os_family, browser_family } = parseUserAgent(userAgent);
    console.log(`💻 Device: ${browser_family}/${os_family}`);

    // 5. Upsert device registry
    const { error: deviceError } = await supabase
      .from('device_registry')
      .upsert(
        {
          device_id: deviceId,
          user_id: userId,
          last_seen_at: new Date().toISOString(),
          ua_family,
          os_family,
          browser_family,
        },
        {
          onConflict: 'device_id',
        }
      );

    if (deviceError) {
      console.error('❌ Failed to upsert device registry:', deviceError);
    }

    // 6. Compute risk score
    const riskResult = await computeRiskScore(
      userId,
      deviceId,
      eventType,
      ipPrefix,
      typingFeatures
    );

    console.log(`📊 Risk score: ${riskResult.riskScore} → ${riskResult.action}`);
    console.log(`📝 Reasons: ${riskResult.reasons.join(', ')}`);

    // 7. Insert risk event
    const { error: eventError } = await supabase
      .from('risk_events')
      .insert({
        user_id: userId,
        device_id: deviceId,
        event_type: eventType,
        ip_prefix: ipPrefix,
        ua_family,
        os_family,
        browser_family,
        risk_score: riskResult.riskScore,
        action: riskResult.action,
        reasons: riskResult.reasons,
        typing_features: typingFeatures || null,
      });

    if (eventError) {
      console.error('❌ Failed to insert risk event:', eventError);
    }

    // 8. Return response with device cookie if new
    const response = NextResponse.json<RiskScoreResponse>(
      {
        riskScore: riskResult.riskScore,
        action: riskResult.action,
        reasons: riskResult.reasons,
        deviceId,
      },
      { status: 200 }
    );

    if (setCookieHeader) {
      response.headers.set('Set-Cookie', setCookieHeader);
    }

    return response;
  } catch (error) {
    console.error('❌ Risk scoring error:', error);
    
    // Don't leak sensitive info in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Risk scoring failed' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Risk scoring failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Compute risk score based on multiple signals
 */
async function computeRiskScore(
  userId: string,
  deviceId: string,
  eventType: string,
  ipPrefix: string | null,
  typingFeatures?: RiskScoreRequest['typingFeatures']
): Promise<{ riskScore: number; action: 'allow' | 'step_up' | 'hold' | 'block'; reasons: string[] }> {
  let riskScore = 0;
  const reasons: string[] = [];

  // Signal 1: Account age
  const { data: userFeatures } = await supabase
    .from('risk_user_features')
    .select('account_age_days')
    .eq('user_id', userId)
    .single();

  if (userFeatures?.account_age_days !== undefined) {
    if (userFeatures.account_age_days < 1) {
      riskScore += 30;
      reasons.push('new_account');
    } else if (userFeatures.account_age_days < 7) {
      riskScore += 15;
      reasons.push('young_account');
    }
  }

  // Signal 2: Device sharing (how many users on this device?)
  const { count: deviceUserCount } = await supabase
    .from('device_registry')
    .select('user_id', { count: 'exact', head: true })
    .eq('device_id', deviceId);

  if (deviceUserCount !== null && deviceUserCount > 3) {
    riskScore += 25;
    reasons.push('device_shared');
  } else if (deviceUserCount !== null && deviceUserCount > 1) {
    riskScore += 10;
    reasons.push('device_multi_user');
  }

  // Signal 3: Velocity - recent events (last 10 min)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentEventCount } = await supabase
    .from('risk_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .gte('created_at', tenMinutesAgo);

  if (recentEventCount !== null && recentEventCount > 5) {
    riskScore += 40;
    reasons.push('high_velocity');
  } else if (recentEventCount !== null && recentEventCount > 2) {
    riskScore += 20;
    reasons.push('elevated_velocity');
  }

  // Signal 4: Velocity - 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: dailyEventCount } = await supabase
    .from('risk_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .gte('created_at', oneDayAgo);

  if (dailyEventCount !== null && dailyEventCount > 20) {
    riskScore += 30;
    reasons.push('daily_limit_exceeded');
  } else if (dailyEventCount !== null && dailyEventCount > 10) {
    riskScore += 15;
    reasons.push('high_daily_activity');
  }

  // Signal 5: Ring features (device degree, IP degree)
  const { data: ringFeatures } = await supabase
    .from('risk_user_features')
    .select('device_degree, ip_degree')
    .eq('user_id', userId)
    .single();

  if (ringFeatures) {
    if (ringFeatures.device_degree > 5) {
      riskScore += 20;
      reasons.push('many_devices');
    }
    if (ringFeatures.ip_degree > 10) {
      riskScore += 15;
      reasons.push('many_ips');
    }
  }

  // Signal 6: Typing anomaly (if baseline exists)
  if (typingFeatures && typingFeatures.sample_size >= 5) {
    const { data: baseline } = await supabase
      .from('risk_user_features')
      .select('avg_typing_dwell, std_typing_dwell, typing_baseline_count')
      .eq('user_id', userId)
      .single();

    if (baseline && baseline.typing_baseline_count > 10) {
      // Compute z-score for dwell time
      const zScore = Math.abs(
        (typingFeatures.mean_dwell - baseline.avg_typing_dwell) / 
        (baseline.std_typing_dwell || 1)
      );

      if (zScore > 3) {
        riskScore += 25;
        reasons.push('typing_anomaly');
      } else if (zScore > 2) {
        riskScore += 10;
        reasons.push('typing_variation');
      }
    }
  }

  // Cap at 100
  riskScore = Math.min(riskScore, 100);

  // Determine action
  let action: 'allow' | 'step_up' | 'hold' | 'block';
  if (riskScore >= 80) {
    action = 'block';
  } else if (riskScore >= 60) {
    action = 'hold';
  } else if (riskScore >= 40) {
    action = 'step_up';
  } else {
    action = 'allow';
  }

  if (reasons.length === 0) {
    reasons.push('normal_behavior');
  }

  return { riskScore, action, reasons };
}
