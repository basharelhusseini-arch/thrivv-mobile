import { NextRequest } from 'next/server';
import { MemberResourceError } from './member-resource';

export async function authBody(request: NextRequest): Promise<Record<string, any>> {
  if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new MemberResourceError('Invalid request origin.', 403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new MemberResourceError('JSON required.', 415);
  const raw = await request.text();
  if (raw.length > 16000) throw new MemberResourceError('Request too large.', 413);
  let body;
  try { body = JSON.parse(raw); } catch { throw new MemberResourceError('Invalid request.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MemberResourceError('Invalid request.', 400);
  if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.email.length > 320 || body.password.length > 4096) throw new MemberResourceError('Check your email and password.', 400);
  return body;
}
