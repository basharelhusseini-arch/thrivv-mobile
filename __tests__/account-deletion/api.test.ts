import { NextRequest } from 'next/server';
import { POST } from '@/app/api/account/delete/route';
import { getCurrentUser, clearSessionCookies } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { recoveryClient } from '@/lib/password-recovery';
jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn(), clearSessionCookies: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn(), auth: { admin: { getUserById: jest.fn(), deleteUser: jest.fn() } } } }));
jest.mock('@/lib/password-recovery', () => ({ recoveryClient: jest.fn() }));
const signInWithPassword = jest.fn(), signOut = jest.fn();
const id='00000000-0000-4000-8000-000000000001';
const request = (body: unknown = { memberId:id, password:'current-password', confirmation:'DELETE' }, headers={}) => new NextRequest('https://www.thrivv.dev/api/account/delete', { method:'POST', headers:{ origin:'https://www.thrivv.dev', 'content-type':'application/json', ...headers }, body:JSON.stringify(body) });
beforeEach(() => {
 jest.clearAllMocks();
 (getCurrentUser as jest.Mock).mockResolvedValue({id,email:'stale@example.test'});
 (supabase.rpc as jest.Mock).mockResolvedValue({data:true,error:null});
 (supabase.auth.admin.getUserById as jest.Mock).mockResolvedValue({data:{user:{id,email:'current@example.test'}},error:null});
 (supabase.auth.admin.deleteUser as jest.Mock).mockResolvedValue({error:null});
 (recoveryClient as jest.Mock).mockReturnValue({auth:{signInWithPassword,signOut}});
 signInWithPassword.mockResolvedValue({data:{user:{id},session:{access_token:'test'}},error:null});
 signOut.mockResolvedValue({error:null});
});
test('deletes only the authenticated, freshly password-verified account and clears cookies', async () => {
 const result=await POST(request());
 expect(result.status).toBe(200);
 expect(signInWithPassword).toHaveBeenCalledWith({email:'current@example.test',password:'current-password'});
 expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith(id,false);
 expect(clearSessionCookies).toHaveBeenCalledWith(result,'www.thrivv.dev');
 expect(signOut).toHaveBeenCalledWith({scope:'local'});
 expect(result.headers.get('cache-control')).toContain('no-store');
});
test.each([{origin:'https://evil.test'},{origin:''},{'sec-fetch-site':'cross-site'}])('rejects unsafe origin %p', async headers => {
 expect((await POST(request(undefined,headers))).status).toBe(403);
 expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled();
});
test.each([{memberId:'other',password:'pass',confirmation:'DELETE'},{password:'pass',confirmation:'DELETE'},{memberId:id,password:'pass',confirmation:'delete'},{memberId:id,password:'',confirmation:'DELETE'},null])('rejects missing confirmation or account mismatch %p',async body=>{
 expect([400,403]).toContain((await POST(request(body))).status);
 expect(signInWithPassword).not.toHaveBeenCalled();
 expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled();
});
test('unauthenticated request cannot delete',async()=>{
 (getCurrentUser as jest.Mock).mockResolvedValue(null);
 expect((await POST(request())).status).toBe(401);
 expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled();
});
test.each([{data:false,error:null},{data:null,error:{message:'missing migration'}}])('missing cleanup fails closed',async result=>{
 (supabase.rpc as jest.Mock).mockResolvedValue(result);
 expect((await POST(request())).status).toBe(503);
 expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled();
});
test.each([400,429,503])('password provider failure %i does not delete',async status=>{
 signInWithPassword.mockResolvedValue({data:{user:null,session:null},error:{status}});
 expect((await POST(request())).status).toBe(status);
 expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled();
});
test('identity mismatch revokes temporary session and cannot delete either user',async()=>{
 signInWithPassword.mockResolvedValue({data:{user:{id:'different'},session:{}},error:null});
 expect((await POST(request())).status).toBe(503);
 expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled();
 expect(signOut).toHaveBeenCalled();
});
test('deletion failure never claims success and cleans up verification session',async()=>{
 (supabase.auth.admin.deleteUser as jest.Mock).mockResolvedValue({error:{message:'internal database error'}});
 const result=await POST(request());
 expect(result.status).toBe(503);
 expect(JSON.stringify(await result.json())).not.toContain('internal database');
 expect(clearSessionCookies).not.toHaveBeenCalled();
 expect(signOut).toHaveBeenCalled();
});
