export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
/**
 * API: Wearable Interest Leads
 * 
 * POST /api/wearable/interest - Submit interest in receiving a wearable
 * GET /api/wearable/interest - Check if user has submitted interest
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      wearable_preference,
      country,
      consent = true,
      notes,
    } = body;

    // Check if lead already exists
    const { data: existing } = await supabase
      .from('wearable_interest_leads')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'new')
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Interest already recorded',
        lead: existing,
      });
    }

    // Create new lead
    const { data: lead, error } = await supabase
      .from('wearable_interest_leads')
      .insert({
        user_id: userId,
        wearable_preference,
        country,
        consent,
        notes,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating wearable lead:', error);
      return NextResponse.json(
        { error: 'Failed to submit interest' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interest recorded successfully',
      lead,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Wearable interest POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = (await getCurrentUser())?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for existing leads
    const { data: leads, error } = await supabase
      .from('wearable_interest_leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wearable leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      leads: leads || [],
      has_active_interest: leads?.some(l => l.status === 'new') || false,
    });

  } catch (error: any) {
    console.error('Wearable interest GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
