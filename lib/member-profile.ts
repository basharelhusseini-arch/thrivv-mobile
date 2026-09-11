import { supabase } from '@/lib/supabase';
/** Called only with identity verified by Supabase Auth. Never accepts roles or gym IDs. */
export async function ensureMemberProfile(user: { id: string; email?: string; user_metadata?: Record<string, any> }) {
  const { error } = await supabase.from('users').upsert({
    id: user.id, user_id: user.id, email: user.email,
    first_name: user.user_metadata?.first_name || '', last_name: user.user_metadata?.last_name || '',
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw new Error('Unable to initialise member profile');
}
