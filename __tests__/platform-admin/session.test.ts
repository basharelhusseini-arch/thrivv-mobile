jest.mock('@/lib/auth',()=>({getAuthenticatedSession:jest.fn(),writeSessionCookie:jest.fn()}));
jest.mock('@/lib/supabase',()=>({supabase:{from:jest.fn()}}));
import {getAuthenticatedSession, writeSessionCookie} from '@/lib/auth';
import {supabase} from '@/lib/supabase';
import {GET} from '@/app/api/auth/me/route';
const user={id:'member',email:'synthetic@example.test',firstName:'Test',lastName:'Member'};
beforeEach(()=>{jest.resetAllMocks();(getAuthenticatedSession as jest.Mock).mockResolvedValue({token:'verified-token',session:{user,exp:2000000000}});});
function role(data:unknown,error:unknown=null){(supabase.from as jest.Mock).mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data,error})})})});}
test('role lookup failure preserves member session but hides privileged navigation',async()=>{role(null,{message:'unavailable'});const res=await GET();expect(res.status).toBe(200);expect(await res.json()).toEqual({user,isPlatformAdmin:false,permissionsAvailable:false});});
test('navigation permission follows current database role rather than a session claim',async()=>{role({is_admin:true});expect((await(await GET()).json()).isPlatformAdmin).toBe(true);role({is_admin:false});expect((await(await GET()).json()).isPlatformAdmin).toBe(false);});
test('signed-out requests return 401 without writing a session',async()=>{(getAuthenticatedSession as jest.Mock).mockResolvedValue(null);expect((await GET()).status).toBe(401);expect(supabase.from).not.toHaveBeenCalled();expect(writeSessionCookie).not.toHaveBeenCalled();});
test('ordinary session reads never emit a cookie that can overwrite a newer login',async()=>{role({is_admin:false});const res=await GET();expect(writeSessionCookie).not.toHaveBeenCalled();expect(res.headers.get('set-cookie')).toBeNull();expect(res.headers.get('cache-control')).toContain('no-store');});
test('temporary session verification failure returns retryable 503 rather than logout',async()=>{(getAuthenticatedSession as jest.Mock).mockRejectedValue(new Error('Session verification unavailable'));const spy=jest.spyOn(console,'error').mockImplementation(()=>{});try{expect((await GET()).status).toBe(503);expect(writeSessionCookie).not.toHaveBeenCalled();}finally{spy.mockRestore();}});
