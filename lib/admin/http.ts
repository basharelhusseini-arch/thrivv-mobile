import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/gym-auth';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
export const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: privateHeaders });
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function textField(value: unknown, label: string, min = 1, max = 500): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new HttpError(400, `${label} must contain ${min}–${max} characters`);
  return value.trim();
}
export async function actor(admin = true) {
  if (admin) { const access = await checkAdminAccess(); if (!access.ok) throw new HttpError(access.status, access.reason); return access.user; }
  const user = await getCurrentUser(); if (!user) throw new HttpError(401, 'Sign in to continue');
  const { data, error } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
  if (error) throw new HttpError(503, 'Account verification unavailable');
  if (!data) throw new HttpError(403, 'Account unavailable');
  return user;
}
export async function bodyOf(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) throw new HttpError(403, 'Invalid request origin');
  if (Number(req.headers.get('content-length') || 0) > 16000) throw new HttpError(413, 'Request too large');
  const raw = await req.text(); if (raw.length > 16000) throw new HttpError(413, 'Request too large');
  let b; try { b = JSON.parse(raw); } catch { throw new HttpError(400, 'Invalid request'); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'Invalid request');
  if (!uuid(b.requestId)) throw new HttpError(400, 'Request ID required');
  return b;
}
export function pageOffset(req: NextRequest) { const n = Number(req.nextUrl.searchParams.get('offset') || 0); if (!Number.isInteger(n) || n < 0 || n > 1000000) throw new HttpError(400, 'Invalid page'); return n; }
export async function handled(fn: () => Promise<NextResponse>) {
  try { return await fn(); } catch (e) { return json({ error: e instanceof HttpError ? e.message : 'This information or action is unavailable. Please retry.' }, e instanceof HttpError ? e.status : 503); }
}
export async function change(userId: string, b: any, action: string, target: string | null, data: unknown) {
  if (target !== null && !uuid(target)) throw new HttpError(400, 'Invalid record ID');
  const reason = textField(b.reason, 'Reason', 3, 500);
  const { data: result, error } = await supabase.rpc('thrivv_admin_change', { p_actor: userId, p_request: b.requestId, p_action: action, p_target: target, p_reason: reason, p_data: data });
  if (error) throw new HttpError(409, 'Change not completed. Check the details and current status, then retry.');
  return result;
}
