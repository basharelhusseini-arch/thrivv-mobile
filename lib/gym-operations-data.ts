import { supabase } from './supabase';

export const GYM_PAGE_SIZE = 25;
type Source = 'manual' | 'whoop';
type Scan = { user_id: string; score_date: string; scanned_at: string; request_id: string; source: Source };
type Entitlement = { user_id: string; score_date: string; source: string; awarded: number; status: string };

export function nonnegativeOffset(value: string | null): number {
  return value && /^\d{1,7}$/.test(value) ? Number(value) : 0;
}

/** Input is used inside a PostgREST filter; exclude filter syntax and wildcards. */
export function memberSearch(value: string): string[] {
  return value.slice(0, 80).replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 5);
}

/** Every caller must checkGymAccess first. Return names, never private health details. */
export async function gymMembersData(gymId: string, search: string, offset: number) {
  let query = supabase.from('users').select(
    'id,first_name,last_name,membership_start_date,whoop:gym_workout_verifications!gym_workout_verifications_user_id_fkey(scanned_at),manual:manual_gym_verifications!manual_gym_verifications_user_id_fkey(scanned_at)',
    { count: 'exact' },
  ).eq('gym_id', gymId)
    .eq('whoop.gym_id', gymId).eq('manual.gym_id', gymId)
    .order('scanned_at', { referencedTable: 'whoop', ascending: false }).limit(1, { referencedTable: 'whoop' })
    .order('scanned_at', { referencedTable: 'manual', ascending: false }).limit(1, { referencedTable: 'manual' })
    .order('first_name').order('last_name').order('id');
  for (const token of memberSearch(search)) query = query.or(`first_name.ilike.*${token}*,last_name.ilike.*${token}*`);
  const { data, error, count } = await query.range(offset, offset + GYM_PAGE_SIZE - 1);
  if (error) throw new Error('Member list unavailable. Please retry.');
  return {
    members: (data || []).map(row => ({
      id: row.id, name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Member', joined_at: row.membership_start_date,
      last_verified_at: [...(row.whoop || []), ...(row.manual || [])].map(scan => scan.scanned_at).sort().at(-1) ?? null,
    })), total: count ?? 0, offset, page_size: GYM_PAGE_SIZE,
  };
}

export function mergeGymScans(manual: Scan[], whoop: Scan[], offsets: { manual: number; whoop: number }, limit = GYM_PAGE_SIZE) {
  const rows = [...manual, ...whoop].sort((a, b) => b.scanned_at.localeCompare(a.scanned_at) || a.source.localeCompare(b.source) || a.request_id.localeCompare(b.request_id) || a.user_id.localeCompare(b.user_id)).slice(0, limit);
  return { rows, next: {
    manual: offsets.manual + rows.filter(row => row.source === 'manual').length,
    whoop: offsets.whoop + rows.filter(row => row.source === 'whoop').length,
  }, has_more: manual.length + whoop.length > rows.length };
}

export function dailyCreditForScan(scan: Scan, entitlements: Entitlement[]) {
  const entitlement = entitlements.find(row => row.user_id === scan.user_id && row.score_date === scan.score_date && row.source === scan.source);
  return entitlement ? { points: Number(entitlement.awarded), status: entitlement.status } : { points: null, status: 'not_credited' };
}

/** Two independently paged sources are merged without skipping rows at a shared timestamp. */
export async function gymActivityData(gymId: string, offsets: { manual: number; whoop: number }, through = new Date().toISOString()) {
  const results = await Promise.all((['manual', 'whoop'] as const).map(async source => {
    const { data, error } = await supabase.from(source === 'manual' ? 'manual_gym_verifications' : 'gym_workout_verifications')
      .select('user_id,score_date,scanned_at,request_id').eq('gym_id', gymId).lte('scanned_at', through)
      .order('scanned_at', { ascending: false }).order('request_id').order('user_id')
      .range(offsets[source], offsets[source] + GYM_PAGE_SIZE);
    if (error) throw new Error('Verified activity unavailable. Please retry.');
    return (data || []).map(row => ({ ...row, source })) as Scan[];
  }));
  const merged = mergeGymScans(results[0], results[1], offsets);
  const page = { ...merged, next: { ...merged.next, through } };
  if (!page.rows.length) return { ...page, rows: [], credits_available: true };
  const ids = [...new Set(page.rows.map(row => row.user_id))];
  const dates = [...new Set(page.rows.map(row => row.score_date))];
  const [people, credits] = await Promise.all([
    supabase.from('users').select('id,first_name,last_name').in('id', ids),
    supabase.from('daily_reward_entitlements').select('user_id,score_date,source,awarded,status').eq('gym_id', gymId).in('user_id', ids).in('score_date', dates),
  ]);
  if (people.error) throw new Error('Member names unavailable. Please retry.');
  const names = new Map((people.data || []).map(row => [row.id, `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Member']));
  return { ...page, credits_available: !credits.error, rows: page.rows.map(row => ({
    ...row, name: names.get(row.user_id) || 'Former member',
    daily_credit: credits.error ? { points: null, status: 'unavailable' } : dailyCreditForScan(row, credits.data || []),
  })) };
}

export async function uniqueGymVisitors(gymId: string, since: string) {
  const sets = await Promise.all(['manual_gym_verifications', 'gym_workout_verifications'].map(async table => {
    const ids = new Set<string>();
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from(table).select('user_id').eq('gym_id', gymId).gte('scanned_at', since)
        .order('user_id').order('scanned_at').range(offset, offset + 499);
      if (error) return null;
      for (const row of data || []) ids.add(row.user_id);
      if (!data || data.length < 500) return ids;
    }
  }));
  return sets.some(set => set === null) ? null : new Set(sets.flatMap(set => [...set!])).size;
}
