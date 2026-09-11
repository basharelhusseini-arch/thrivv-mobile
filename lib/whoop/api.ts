/**
 * WHOOP API fetch helpers (server-only).
 *
 * Each helper returns the raw JSON payload (or null on a soft
 * failure) so the caller can both store the raw payload AND run
 * the defensive extractors in `extract.ts`. A 401 from any
 * endpoint is signalled via WhoopUnauthorizedError so the route
 * can clear tokens and ask the user to reconnect.
 */

import { WHOOP_API_BASE } from './oauth';

export class WhoopUnauthorizedError extends Error {
  constructor(message = 'WHOOP returned 401') {
    super(message);
    this.name = 'WhoopUnauthorizedError';
  }
}

export class WhoopApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'WhoopApiError';
    this.status = status;
  }
}

async function whoopGet(
  path: string,
  accessToken: string,
  query: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`${WHOOP_API_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new WhoopUnauthorizedError();
  }
  if (!res.ok) {
    // Don't leak the upstream body — could carry IDs.
    throw new WhoopApiError(`WHOOP ${path} returned ${res.status}`, res.status);
  }
  return res.json();
}

/**
 * Recovery records that span the supplied window. WHOOP returns
 * paginated records; for our daily-sync use case we don't need to
 * follow next_token because we only fetch a single day.
 */
export function fetchRecovery(
  accessToken: string,
  startIso: string,
  endIso: string
): Promise<unknown> {
  return whoopGet('/developer/v2/recovery', accessToken, {
    start: startIso,
    end: endIso,
    limit: '5',
  });
}

export function fetchSleep(
  accessToken: string,
  startIso: string,
  endIso: string
): Promise<unknown> {
  return whoopGet('/developer/v2/activity/sleep', accessToken, {
    start: startIso,
    end: endIso,
    limit: '5',
  });
}

export function fetchCycle(
  accessToken: string,
  startIso: string,
  endIso: string
): Promise<unknown> {
  return whoopGet('/developer/v2/cycle', accessToken, {
    start: startIso,
    end: endIso,
    limit: '5',
  });
}

/**
 * Fetch the WHOOP user profile. Used during /callback to resolve
 * the WHOOP user_id we persist. Failures here are non-fatal —
 * tokens are still saved.
 */
export async function fetchProfile(accessToken: string): Promise<{
  whoopUserId: number | null;
} | null> {
  try {
    const payload = (await whoopGet(
      '/developer/v2/user/profile/basic',
      accessToken
    )) as Record<string, unknown> | null;
    if (!payload) return null;
    const id = payload.user_id;
    if (typeof id === 'number' && Number.isFinite(id)) {
      return { whoopUserId: id };
    }
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      return { whoopUserId: Number(id) };
    }
    return { whoopUserId: null };
  } catch {
    return null;
  }
}

export async function fetchCollection(path: string, accessToken: string, start: string, end: string): Promise<any[]> {
  const records: unknown[] = [];
  const deadline = Date.now() + 20000;
  let next = '';
  const seen = new Set<string>();
  for (let page = 0; page < 40; page++) {
    if (Date.now() > deadline) throw new Error('WHOOP sync time budget exhausted');
    const payload = await whoopGet(path, accessToken, {
      start, end, limit: '25', ...(next ? { nextToken: next } : {}),
    }) as { records?: unknown[]; next_token?: string };
    if (!Array.isArray(payload.records)) throw new Error('Invalid WHOOP workout collection');
    records.push(...payload.records);
    if (!payload.next_token) return records;
    if (seen.has(payload.next_token)) throw new Error('Repeated WHOOP pagination token');
    seen.add(payload.next_token); next = payload.next_token;
  }
  throw new Error('WHOOP pagination limit reached; retry a smaller window');
}

export const fetchWorkouts = (token: string, start: string, end: string) => fetchCollection('/developer/v2/activity/workout', token, start, end);
