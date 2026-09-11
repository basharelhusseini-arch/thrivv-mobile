/**
 * Gym dashboard access control.
 *
 * Used by /api/gym/[gym_id]/* and /api/admin/* routes, and by the
 * /gym/[gym_id]/dashboard server component.
 *
 * Mirrors the existing pattern: read the custom JWT cookie via
 * getCurrentUser(), then check authorization with the service-role
 * Supabase client. RLS is defense-in-depth (see migration 015).
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
  | { ok: false; status: 401 | 403 | 404; reason: string };

/**
 * Resolve current user → check is_admin → fetch gym → enforce
 * (admin OR owner_email matches user.email).
 *
 * Returns a discriminated union so callers can branch cleanly.
 */
export async function checkGymAccess(gymId: string): Promise<GymAccessResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, status: 401, reason: 'Not authenticated' };
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('is_admin, email')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = Boolean(userRow?.is_admin);

  const { data: gymRow } = await supabase
    .from('gyms')
    .select('id, name, owner_email, pilot_start_date, pilot_member_count, created_at')
    .eq('id', gymId)
    .maybeSingle();

  if (!gymRow) {
    return { ok: false, status: 404, reason: 'Gym not found' };
  }

  const gym = gymRow as GymRecord;
  const userEmail = (user.email || '').toLowerCase();
  const isOwner = userEmail === gym.owner_email.toLowerCase();

  if (!isAdmin && !isOwner) {
    return { ok: false, status: 403, reason: 'Forbidden' };
  }

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
