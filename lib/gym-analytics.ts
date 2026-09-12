/**
 * Pure analytics math for the gym owner dashboard.
 *
 * All functions are pure and SQL-agnostic — they take rows already
 * fetched by the API route and return derived numbers/lists. This
 * keeps the route handler thin and the math testable.
 */

export type CheckinRow = {
  id: string;
  user_id: string;
  date: string;          // YYYY-MM-DD
  did_workout: boolean;
  calories: number | null;
  sleep_hours: number | null;
  created_at: string;    // ISO timestamp
};

export type MemberRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  membership_start_date?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD in UTC (matches how the app already stores `date`). */
export function ymd(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function todayYmd(): string {
  return ymd(new Date());
}

/** Days between two YYYY-MM-DD strings, b - a. */
export function dayDiff(a: string, b: string): number {
  return Math.round(
    (Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY_MS,
  );
}

/** Pilot week number (1-indexed), or null if start is missing or future. */
export function pilotWeekNumber(pilotStart: string | null): number | null {
  if (!pilotStart) return null;
  const days = dayDiff(pilotStart, todayYmd());
  if (days < 0) return null;
  return Math.floor(days / 7) + 1;
}

/** Returns the YYYY-MM-DD for `n` days before today (UTC). */
export function daysAgoYmd(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return ymd(d);
}

/** Resolved membership anchor: explicit override, else created_at date. */
export function membershipStart(member: MemberRow): string {
  if (member.membership_start_date) return member.membership_start_date;
  return member.created_at.split('T')[0];
}

/**
 * Week 4 retention: of members whose membership has reached at least
 * day 22, how many checked in at any point during their day 22..28
 * window. Returns null when no member is eligible yet.
 */
export function week4Retention(
  members: MemberRow[],
  checkins: CheckinRow[],
): { eligible: number; retained: number; rate_pct: number } | null {
  const today = todayYmd();
  const checkinsByUser = new Map<string, Set<string>>();
  for (const c of checkins) {
    let set = checkinsByUser.get(c.user_id);
    if (!set) {
      set = new Set();
      checkinsByUser.set(c.user_id, set);
    }
    set.add(c.date);
  }

  let eligible = 0;
  let retained = 0;
  for (const m of members) {
    const start = membershipStart(m);
    if (dayDiff(start, today) < 21) continue; // hasn't reached day 22 yet
    eligible += 1;
    const startMs = Date.parse(start + 'T00:00:00Z');
    const userDates = checkinsByUser.get(m.id);
    if (!userDates) continue;
    let hit = false;
    for (let i = 21; i <= 27; i += 1) {
      const d = new Date(startMs + i * DAY_MS);
      if (userDates.has(ymd(d))) {
        hit = true;
        break;
      }
    }
    if (hit) retained += 1;
  }

  if (eligible === 0) return null;
  return {
    eligible,
    retained,
    rate_pct: Math.round((retained / eligible) * 100),
  };
}

/**
 * Active in last `windowDays` days = distinct user_ids with any
 * check-in whose `date` falls in [today-windowDays+1, today].
 */
export function activeInWindow(
  checkins: CheckinRow[],
  windowDays: number,
  endDate: string = todayYmd(),
): number {
  const cutoff = new Date(Date.parse(endDate + 'T00:00:00Z') - (windowDays - 1) * DAY_MS);
  const cutoffYmd = ymd(cutoff);
  const seen = new Set<string>();
  for (const c of checkins) {
    if (c.date >= cutoffYmd && c.date <= endDate) seen.add(c.user_id);
  }
  return seen.size;
}

/**
 * Current consecutive-day streak per member.
 *
 * Convention:
 *  - If most recent check-in is today OR yesterday, the streak is
 *    active and counted. Otherwise streak = 0.
 *  - Counts back consecutive days with at least one check-in.
 */
export function streakLeaderboard(
  members: MemberRow[],
  checkins: CheckinRow[],
  topN: number = 10,
): Array<{
  user_id: string;
  name: string;
  email: string;
  current_streak: number;
  last_checkin_date: string | null;
}> {
  const datesByUser = new Map<string, Set<string>>();
  for (const c of checkins) {
    let set = datesByUser.get(c.user_id);
    if (!set) {
      set = new Set();
      datesByUser.set(c.user_id, set);
    }
    set.add(c.date);
  }

  const today = todayYmd();
  const yesterday = daysAgoYmd(1);

  const rows = members.map((m) => {
    const dates = datesByUser.get(m.id);
    const last = dates
      ? [...dates].sort().reverse()[0] ?? null
      : null;

    let streak = 0;
    if (dates && (dates.has(today) || dates.has(yesterday))) {
      const cursor = dates.has(today) ? new Date() : new Date(Date.now() - DAY_MS);
      cursor.setUTCHours(0, 0, 0, 0);
      while (dates.has(ymd(cursor))) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
    }

    return {
      user_id: m.id,
      name: displayName(m),
      email: m.email,
      current_streak: streak,
      last_checkin_date: last,
    };
  });

  return rows
    .sort((a, b) => {
      if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
      // Tiebreak: more recent last check-in first
      return (b.last_checkin_date ?? '').localeCompare(a.last_checkin_date ?? '');
    })
    .slice(0, topN);
}

/**
 * Daily check-in counts for the last `days` days, oldest → newest.
 * Missing days are filled with 0 so the chart has a continuous x-axis.
 */
export function dailyCheckinCounts(
  checkins: CheckinRow[],
  days: number = 30,
): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const c of checkins) {
    counts.set(c.date, (counts.get(c.date) ?? 0) + 1);
  }
  const out: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = daysAgoYmd(i);
    out.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return out;
}

export function displayName(m: MemberRow): string {
  const first = (m.first_name || '').trim();
  const last = (m.last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || m.email;
}

/** Unknown membership dates cannot establish that activity happened in this gym. */
export function membershipCheckins(members: MemberRow[], checkins: CheckinRow[], through = todayYmd()) {
  const starts = new Map(members.map(member => [member.id, member.membership_start_date]));
  return checkins.filter(checkin => {
    const start = starts.get(checkin.user_id);
    return Boolean(start && checkin.date >= start && checkin.date <= through);
  });
}
