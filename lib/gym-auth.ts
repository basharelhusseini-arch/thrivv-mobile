/**
 * Gym dashboard access control.
 *
 * Used by /api/gym/[gym_id]/* and /api/admin/* routes, and by the
 * /gym/[gym_id]/dashboard server component.
 *
 * Mirrors the existing pattern: read the custom JWT cookie via
 * getCurrentUser(), then check authorization with the service-role
 * Supabase client. RLS is defense-in-depth; operator assignments are server controlled.
 */

import { supabase } from './supabase';
import { getCurrentUser, type SessionUser } from './auth';

export type GymRecord = {
  id: string;
  name: string;
  owner_email: string;
  pilot_start_date: string | null;
  pilot_member_count: number;
  created_at: string;
};

export type GymAccessResult =
  | { ok: true; user: SessionUser; gym: GymRecord; isAdmin: boolean; isOwner: boolean }
  | { ok: false; status: 401 | 403 | 404 | 503; reason: string };

/**
 * Resolve current user → check is_admin → fetch gym → enforce
 * (admin OR an explicit gym_operators user-ID assignment).
 *
 * Returns a discriminated union so callers can branch cleanly.
 */
export async function checkGymAccess(gymId: string): Promise<GymAccessResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, status: 401, reason: 'Not authenticated' };
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (userError) return { ok: false, status: 503, reason: 'Gym access is unavailable. Please retry.' };
  if (!userRow) return { ok: false, status: 403, reason: 'Account unavailable' };
  const isAdmin = Boolean(userRow.is_admin);
  let isOwner = false;
  if (!isAdmin) {
    const { data: operator, error } = await supabase.from('gym_operators').select('user_id').eq('gym_id', gymId).eq('user_id', user.id).maybeSingle();
    if (error) return { ok: false, status: 503, reason: 'Gym access is not configured or is temporarily unavailable.' };
    isOwner = Boolean(operator);
    if (!isOwner) return { ok: false, status: 403, reason: 'Your account has not been assigned access to this gym.' };
  }

  const { data: gymRow, error: gymError } = await supabase
    .from('gyms')
    .select('id, name, owner_email, pilot_start_date, pilot_member_count, created_at')
    .eq('id', gymId)
    .maybeSingle();

  if (gymError) return { ok: false, status: 503, reason: 'Gym unavailable' };
  if (!gymRow) {
    return { ok: false, status: 404, reason: 'Gym not found' };
  }

  const gym = gymRow as GymRecord;
  return { ok: true, user, gym, isAdmin, isOwner };
}

/**
 * Used by /admin/* routes. Throws-style helpers are avoided to
 * stay consistent with checkGymAccess above.
 */
export async function checkAdminAccess(): Promise<
  | { ok: true; user: SessionUser }
  | { ok: false; status: 401 | 403; reason: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, reason: 'Not authenticated' };

  const { data: userRow } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!userRow?.is_admin) {
    return { ok: false, status: 403, reason: 'Admin access required' };
  }
  return { ok: true, user };
}

/** List only explicit assignments; email is never an authorization credential. */
export async function gymPortalAccess() {
  const user = await getCurrentUser();
  if (!user) return { user: null, isAdmin: false, gyms: [], error: null };
  const { data: row, error } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (error || !row) return { user, isAdmin: false, gyms: [], error: 'Unable to verify your account.' };
  if (row.is_admin) return { user, isAdmin: true, gyms: [], error: null };
  const { data, error: accessError } = await supabase.from('gym_operators').select('gym_id,gyms(id,name)').eq('user_id', user.id);
  if (accessError) return { user, isAdmin: false, gyms: [], error: 'Gym access is not configured or is temporarily unavailable.' };
  const gyms = (data || []).flatMap(record => {
    const gym = record.gyms as unknown as { id: string; name: string } | null;
    return gym ? [gym] : [];
  }).sort((a, b) => a.name.localeCompare(b.name));
  return { user, isAdmin: false, gyms, error: null };
}
