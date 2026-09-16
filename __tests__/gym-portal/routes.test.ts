jest.mock('@/lib/gym-auth', () => ({ checkGymAccess: jest.fn(), checkAdminAccess: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkGymAccess, checkAdminAccess } from '@/lib/gym-auth';
import { GET as code, POST as replace } from '@/app/api/gym/[gym_id]/code/route';
import { POST as assign } from '@/app/api/admin/gyms/[gym_id]/operators/route';
import { encryptGymCode } from '@/lib/gym-code-encryption';
import { newGymCode } from '@/lib/gym-codes';
const ctx = { params: Promise.resolve({ gym_id: 'gym-a' }) };
const original = process.env.GYM_CODE_ENCRYPTION_KEY;
const request = (body: object = {}, origin = 'https://gyms.thrivv.dev') => new NextRequest('https://gyms.thrivv.dev/api/gym/gym-a/code', {method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(() => { jest.clearAllMocks(); process.env.GYM_CODE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64'); (checkGymAccess as jest.Mock).mockResolvedValue({ok:true,user:{id:'operator'}}); });
afterAll(() => { if (original === undefined) delete process.env.GYM_CODE_ENCRYPTION_KEY; else process.env.GYM_CODE_ENCRYPTION_KEY=original; });
function record(data: unknown, error: unknown = null) {
  const chain: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: async () => ({data,error}) };
  (supabase.from as jest.Mock).mockReturnValue(chain); return chain;
}
test('code reads require gym access and never return ciphertext or hash', async () => {
  (checkGymAccess as jest.Mock).mockResolvedValue({ok:false,status:403,reason:'Forbidden'});
  expect((await code(request(),ctx)).status).toBe(403); expect(supabase.from).not.toHaveBeenCalled();
  (checkGymAccess as jest.Mock).mockResolvedValue({ok:true});
  const value = newGymCode(); record({code_hash:value.hash,code_ciphertext:encryptGymCode(value.code,'gym-a'),code_encryption_version:1});
  const res = await code(request(),ctx); expect(res.headers.get('cache-control')).toContain('no-store');
  expect(await res.json()).toEqual({status:'available',code:value.code});
});
test('hash-only and missing records are distinguished without rotating anything', async () => {
  record({code_hash:'a'.repeat(64),code_ciphertext:null}); expect(await (await code(request(),ctx)).json()).toEqual({status:'legacy',code:null});
  record(null); expect(await (await code(request(),ctx)).json()).toEqual({status:'missing',code:null});
  record(null,{message:'private DB error'}); const res=await code(request(),ctx); expect(res.status).toBe(503); expect(await res.text()).not.toContain('private DB error');
});
test('created and replaced codes persist through a fresh read without modifying memberships', async () => {
  let saved: any = null;
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: saved, error: null }),
    upsert: jest.fn(async (data: any) => { saved = data; return { error: null }; }) };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  const first = await (await replace(request(), ctx)).json();
  expect(first.status).toBe('available');
  expect((await (await code(request(), ctx)).json()).code).toBe(first.code);
  const previousHash = saved.code_hash;
  const second = await (await replace(request(), ctx)).json();
  expect(second.code).not.toBe(first.code); expect(saved.code_hash).not.toBe(previousHash);
  expect((await (await code(request(), ctx)).json()).code).toBe(second.code);
  expect((supabase.from as jest.Mock).mock.calls.every(([table]) => table === 'gym_join_codes')).toBe(true);
});
test('bad encryption configuration and cross-origin replacement never overwrite code', async () => {
  delete process.env.GYM_CODE_ENCRYPTION_KEY;
  expect((await replace(request(),ctx)).status).toBe(503); expect(supabase.from).not.toHaveBeenCalled();
  expect((await replace(request({},'https://evil.test'),ctx)).status).toBe(403);
});
test('operator cannot assign access; admin RPC uses session actor, not request actor', async () => {
  (checkAdminAccess as jest.Mock).mockResolvedValue({ok:false,status:403,reason:'Admin required'});
  expect((await assign(request(),ctx)).status).toBe(403); expect(supabase.rpc).not.toHaveBeenCalled();
  (checkAdminAccess as jest.Mock).mockResolvedValue({ok:true,user:{id:'real-admin'}});
  (supabase.rpc as jest.Mock).mockResolvedValue({error:null});
  const userId='00000000-0000-4000-8000-000000000001';
  const gymId='00000000-0000-4000-8000-000000000002', requestId='00000000-0000-4000-8000-000000000003';
  expect((await assign(request({userId,grant:true,actor:'forged',requestId,reason:'Owner approved'}),{params:Promise.resolve({gym_id:gymId})})).status).toBe(200);
  expect(supabase.rpc).toHaveBeenCalledWith('thrivv_admin_change',{p_actor:'real-admin',p_request:requestId,p_action:'operator.grant',p_target:gymId,p_reason:'Owner approved',p_data:{user_id:userId}});
});
