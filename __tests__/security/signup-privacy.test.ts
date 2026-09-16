import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setSessionCookie } from '@/lib/auth';
import { POST } from '@/app/api/auth/signup/route';
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy-policy';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/auth', () => ({ setSessionCookie: jest.fn() }));
jest.mock('@/lib/env', () => ({ getSupabaseEnv: () => ({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-public' }) }));
jest.mock('@/lib/member-profile', () => ({ ensureMemberProfile: jest.fn() }));

const signUp = jest.fn();
const form = {
  firstName: 'Member', lastName: 'A', email: 'member@example.test', password: 'test-password',
  acceptedPrivacyPolicy: true, privacyPolicyVersion: PRIVACY_POLICY_VERSION,
};
const request = (changes: Record<string, unknown> = {}) => new NextRequest('https://thrivv.dev/api/auth/signup', {
  method: 'POST',
  headers: { origin: 'https://thrivv.dev', 'content-type': 'application/json' },
  body: JSON.stringify({ ...form, ...changes }),
});

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue({ auth: { signUp } });
  signUp.mockResolvedValue({ data: { user: { id: 'member-a', email: form.email }, session: null }, error: null });
});

test.each([undefined, false, null, 'true', 'false', 1, {}, []])('rejects non-explicit policy acceptance %j before account creation', async acceptedPrivacyPolicy => {
  const response = await POST(request({ acceptedPrivacyPolicy }));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain('Privacy Policy');
  expect(createClient).not.toHaveBeenCalled();
  expect(signUp).not.toHaveBeenCalled();
  expect(setSessionCookie).not.toHaveBeenCalled();
});

test.each([undefined, null, '2026-05-01', true, [], {}])('rejects missing or stale policy version %j before account creation', async privacyPolicyVersion => {
  const response = await POST(request({ privacyPolicyVersion }));
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({
    error: 'The Privacy Policy has changed. Refresh this page, review the latest policy, and agree before creating your account.',
    code: 'privacy_policy_updated',
  });
  expect(createClient).not.toHaveBeenCalled();
  expect(signUp).not.toHaveBeenCalled();
});

test('records the accepted version and server timestamp without trusting supplied metadata', async () => {
  const before = Date.now();
  const response = await POST(request({
    privacyPolicyAcceptedAt: '1970-01-01T00:00:00.000Z',
    privacy_policy_accepted_at: '1970-01-01T00:00:00.000Z',
    user_metadata: { privacy_policy_accepted: false, role: 'admin' },
  }));
  const after = Date.now();
  expect(response.status).toBe(200);
  expect(signUp).toHaveBeenCalledTimes(1);
  const metadata = signUp.mock.calls[0][0].options.data;
  expect(metadata).toEqual({
    first_name: form.firstName,
    last_name: form.lastName,
    phone: null,
    privacy_policy_accepted: true,
    privacy_policy_version: PRIVACY_POLICY_VERSION,
    privacy_policy_accepted_at: expect.any(String),
  });
  expect(new Date(metadata.privacy_policy_accepted_at).getTime()).toBeGreaterThanOrEqual(before);
  expect(new Date(metadata.privacy_policy_accepted_at).getTime()).toBeLessThanOrEqual(after);
  expect((await response.json()).requiresEmailConfirmation).toBe(true);
  expect(setSessionCookie).not.toHaveBeenCalled();
});
