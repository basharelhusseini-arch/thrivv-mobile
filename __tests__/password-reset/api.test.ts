import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clearSessionCookies } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { POST as forgot } from '@/app/api/auth/forgot-password/route';
import { POST as validate } from '@/app/api/auth/reset-password/validate/route';
import { POST as reset } from '@/app/api/auth/reset-password/route';
import { PASSWORD_RESET_REDIRECT, PASSWORD_RESET_SENT_MESSAGE } from '@/lib/password-recovery';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/auth', () => ({ clearSessionCookies: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('@/lib/env', () => ({ getSupabaseEnv: () => ({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-anon-key' }) }));

const id = '00000000-0000-4000-8000-000000000001';
const sid = '00000000-0000-4000-8000-000000000002';
const resetPasswordForEmail = jest.fn(), getUser = jest.fn(), signOut = jest.fn();
const originalFetch = global.fetch;
const mockedFetch = jest.fn();
const now = Math.floor(Date.now() / 1000);
function token(overrides: Record<string, unknown> = {}) {
  return `e30.${Buffer.from(JSON.stringify({ sub: id, session_id: sid, iat: now - 60, exp: now + 3000, ...overrides })).toString('base64url')}.synthetic-test-signature`;
}
function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://www.thrivv.dev/api/auth/${path}`, {
    method: 'POST', headers: { origin: 'https://www.thrivv.dev', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
}
const form = () => ({ accessToken: token(), password: 'synthetic-new-password', confirmPassword: 'synthetic-new-password' });

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockedFetch;
  (createClient as jest.Mock).mockReturnValue({ auth: { resetPasswordForEmail, getUser, admin: { signOut } } });
  resetPasswordForEmail.mockResolvedValue({ error: null });
  getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  signOut.mockResolvedValue({ error: null });
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
  mockedFetch.mockImplementation(async () => new Response('{}', { status: 200 }));
});
afterAll(() => { global.fetch = originalFetch; });

test.each([['forgot-password', forgot], ['reset-password/validate', validate], ['reset-password', reset]] as const)('%s rejects cross-site and non-JSON requests before Auth access', async (path, handler) => {
  expect((await handler(request(path, form(), { origin: 'https://attacker.test' }))).status).toBe(403);
  expect((await handler(request(path, form(), { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
  expect((await handler(request(path, form(), { 'content-type': 'text/plain' }))).status).toBe(415);
  expect(createClient).not.toHaveBeenCalled();
  expect(mockedFetch).not.toHaveBeenCalled();
});

test.each([null, [], 'string', { email: 'a'.repeat(16001) }])('rejects malformed or oversized body %p', async body => {
  const response = await forgot(request('forgot-password', body));
  expect([400, 413]).toContain(response.status);
  expect(resetPasswordForEmail).not.toHaveBeenCalled();
});

test('malformed JSON is rejected without provider access', async () => {
  const req = new NextRequest('https://www.thrivv.dev/api/auth/forgot-password', { method: 'POST', headers: { origin: 'https://www.thrivv.dev', 'content-type': 'application/json' }, body: '{' });
  expect((await forgot(req)).status).toBe(400);
  expect(createClient).not.toHaveBeenCalled();
});

test.each(['', 'invalid', 'a@@b.test', 'x\n@y.test', 'x'.repeat(321) + '@a.test'])('rejects invalid email %p', async email => {
  expect((await forgot(request('forgot-password', { email }))).status).toBe(400);
  expect(resetPasswordForEmail).not.toHaveBeenCalled();
});

test('requests email with fixed canonical redirect, implicit flow and no persisted session', async () => {
  const response = await forgot(request('forgot-password', { email: ' member@example.test ', redirectTo: 'https://attacker.test' }));
  expect(response.status).toBe(200);
  expect(resetPasswordForEmail).toHaveBeenCalledWith('member@example.test', { redirectTo: PASSWORD_RESET_REDIRECT });
  expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'public-anon-key', expect.objectContaining({ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } }));
  expect(await response.json()).toEqual({ success: true, message: PASSWORD_RESET_SENT_MESSAGE });
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(clearSessionCookies).not.toHaveBeenCalled();
});

test.each([
  { code: 'user_not_found', status: 404 },
  { code: 'email_not_confirmed', status: 400 },
  { code: 'over_email_send_rate_limit', status: 429 },
  { code: 'email_address_not_authorized', status: 400 },
  { code: 'over_request_rate_limit', status: 429 },
])('does not reveal account existence or account-specific email limits (%p)', async error => {
  resetPasswordForEmail.mockResolvedValue({ error });
  const response = await forgot(request('forgot-password', { email: 'member@example.test' }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, message: PASSWORD_RESET_SENT_MESSAGE });
});

test('email provider outage is retryable without leaking provider messages', async () => {
  resetPasswordForEmail.mockResolvedValue({ error: { status: 500, message: 'internal SMTP secret' } });
  const response = await forgot(request('forgot-password', { email: 'member@example.test' }));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('secret');
});

test('valid link checks exact token and central session state without creating an app session', async () => {
  const accessToken = token({ amr: [{ method: 'otp', timestamp: now - 60 }] });
  const response = await validate(request('reset-password/validate', { accessToken, refreshToken: 'ignored' }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ valid: true });
  expect(getUser).toHaveBeenCalledWith(accessToken);
  expect(supabase.rpc).toHaveBeenCalledWith('thrivv_session_valid', { p_user: id, p_session: sid, p_issued_at: now - 60 });
  expect(mockedFetch).not.toHaveBeenCalled();
  expect(clearSessionCookies).not.toHaveBeenCalled();
});

test.each([
  { sub: 'different-user' }, { exp: now - 10 }, { exp: undefined }, { iat: undefined },
  { iat: now + 3600 }, { session_id: undefined }, { session_id: 'not-a-uuid' },
])('rejects verified token with invalid session claims %p', async claims => {
  const response = await validate(request('reset-password/validate', { accessToken: token(claims) }));
  expect(response.status).toBe(401);
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(mockedFetch).not.toHaveBeenCalled();
});

test.each([undefined, '', 'tiny', 'x'.repeat(12001)])('rejects invalid token shape without provider access', async accessToken => {
  expect((await validate(request('reset-password/validate', { accessToken }))).status).toBe(401);
  expect(getUser).not.toHaveBeenCalled();
});

test('never trusts token claims before provider verification', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
  const response = await reset(request('reset-password', form()));
  expect(response.status).toBe(401);
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(mockedFetch).not.toHaveBeenCalled();
});

test('revoked, banned or already-used link cannot update a password', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null });
  expect((await reset(request('reset-password', form()))).status).toBe(401);
  expect(mockedFetch).not.toHaveBeenCalled();
});

