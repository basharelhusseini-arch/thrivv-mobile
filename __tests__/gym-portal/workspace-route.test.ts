jest.mock('@/lib/auth',()=>({...jest.requireActual('@/lib/auth'),getAuthenticatedSession:jest.fn()}));
import { getAuthenticatedSession } from '@/lib/auth';
import { POST } from '@/app/api/auth/workspace/route';
import { NextRequest } from 'next/server';
const user={id:'member',email:'a@example.test',firstName:'A',lastName:'Member'};
function request(destination:unknown='/admin/gyms',origin='https://www.thrivv.dev',host='www.thrivv.dev'){
 return new NextRequest(`https://${host}/api/auth/workspace`,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({destination})});
}
beforeEach(()=>{jest.clearAllMocks();(getAuthenticatedSession as jest.Mock).mockResolvedValue({token:'existing-signed-session',session:{user,exp:Math.floor(Date.now()/1000)+120}});});
test('explicit workspace transition preserves verified token and expiry while sharing its scope',async()=>{
 const res=await POST(request());expect(res.status).toBe(200);expect(await res.json()).toEqual({success:true,destination:'https://gyms.thrivv.dev/admin/gyms'});
 const cookie=res.headers.get('set-cookie')!;expect(cookie).toContain('thrivv-session=existing-signed-session;');expect(cookie).toContain('Domain=.thrivv.dev');
 const ages=[...cookie.matchAll(/Max-Age=(\d+)/g)].map(match=>Number(match[1]));expect(ages[0]).toBe(0);expect(ages[1]).toBeGreaterThan(0);expect(ages[1]).toBeLessThanOrEqual(120);
 expect(res.headers.get('cache-control')).toContain('no-store');
});
test('cross-origin attempts cannot migrate cookies',async()=>{const res=await POST(request('/admin/gyms','https://evil.test'));expect(res.status).toBe(403);expect(res.headers.get('set-cookie')).toBeNull();expect(getAuthenticatedSession).not.toHaveBeenCalled();});
test.each(['https://evil.test','//evil.test','/api/auth/logout','/gym/../member/dashboard','/admin/gyms?next=evil',null])('rejects untrusted destination %s',async destination=>{const res=await POST(request(destination));expect(res.status).toBe(400);expect(res.headers.get('set-cookie')).toBeNull();});
test('absent or revoked session cannot be migrated',async()=>{(getAuthenticatedSession as jest.Mock).mockResolvedValue(null);const res=await POST(request());expect(res.status).toBe(401);expect(res.headers.get('set-cookie')).toBeNull();});
test('verification outage is retryable and writes no cookie',async()=>{(getAuthenticatedSession as jest.Mock).mockRejectedValue(new Error('offline'));const res=await POST(request());expect(res.status).toBe(503);expect(res.headers.get('set-cookie')).toBeNull();});
test('preview transitions stay local and never set parent-domain cookies',async()=>{const res=await POST(request('/member/dashboard','https://preview.vercel.app','preview.vercel.app'));expect(await res.json()).toEqual({success:true,destination:'/member/dashboard'});expect(res.headers.get('set-cookie')).not.toContain('Domain=');});
