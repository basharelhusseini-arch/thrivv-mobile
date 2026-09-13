jest.mock('@/lib/auth',()=>({getCurrentUser:jest.fn()}));
jest.mock('@/lib/supabase',()=>({supabase:{from:jest.fn()}}));
import {getCurrentUser} from '@/lib/auth';
import {supabase} from '@/lib/supabase';
import {GET} from '@/app/api/auth/me/route';
const user={id:'member',email:'synthetic@example.test',firstName:'Test',lastName:'Member'};
beforeEach(()=>{jest.resetAllMocks();(getCurrentUser as jest.Mock).mockResolvedValue(user);});
function role(data:unknown,error:unknown=null){(supabase.from as jest.Mock).mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data,error})})})});}
test('role lookup failure preserves member session but hides privileged navigation',async()=>{role(null,{message:'unavailable'});const res=await GET();expect(res.status).toBe(200);expect(await res.json()).toEqual({user,isPlatformAdmin:false,permissionsAvailable:false});});
test('navigation permission follows the current database role rather than a session claim',async()=>{role({is_admin:true});expect((await(await GET()).json()).isPlatformAdmin).toBe(true);role({is_admin:false});expect((await(await GET()).json()).isPlatformAdmin).toBe(false);});
test('signed-out requests still return 401',async()=>{(getCurrentUser as jest.Mock).mockResolvedValue(null);expect((await GET()).status).toBe(401);expect(supabase.from).not.toHaveBeenCalled();});
