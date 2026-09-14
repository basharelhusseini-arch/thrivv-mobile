export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
/**
 * API: Verification Events
 * 
 * POST /api/verification/event - Create verification event
 * GET /api/verification/event - Get verification history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateVerificationMultiplier } from '@/lib/trust-scoring';
import { VerificationMethod, EntityType } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verification is recorded only by trusted workout/QR and background flows.
export async function POST(_request: NextRequest) {
 const user=await getCurrentUser();
 return NextResponse.json({error:user?'Use the gym workout verification flow.':'Unauthorized'}, {status:user?403:401});
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const entityType = searchParams.get('entity_type');

    let query = supabase
      .from('verification_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching verification events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch verification events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: events || [],
      count: events?.length || 0,
    });

  } catch (error: any) {
    console.error('Verification event GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
