import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkGymAccess } from '@/lib/gym-auth';
import {
  type CheckinRow,
  type MemberRow,
  activeInWindow,
  dailyCheckinCounts,
  daysAgoYmd,
  displayName,
  pilotWeekNumber,
  streakLeaderboard,
  todayYmd,
  week4Retention,
} from '@/lib/gym-analytics';

export async function GET(
  _req: NextRequest,
  { params }: { params: { gym_id: string } },
) {
  const access = await checkGymAccess(params.gym_id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.status },
    );
  }

  const { gym } = access;

  // ---- 1. Members of this gym ------------------------------------
  const { data: members, error: membersErr } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, created_at, membership_start_date')
    .eq('gym_id', gym.id);

  if (membersErr) {
    console.error('gym analytics: members query failed', membersErr);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }

  const memberRows = (members || []) as MemberRow[];
  const memberIds = memberRows.map((m) => m.id);

  // ---- 2. Check-ins for this gym (bounded window) ----------------
  // 90 days covers streak + week4 + 30d engagement chart in one pull.
  const since = daysAgoYmd(90);
  let checkinRows: CheckinRow[] = [];
  if (memberIds.length > 0) {
    const { data: checkins, error: checkinsErr } = await supabase
      .from('daily_checkins')
      .select('id, user_id, date, did_workout, calories, sleep_hours, created_at')
      .in('user_id', memberIds)
      .gte('date', since)
      .order('created_at', { ascending: false });

    if (checkinsErr) {
      console.error('gym analytics: checkins query failed', checkinsErr);
      return NextResponse.json({ error: 'Failed to load check-ins' }, { status: 500 });
    }
    checkinRows = (checkins || []) as CheckinRow[];
  }

  // ---- 3. Derived metrics ----------------------------------------
  const today = todayYmd();
  const totalMembers = memberRows.length;
  const activeThisWeek = activeInWindow(checkinRows, 7, today);
  const activePrevWeek = activeInWindow(
    checkinRows.filter((c) => c.date < daysAgoYmd(6)),
    7,
    daysAgoYmd(7),
  );

  const week4 = week4Retention(memberRows, checkinRows);
  const streaks = streakLeaderboard(memberRows, checkinRows, 10);
  const chart = dailyCheckinCounts(checkinRows, 30);

  // ---- 4. Recent activity (last 20 across gym) -------------------
  const memberById = new Map(memberRows.map((m) => [m.id, m]));
  const recent = checkinRows.slice(0, 20).map((c) => {
    const m = memberById.get(c.user_id);
    return {
      id: c.id,
      user_id: c.user_id,
      name: m ? displayName(m) : 'Unknown member',
      email: m?.email ?? '',
      date: c.date,
      did_workout: c.did_workout,
      calories: c.calories,
      sleep_hours: c.sleep_hours,
      created_at: c.created_at,
    };
  });

  return NextResponse.json({
    gym: {
      id: gym.id,
      name: gym.name,
      owner_email: gym.owner_email,
      pilot_start_date: gym.pilot_start_date,
      pilot_member_count: gym.pilot_member_count,
      created_at: gym.created_at,
    },
    pilot_week_number: pilotWeekNumber(gym.pilot_start_date),
    date_range: { from: daysAgoYmd(29), to: today },
    totals: {
      total_members: totalMembers,
      pilot_member_count: gym.pilot_member_count,
      active_this_week: activeThisWeek,
      active_this_week_pct:
        totalMembers > 0 ? Math.round((activeThisWeek / totalMembers) * 100) : 0,
      active_prev_week: activePrevWeek,
    },
    week4_retention: week4,
    streak_leaderboard: streaks,
    daily_checkins_30d: chart,
    recent_activity: recent,
    viewer: { is_admin: access.isAdmin, is_owner: access.isOwner },
  });
}