test('session-state outage fails closed, retryably', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'internal secret' } });
  const response = await reset(request('reset-password', form()));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('secret');
  expect(mockedFetch).not.toHaveBeenCalled();
});

test.each([
  { password: 'short', confirmPassword: 'short' },
  { password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) },
  { password: 'password', confirmPassword: 'different' },
  { password: 'password', confirmPassword: undefined },
])('validates password confirmation and length before token access %p', async values => {
  expect((await reset(request('reset-password', { ...form(), ...values }))).status).toBe(400);
  expect(getUser).not.toHaveBeenCalled();
  expect(mockedFetch).not.toHaveBeenCalled();
});

test('updates only the verified token user using the public API key, revokes sessions, clears cookie and returns no secrets', async () => {
  const body = { ...form(), userId: 'attacker-chosen-id', refreshToken: 'ignored-refresh', metadata: { role: 'admin' } };
  const response = await reset(request('reset-password', body));
  expect(response.status).toBe(200);
  expect(mockedFetch).toHaveBeenCalledTimes(1);
  expect(mockedFetch).toHaveBeenCalledWith('https://example.supabase.co/auth/v1/user', expect.objectContaining({
    method: 'PUT', headers: { apikey: 'public-anon-key', Authorization: `Bearer ${body.accessToken}`, 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' },
    body: JSON.stringify({ password: body.password }), cache: 'no-store',
  }));
  expect(signOut).toHaveBeenCalledWith(body.accessToken, 'global');
  expect(clearSessionCookies).toHaveBeenCalledWith(response, 'www.thrivv.dev');
  expect(await response.json()).toEqual({ success: true });
});

test('password is not trimmed', async () => {
  const password = '  synthetic password  ';
  expect((await reset(request('reset-password', { ...form(), password, confirmPassword: password }))).status).toBe(200);
  expect(JSON.parse(mockedFetch.mock.calls[0][1].body).password).toBe(password);
});

test.each([
  [401, {}, 401], [403, {}, 401], [429, {}, 429], [500, { message: 'secret' }, 503],
  [422, { code: 'weak_password' }, 400], [422, { code: 'same_password' }, 400],
])('provider password rejection %p does not revoke or report success', async (status, data, expected) => {
  mockedFetch.mockResolvedValue(new Response(JSON.stringify(data), { status: status as number }));
  const response = await reset(request('reset-password', form()));
  expect(response.status).toBe(expected);
  expect(await response.text()).not.toContain('secret');
  expect(signOut).not.toHaveBeenCalled();
  expect(clearSessionCookies).not.toHaveBeenCalled();
});

test('logout retries once without repeating a successful password update', async () => {
  signOut.mockResolvedValueOnce({ error: { status: 500 } }).mockResolvedValueOnce({ error: null });
  const response = await reset(request('reset-password', form()));
  expect(await response.json()).toEqual({ success: true });
  expect(signOut).toHaveBeenCalledTimes(2);
  expect(mockedFetch).toHaveBeenCalledTimes(1);
});

test.each(['code', 'error_code'])('supports current and legacy Auth password-error payloads (%s)', async key => {
  mockedFetch.mockResolvedValue(new Response(JSON.stringify({ [key]: 'same_password' }), { status: 422 }));
  const response = await reset(request('reset-password', form()));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'Choose a password different from your current password.' });
});

test('reports changed password honestly if session logout cannot be confirmed', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  signOut.mockResolvedValue({ error: { status: 401 } });
  const response = await reset(request('reset-password', form()));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, warning: expect.any(String) });
  expect(mockedFetch).toHaveBeenCalledTimes(1);
  expect(clearSessionCookies).toHaveBeenCalled();
  warn.mockRestore();
});

test('network errors do not echo tokens or passwords', async () => {
  mockedFetch.mockRejectedValue(new Error(`network failed: ${token()} synthetic-new-password`));
  const response = await reset(request('reset-password', form()));
  expect(response.status).toBe(503);
  const text = await response.text();
  expect(text).not.toContain(token());
  expect(text).not.toContain('synthetic-new-password');
});
