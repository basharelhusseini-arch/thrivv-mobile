jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(async () => ({ data: true, error: null })) } }));
import { cookies, headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { createSession, getCurrentUser, requireAuth } from '@/lib/auth';
import { POST } from '@/app/api/auth/logout/route';
import { NextRequest } from 'next/server';
const saved = { ...process.env };
const revoked = new Set<string>();
const user = { id: 'member', email: 'test@example.test', firstName: 'Test', lastName: 'Member' };
let token: string;
let unavailable = false;
beforeEach(async () => {
  jest.clearAllMocks(); revoked.clear(); unavailable = false;
  process.env.JWT_SECRET = 'synthetic-logout-test-secret'; process.env.COOKIE_DOMAIN = '.thrivv.dev';
  token = await createSession(user);
  (headers as jest.Mock).mockReturnValue(new Headers());
  (cookies as jest.Mock).mockReturnValue({ get: () => ({ value: token }), getAll: () => [{ value: token }] });
  (supabase.from as jest.Mock).mockImplementation(() => ({
    insert: async ({ token_hash }: { token_hash: string }) => {
      if (unavailable) return { error: { code: 'offline' } };
      revoked.add(token_hash); return { error: null };
    },
    select: () => ({ eq: (_: string, hash: string) => ({ maybeSingle: async () => ({ data: revoked.has(hash) ? { token_hash: hash } : null, error: unavailable ? {} : null }) }) }),
  }));
});
afterAll(() => { process.env = saved; });
const request = (origin = 'https://gyms.thrivv.dev') => new NextRequest('https://gyms.thrivv.dev/api/auth/logout', { method: 'POST', headers: { origin } });
test('logout revokes a copied token and clears both cookie scopes', async () => {
  expect(await getCurrentUser()).toEqual(user);
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get('set-cookie')).toContain('Domain=.thrivv.dev');
  expect(response.headers.get('set-cookie')?.match(/thrivv-session=/g)).toHaveLength(2);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(await getCurrentUser()).toBeNull();
  await expect(requireAuth()).rejects.toThrow('Unauthorized');
  expect(JSON.stringify([...revoked])).not.toContain(token);
});
test('a fresh login is not the same token even in the same second', async () => {
  await POST(request()); token = await createSession(user);
  expect(await getCurrentUser()).toEqual(user);
});
test('logout is idempotent, cross-origin denied, and failures do not claim success', async () => {
  expect((await POST(request('https://evil.test'))).status).toBe(403);
  expect(revoked.size).toBe(0);
  expect((await POST(request())).status).toBe(200);
  expect((await POST(request())).status).toBe(200);
  unavailable = true;
  const response = await POST(request());
  expect(response.status).toBe(500); expect(response.headers.get('set-cookie')).toBeNull();
});
