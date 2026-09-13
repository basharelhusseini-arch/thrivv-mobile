import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
    // A role lookup failure hides privileged navigation without invalidating a member session.
    if (error || !data) return NextResponse.json({ user, isPlatformAdmin: false, permissionsAvailable: false }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    return NextResponse.json({ user, isPlatformAdmin: data.is_admin === true }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
