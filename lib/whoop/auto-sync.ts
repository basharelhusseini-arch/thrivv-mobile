/**
 * Client-side WHOOP auto-sync helper.
 *
 * Why this exists:
 *   The check-in dashboard and the member dashboard both read
 *   today's row from `health_scores`. WHOOP data only enters that
 *   row when /api/whoop/sync runs. Asking users to navigate to
 *   /member/whoop and click "Sync now" before every dashboard view
 *   is bad UX — they expect their score to reflect WHOOP because
 *   they connected WHOOP.
 *
 * Strategy:
 *   1. Pages that depend on today's score call ensureWhoopAutoSync()
 *      on mount.
 *   2. We hit /api/whoop/status first to see if the user is even
 *      connected — never sync against an unconnected user.
 *   3. We debounce per-tab via sessionStorage so navigating between
 *      pages in the same session doesn't trigger N syncs.
 *   4. Sync is fire-and-forget. The caller can pass an `onSynced`
 *      callback to refetch the score after the sync resolves.
 *   5. Errors are swallowed silently — the page should always be
 *      usable even if WHOOP is down.
 */

const SYNC_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_KEY = 'thrivv:whoop:lastAutoSyncAt';

/**
 * Returns the timestamp (ms) of the last auto-sync we performed
 * in this browser session, or 0 if none.
 */
function lastSyncedAt(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function markSynced(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

export type WhoopStatusSnapshot = {
  connected: boolean;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  scoreSource: 'manual' | 'whoop' | 'hybrid' | null;
  latest: {
    date: string;
    recoveryScore: number | null;
    dayStrain: number | null;
    sleepEfficiencyPct: number | null;
    totalSleepMs: number | null;
  } | null;
};

export async function fetchWhoopStatus(): Promise<WhoopStatusSnapshot | null> {
  try {
    const res = await fetch('/api/whoop/status', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return (await res.json()) as WhoopStatusSnapshot;
  } catch {
    return null;
  }
}

/**
 * Trigger a silent /api/whoop/sync for today if the user is
 * connected and we haven't already synced in the last
 * SYNC_DEBOUNCE_MS. Returns the (possibly stale) status snapshot.
 *
 * Pages that want a fresh score after the sync completes should
 * pass an `onSynced` callback — it's fired only when the sync
 * actually ran and resolved successfully.
 */
export async function ensureWhoopAutoSync(opts?: {
  /** Force a sync even if we're inside the debounce window. */
  force?: boolean;
  /** Specific date to sync. Defaults to today on the server side. */
  date?: string;
  /** Called after a sync completes (HTTP 2xx). */
  onSynced?: () => void;
}): Promise<WhoopStatusSnapshot | null> {
  const status = await fetchWhoopStatus();
  if (!status?.connected) return status;

  const now = Date.now();
  if (!opts?.force && now - lastSyncedAt() < SYNC_DEBOUNCE_MS) {
    return status;
  }

  // Mark first to avoid concurrent triggers from React strict
  // mode or rapid navigations racing.
  markSynced();

  try {
    const qs = opts?.date ? `?date=${encodeURIComponent(opts.date)}` : '';
    const res = await fetch(`/api/whoop/sync${qs}`, {
      method: 'POST',
      cache: 'no-store', signal: AbortSignal.timeout(60000),
    });
    if (res.ok) window.dispatchEvent(new Event('thrivv:workouts-synced'));
    if (res.ok && opts?.onSynced) {
      opts.onSynced();
    }
  } catch {
    // Silent — the page is usable without WHOOP.
  }

  return status;
}
