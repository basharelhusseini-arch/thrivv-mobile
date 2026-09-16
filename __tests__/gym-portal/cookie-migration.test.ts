jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn(async () => ({ data: true, error: null })) } }));
import { cookies, headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { createSession, getAuthenticatedSession, getCurrentUser, sessionCookieDomain, setSessionCookie, writeSessionCookie } from '@/lib/auth';
import { createHash } from 'crypto';
const user={id:'member',email:'test@example.test',firstName:'Test',lastName:'Member'};
let revoked=new Set<string>();
const original=process.env.JWT_SECRET;
beforeEach(()=>{
 jest.clearAllMocks();process.env.JWT_SECRET='synthetic-cookie-migration-secret';revoked=new Set();
 (cookies as jest.Mock).mockReturnValue({getAll:()=>[]});
 (headers as jest.Mock).mockReturnValue(new Headers());
 (supabase.from as jest.Mock).mockReturnValue({select:()=>({eq:(_:string,hash:string)=>({maybeSingle:async()=>({data:revoked.has(hash)?{token_hash:hash}:null,error:null})})})});
});
afterAll(()=>{if(original===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=original;});
function request(...tokens:string[]){(headers as jest.Mock).mockReturnValue(new Headers({cookie:tokens.map(token=>`thrivv-session=${token}`).join('; ')}));}
test.each(['thrivv.dev','www.thrivv.dev','gyms.thrivv.dev'])('shared cookies are scoped to trusted production host %s',host=>{expect(sessionCookieDomain(host)).toBe('.thrivv.dev');});
test.each(['localhost:3000','preview.vercel.app','evil.thrivv.dev','thrivv.dev.evil.test','unrelated.test'])('never broaden cookies from %s',host=>{expect(sessionCookieDomain(host)).toBeUndefined();});
test('host-only cookie is expired before fresh shared login, clearing stale revoked scopes',async()=>{
 const response=new Response();await setSessionCookie(user,response,'www.thrivv.dev');const cookie=response.headers.get('set-cookie')!;
 expect(cookie).toMatch(/^thrivv-session=; .*Max-Age=0/);expect(cookie).toContain('Domain=.thrivv.dev');expect(cookie.match(/thrivv-session=/g)).toHaveLength(2);
 const token=cookie.match(/, thrivv-session=([^;]+)/)![1];request(token);expect(await getCurrentUser()).toEqual(user);
});
test('migration retains JWT and remaining expiry, never creates a new login',()=>{
 const response=new Response();const expires=Math.floor(Date.now()/1000)+60;writeSessionCookie(response,'existing-jwt','gyms.thrivv.dev',expires);
 expect(response.headers.get('set-cookie')).toContain('thrivv-session=existing-jwt;');expect(response.headers.get('set-cookie')).toMatch(/Max-Age=6[0]?; Domain=|Max-Age=59; Domain=/);
});
test('raw duplicate cookies survive Next parsed-cookie deduplication',async()=>{
 const token=await createSession(user);request('invalid-token',token,token);expect((await getAuthenticatedSession())?.token).toBe(token);
});
test('valid cookies for different accounts fail closed',async()=>{
 request(await createSession(user),await createSession({...user,id:'another-member'}));expect(await getCurrentUser()).toBeNull();
});
test('a revoked signed cookie cannot fall back to another valid cookie',async()=>{
 const stale=await createSession(user);const fresh=await createSession(user);revoked.add(createHash('sha256').update(stale).digest('hex'));
 request(stale,fresh);expect(await getCurrentUser()).toBeNull();request(fresh,stale);expect(await getCurrentUser()).toBeNull();
});
test('revocation outage is retryable and never treated as an absent session',async()=>{
 request(await createSession(user));(supabase.from as jest.Mock).mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:{message:'offline'}})})})});
 await expect(getCurrentUser()).rejects.toThrow('Session verification unavailable');
});
