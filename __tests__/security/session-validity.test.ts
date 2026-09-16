jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
import { cookies, headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { createSession, getCurrentUser } from '@/lib/auth';
const user = { id: 'member-a', email: 'a@example.test', firstName: 'A', lastName: 'B' };
const original = process.env.JWT_SECRET;
beforeEach(async () => {
  jest.clearAllMocks(); process.env.JWT_SECRET = 'synthetic-session-validity-test-key';
  const token = await createSession(user, 'upstream-session-id');
  (cookies as jest.Mock).mockReturnValue({ getAll: () => [{ value: token }] });
  (headers as jest.Mock).mockReturnValue(new Headers());
  (supabase.from as jest.Mock).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) });
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
});
afterAll(() => { if (original === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original; });
test('verified cookies are checked against central auth state without exposing token secrets', async () => {
  expect(await getCurrentUser()).toEqual(user);
  expect(supabase.rpc).toHaveBeenCalledWith('thrivv_session_valid', { p_user: user.id, p_session: 'upstream-session-id', p_issued_at: expect.any(Number) });
});
test('a reset, ban or revoked upstream session cannot keep using the app cookie', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null });
  expect(await getCurrentUser()).toBeNull();
});
test('an auth-state outage stays retryable rather than silently logging the member out', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(getCurrentUser()).rejects.toThrow('Session verification unavailable');
});
