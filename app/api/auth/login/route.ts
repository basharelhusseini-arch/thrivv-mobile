import { ensureMemberProfile } from '@/lib/member-profile';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@/lib/env';
import { setSessionCookie } from '@/lib/auth';
import { authBody } from '@/lib/auth-request';
import { MemberResourceError } from '@/lib/member-resource';

export async function POST(request: NextRequest) {
  try {
    const body = await authBody(request);
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get validated environment variables
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

    // Create Supabase client for Auth
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Sign in with Supabase Auth - wait for response
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Handle authentication errors
    if (error) {
      console.error('Supabase Auth login error:', {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      // Return the REAL error message
      return NextResponse.json(
        { 
          error: error.message || 'Invalid email or password',
          code: error.code,
        },
        { status: error.status || 401 }
      );
    }

    // Check if login was successful - session must exist
    if (!data.user || !data.session) {
      console.error('Login succeeded but no session returned:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
      });
      
      return NextResponse.json(
        { error: 'Login failed. Please try again.' },
        { status: 401 }
      );
    }

    // Log successful login
    console.log('Login successful:', {
      userId: data.user.id,
      email: data.user.email,
      hasSession: !!data.session,
    });

    // Get user metadata
    const firstName = data.user.user_metadata?.first_name || '';
    const lastName = data.user.user_metadata?.last_name || '';

    // Set server-side session cookie
    const sessionUser = {
      id: data.user.id,
      email: data.user.email || email,
      firstName,
      lastName,
    };
    
    await ensureMemberProfile(data.user);
    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    await setSessionCookie(sessionUser, response, request.nextUrl.hostname);
    return response;

  } catch (error: any) {
    if (error instanceof MemberResourceError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Login handler error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
    });
    
    // Provide helpful error for missing env vars
    if (error?.message?.includes('NEXT_PUBLIC_SUPABASE')) {
      return NextResponse.json(
        { 
          error: 'Configuration error: Supabase environment variables are missing. ' +
                 'Check Vercel → Settings → Environment Variables or .env.local for local development.',
          type: 'configuration_error',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to log in. Please try again.',
        type: 'server_error',
      },
      { status: 500 }
    );
  }
}
