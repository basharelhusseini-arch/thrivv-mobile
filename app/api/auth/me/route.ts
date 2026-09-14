import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authenticated = await getAuthenticatedSession();
    const user = authenticated?.session.user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }
      );
    }

    const { data, error } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
    // A role lookup failure hides privileged navigation without invalidating a member session.
    const response = NextResponse.json(error || !data ? { user, isPlatformAdmin: false, permissionsAvailable: false } : { user, isPlatformAdmin: data.is_admin === true }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    return response;
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }
    );
  }
}
