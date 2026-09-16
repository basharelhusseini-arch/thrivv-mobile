import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv, getSupabaseServiceKey } from './env';
import { cookies } from 'next/headers';

// Get environment variables (will throw clear error if missing)
// During build, placeholders are used; at runtime, real validation happens
let supabaseUrl: string;
let supabaseAnonKey: string;
let supabaseServiceKey: string;

try {
  const env = getSupabaseEnv();
  supabaseUrl = env.supabaseUrl;
  supabaseAnonKey = env.supabaseAnonKey;
  supabaseServiceKey = getSupabaseServiceKey() || 'placeholder-service-key';
} catch (error) {
  // During build, use placeholders to prevent build failures
  // Runtime API calls will fail with helpful error messages
  supabaseUrl = 'https://placeholder.supabase.co';
  supabaseAnonKey = 'placeholder-anon-key';
  supabaseServiceKey = 'placeholder-service-key';
  
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Supabase env vars not set. Using placeholders for build.');
    console.warn('   Copy .env.example to .env.local and add your Supabase credentials.');
  }
}

// Create client for API routes (with auth context from cookies)
export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const authToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;
  
  const client = createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Set auth session if tokens exist
  if (authToken && refreshToken) {
    client.auth.setSession({
      access_token: authToken,
      refresh_token: refreshToken,
    });
  }

  return client;
}

// Server-side client with service role (bypasses RLS)
export const supabase = createSupabaseClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          password_hash: string;
          created_at: string;
          // Added by migration 015 (additive, nullable / default false)
          gym_id?: string | null;
          is_admin?: boolean;
          membership_start_date?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      gyms: {
        Row: {
          id: string;
          name: string;
          owner_email: string;
          pilot_start_date: string | null;
          pilot_member_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['gyms']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['gyms']['Insert']>;
      };
      daily_checkins: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          did_workout: boolean;
          calories: number;
          sleep_hours: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_checkins']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['daily_checkins']['Insert']>;
      };
      health_scores: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          score: number;
          training_score: number;
          diet_score: number;
          sleep_score: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_scores']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['health_scores']['Insert']>;
      };
    };
  };
};
