import { NextRequest } from 'next/server';
import { gymCodeHash, newGymCode } from '@/lib/gym-codes';
import { POST } from '@/app/api/account/join-gym/route';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
const auth = requireAuth as jest.Mock; const rpc = supabase.rpc as jest.Mock;
const request = (body: object, origin = 'https://www.thrivv.dev') => new NextRequest('https://www.thrivv.dev/api/account/join-gym', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => { jest.clearAllMocks(); auth.mockResolvedValue({ id: 'session-user' }); });
test('normalizes codes and rejects malformed input', () => {
 const value = newGymCode(); expect(gymCodeHash(value.code.toLowerCase())).toBe(value.hash);
 expect(gymCodeHash(value.code.replace(/-/g,' '))).toBe(value.hash);
 for (const input of [null, {}, 'ABC', 'x'.repeat(100)]) expect(() => gymCodeHash(input)).toThrow();
});
test('rejects cross-origin requests before database access', async () => {
 expect((await POST(request({ code: newGymCode().code }, 'https://other.test'))).status).toBe(403); expect(rpc).not.toHaveBeenCalled();
});
test('requires a session', async () => { auth.mockRejectedValue(new Error()); expect((await POST(request({}))).status).toBe(401); expect(rpc).not.toHaveBeenCalled(); });
test('uses session identity and hashes code, ignoring forged member/gym IDs', async () => {
 const value = newGymCode(); rpc.mockResolvedValue({ data: { ok: true, gym: { id: 'verified-gym', name: 'Test Gym' } }, error: null });
 expect((await POST(request({ code: value.code, userId: 'victim', gymId: 'forged' }))).status).toBe(200);
 expect(rpc).toHaveBeenCalledWith('thrivv_join_gym_code', { p_user: 'session-user', p_hash: value.hash });
});
test('returns a rate limit without exposing database details', async () => {
 rpc.mockResolvedValue({ data: { ok: false, reason: 'limited' }, error: null }); expect((await POST(request({ code: newGymCode().code }))).status).toBe(429);
 rpc.mockResolvedValue({ data: null, error: { message: 'private detail' } });
 const res = await POST(request({ code: newGymCode().code })); expect(res.status).toBe(503); expect(await res.text()).not.toContain('private detail');
});

jest.mock('@/lib/gym-auth', () => ({ checkGymAccess: jest.fn() }));
import { checkGymAccess } from '@/lib/gym-auth';
import { POST as createCode } from '@/app/api/gym/[gym_id]/code/route';
import { GET as account } from '@/app/api/account/route';
test('only authorized gym administrators can generate a code', async () => {
 (checkGymAccess as jest.Mock).mockResolvedValue({ ok: false, status: 403, reason: 'Forbidden' });
 const res = await createCode(request({}), { params: Promise.resolve({ gym_id: 'another-gym' }) });
 expect(res.status).toBe(403); expect(supabase.from).not.toHaveBeenCalled();
});
test('code generation stores a hash and scopes it to the authorized gym', async () => {
 const previousKey = process.env.GYM_CODE_ENCRYPTION_KEY;
 process.env.GYM_CODE_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
 (checkGymAccess as jest.Mock).mockResolvedValue({ ok: true, user: { id: 'admin' } });
 const upsert = jest.fn().mockResolvedValue({ error: null }); (supabase.from as jest.Mock).mockReturnValue({ upsert });
 const res = await createCode(request({}), { params: Promise.resolve({ gym_id: 'authorized-gym' }) });
 const data = await res.json(); expect(res.status).toBe(200);
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ gym_id: 'authorized-gym', code_hash: gymCodeHash(data.code), created_by: 'admin' }), { onConflict: 'gym_id' });
 expect(JSON.stringify(upsert.mock.calls)).not.toContain(data.code);
 if (previousKey === undefined) delete process.env.GYM_CODE_ENCRYPTION_KEY; else process.env.GYM_CODE_ENCRYPTION_KEY = previousKey;
});
test('account loads only the signed-in profile and never requests passwords or tokens', async () => {
 const single = jest.fn().mockResolvedValue({ data: { first_name: 'Test', last_name: 'Member', email: 'test@example.test', gym_id: null }, error: null });
 const eq = jest.fn().mockReturnValue({ single }); const select = jest.fn().mockReturnValue({ eq });
 (supabase.from as jest.Mock).mockReturnValue({ select });
 const res = await account(); expect(res.status).toBe(200);
 expect(select).toHaveBeenCalledWith('first_name,last_name,email,gym_id'); expect(eq).toHaveBeenCalledWith('id','session-user');
 expect(await res.json()).toEqual({ name: 'Test Member', email: 'test@example.test', gym: null });
});
