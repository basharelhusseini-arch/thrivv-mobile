import { recordProductionError } from '@/lib/error-reporting';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export class MemberResourceError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function memberActor(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) throw new MemberResourceError('Sign in to continue.', 401);
  const requested = request.nextUrl.searchParams.get('memberId');
  if (requested && requested !== user.id) throw new MemberResourceError('Access denied.', 403);
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== request.nextUrl.origin)) throw new MemberResourceError('Invalid request origin.', 403);
  }
  return user;
}
export function owned<T extends { memberId: string }>(record: T | undefined | null, id: string): T {
  if (!record || record.memberId !== id) throw new MemberResourceError('Record not found.', 404);
  return record;
}
export async function memberBody(request: NextRequest, userId: string) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new MemberResourceError('JSON required.', 415);
  const raw = await request.text();
  if (raw.length > 64000) throw new MemberResourceError('Request too large.', 413);
  let body; try { body = JSON.parse(raw); } catch { throw new MemberResourceError('Invalid JSON.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MemberResourceError('Invalid request.', 400);
  if (body.memberId !== undefined && body.memberId !== userId) throw new MemberResourceError('Access denied.', 403);
  return body;
}
export async function memberResult(fn: () => Promise<unknown>, status = 200) {
  try { return NextResponse.json(await fn(), { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }); }
  catch (error) { if(!(error instanceof MemberResourceError)||error.status>=500) await recordProductionError('server','/api/member',error); return NextResponse.json({ error: error instanceof MemberResourceError ? error.message : 'Unable to complete this request.' }, { status: error instanceof MemberResourceError ? error.status : 503, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }); }
}
