import { supabase } from './supabase';
import type { GymRecord } from './gym-auth';
import { type CheckinRow, type MemberRow, membershipCheckins, activeInWindow, dailyCheckinCounts, daysAgoYmd, displayName, pilotWeekNumber, streakLeaderboard, todayYmd, week4Retention } from './gym-analytics';

/** Call only after checkGymAccess. Pagination avoids silently truncating gym counts. */
export async function gymDashboardData(gym: GymRecord, isAdmin: boolean, isOwner: boolean) {
  const members: MemberRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('users').select('id,first_name,last_name,created_at,membership_start_date').eq('gym_id', gym.id).order('id').range(offset, offset + 499);
    if (error) throw new Error('Member data unavailable');
    members.push(...(data || []).map(row => ({ ...row, email: '' })));
    if (!data || data.length < 500) break;
  }
  const checkins: CheckinRow[] = [];
  const today = todayYmd();
  for (let batch = 0; batch < members.length; batch += 100) {
    const ids = members.slice(batch, batch + 100).map(member => member.id);
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('daily_checkins').select('id,user_id,date,created_at')
        .in('user_id', ids).gte('date', daysAgoYmd(90)).lte('date', today).order('id').range(offset, offset + 499);
      if (error) throw new Error('Check-in data unavailable');
      checkins.push(...(data || []).map(row => ({ ...row, did_workout: false, calories: null, sleep_hours: null })));
      if (!data || data.length < 500) break;
    }
  }
  const filtered = membershipCheckins(members, checkins, today);
  const active = activeInWindow(filtered, 7, today);
  const memberById = new Map(members.map(member => [member.id, member]));
  const knownMemberships = members.filter(member => member.membership_start_date);
  return {
    gym, pilot_week_number: pilotWeekNumber(gym.pilot_start_date),
    date_range: { from: daysAgoYmd(29), to: today },
    totals: { total_members: members.length, pilot_member_count: gym.pilot_member_count,
      active_this_week: active, active_this_week_pct: members.length ? Math.round(active / members.length * 100) : 0,
      active_prev_week: activeInWindow(filtered, 7, daysAgoYmd(7)) },
    activity_definition: 'Distinct current members with a daily check-in in the last seven UTC calendar days, including today. This measures check-in activity, not attendance or app visits.',
    unknown_membership_dates: members.length - knownMemberships.length,
    // These integrations do not yet have an activated, gym-attributed source.
    // Never substitute balances, health scores or daily check-ins for these metrics.
    earned_points: { status: 'not_activated' as const, value: null, reason: 'Gym-attributed reward earnings are not activated.' },
    verified_scans: { status: 'not_activated' as const, total: null, last_seven_days: null, reason: 'Workout QR verification is not activated.' },
    week4_retention: week4Retention(knownMemberships, filtered),
    streak_leaderboard: streakLeaderboard(members, filtered, 10).map(row => ({ ...row, name: row.name || 'Member' })),
    daily_checkins_30d: dailyCheckinCounts(filtered, 30),
    recent_activity: [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20).map(row => ({
      id: row.id, user_id: row.user_id, name: displayName(memberById.get(row.user_id)!) || 'Member', date: row.date, created_at: row.created_at,
    })),
    viewer: { is_admin: isAdmin, is_owner: isOwner },
  };
}
