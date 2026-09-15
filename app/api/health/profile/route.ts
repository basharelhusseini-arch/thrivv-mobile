export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
/**
 * API: User Health Profile
 * 
 * GET /api/health/profile - Get user's health profile and onboarding status
 * POST /api/health/profile - Create or update health profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Identity always comes from the signed server session.
    const userId = (await getCurrentUser())?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', needsAuth: true },
        { status: 401 }
      );
    }

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('user_health_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found (OK)
      console.error('Error fetching profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // If no profile exists, user needs onboarding
    if (!profile) {
      return NextResponse.json({
        exists: false,
        needsOnboarding: true,
        profile: null,
      });
    }

    return NextResponse.json({
      exists: true,
      needsOnboarding: false,
      profile,
    });

  } catch (error: any) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = (await getCurrentUser())?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      goal,
      has_wearable,
      wearable_type,
      wants_wearable_provided,
      country,
    } = body;

    // Validate required fields
    if (!goal || !['fat_loss', 'maintenance', 'muscle_gain', 'performance', 'general'].includes(goal)) {
      return NextResponse.json(
        { error: 'Invalid goal' },
        { status: 400 }
      );
    }

    if ((has_wearable !== undefined && typeof has_wearable !== 'boolean') ||
        (wearable_type != null && !['whoop', 'garmin', 'apple_watch', 'fitbit', 'oura', 'other'].includes(wearable_type))) {
      return NextResponse.json({ error: 'Invalid wearable preference' }, { status: 400 });
    }

    // Upsert profile (create or update). Preferences never decide reward eligibility.
    const { data: profile, error } = await supabase
      .from('user_health_profile')
      .upsert({
        user_id: userId,
        goal,
        has_wearable: has_wearable || false,
        wearable_type: has_wearable ? wearable_type || null : null,
        ...(wants_wearable_provided !== undefined ? { wants_wearable_provided: wants_wearable_provided || null } : {}),
        ...(country !== undefined ? { country: country || null } : {}),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      );
    }

    // If user wants wearable provided, create lead
    if (wants_wearable_provided === 'yes') {
      await supabase
        .from('wearable_interest_leads')
        .insert({
          user_id: userId,
          wearable_preference: wearable_type,
          country,
          consent: true,
        });
    }

    return NextResponse.json({
      success: true,
      profile,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Profile POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
