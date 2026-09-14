import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, type SessionUser } from './auth';
import { checkAdminAccess } from './gym-auth';

type Access =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

// These routes predate the gym-scoped database. Their reference/demo store must
// never become an alternate authorization path into another member's account.
export function legacyJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Vary', 'Cookie');
  headers.set('X-Thrivv-Data-Source', 'legacy-memory');
  return NextResponse.json(body, { ...init, headers });
}

export async function legacyAdminAccess(): Promise<Access> {
  try {
    const access = await checkAdminAccess();
    if (!access.ok) return { ok: false, response: legacyJson({ error: access.reason }, { status: access.status }) };
    return access;
  } catch {
    return { ok: false, response: legacyJson({ error: 'Access verification unavailable. Please retry.' }, { status: 503 }) };
  }
}

export async function legacyMemberAccess(requestedMemberId?: unknown): Promise<Access> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, response: legacyJson({ error: 'Not authenticated' }, { status: 401 }) };
    if (requestedMemberId != null && requestedMemberId !== user.id) {
      return { ok: false, response: legacyJson({ error: 'You can only access your own account.' }, { status: 403 }) };
    }
    return { ok: true, user };
  } catch {
    return { ok: false, response: legacyJson({ error: 'Access verification unavailable. Please retry.' }, { status: 503 }) };
  }
}

/** Authenticates first; retired demo actions never write or issue confirmations. */
export async function unavailableLegacyAction(request: NextRequest, code: string, error: string) {
  const access = await legacyMemberAccess();
  if (!access.ok) return access.response;
  let body: { memberId?: unknown };
  try {
    const text = await request.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
    body = parsed;
  } catch {
    return legacyJson({ error: 'Invalid request body' }, { status: 400 });
  }
  if (body.memberId != null && body.memberId !== access.user.id) {
    return legacyJson({ error: 'You can only access your own account.' }, { status: 403 });
  }
  return legacyJson({ error, code }, { status: 503 });
}
