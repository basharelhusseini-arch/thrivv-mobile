import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setSessionCookie } from '@/lib/auth';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as signup } from '@/app/api/auth/signup/route';
import { ensureMemberProfile } from '@/lib/member-profile';
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/auth', () => ({ setSessionCookie: jest.fn(), getCurrentUser: jest.fn() }));
jest.mock('@/lib/env', () => ({ getSupabaseEnv: () => ({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-public' }) }));
jest.mock('@/lib/member-profile', () => ({ ensureMemberProfile: jest.fn() }));
const sid = '00000000-0000-4000-8000-000000000001';
const access = `e30.${Buffer.from(JSON.stringify({ session_id: sid })).toString('base64url')}.test`;
const user = { id: 'member-a', email: 'member@example.test', user_metadata: { first_name: 'Member', last_name: 'A' } };
const signInWithPassword = jest.fn(), signUp = jest.fn();
function req(path: string, body: unknown, origin = 'https://thrivv.dev', type = 'application/json') {
  return new NextRequest(`https://thrivv.dev/api/auth/${path}`, { method: 'POST', headers: { origin, 'content-type': type }, body: JSON.stringify(body) });
}
const form = { email: user.email, password: 'test-password', firstName: 'Member', lastName: 'A' };
beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue({ auth: { signInWithPassword, signUp } });
  signInWithPassword.mockResolvedValue({ data: { user, session: { access_token: access } }, error: null });
  signUp.mockResolvedValue({ data: { user, session: { access_token: access, refresh_token: 'must-not-be-returned' } }, error: null });
});
test.each([['login', login], ['signup', signup]] as const)('%s blocks cross-site login and non-JSON forms before authentication', async (path, handler) => {
  expect((await handler(req(path, form, 'https://attacker.test', 'text/plain'))).status).toBe(403);
  expect((await handler(req(path, form, 'https://thrivv.dev', 'text/plain'))).status).toBe(415);
  expect(signUp).not.toHaveBeenCalled(); expect(signInWithPassword).not.toHaveBeenCalled();
});
test('normal login binds cookie to the upstream session and exposes no tokens', async () => {
  const response = await login(req('login', form));
  expect(response.status).toBe(200);
  expect(setSessionCookie).toHaveBeenCalledWith(expect.objectContaining({ id: user.id }), response, 'thrivv.dev', sid);
  expect(await response.text()).not.toContain(access);
});
test('immediate signup establishes the app session before the dashboard redirect', async () => {
  const response = await signup(req('signup', form));
  expect(response.status).toBe(200); expect(ensureMemberProfile).toHaveBeenCalledWith(user);
  expect(setSessionCookie).toHaveBeenCalledWith(expect.objectContaining({ id: user.id }), response, 'thrivv.dev', sid);
  const data = await response.json(); expect(data.success).toBe(true); expect(data.session).toBeUndefined();
});
test('email-confirmation signup keeps its existing flow and issues no app cookie', async () => {
  signUp.mockResolvedValue({ data: { user, session: null }, error: null });
  const response = await signup(req('signup', form));
  expect((await response.json()).requiresEmailConfirmation).toBe(true);
  expect(setSessionCookie).not.toHaveBeenCalled();
});
