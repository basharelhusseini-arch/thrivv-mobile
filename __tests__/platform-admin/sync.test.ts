jest.mock('@/lib/gym-auth',()=>({checkAdminAccess:jest.fn()}));
jest.mock('@/lib/auth',()=>({getCurrentUser:jest.fn()}));
jest.mock('@/lib/supabase',()=>({supabase:{from:jest.fn(),rpc:jest.fn()}}));
jest.mock('@/lib/whoop/sync-daily',()=>({syncDaily:jest.fn()}));
jest.mock('@/lib/whoop/sync',()=>({withWhoopLock:jest.fn(),SyncBusyError:class extends Error{}}));
import {NextRequest,NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
import {checkAdminAccess} from '@/lib/gym-auth';
import {syncDaily} from '@/lib/whoop/sync-daily';
import {withWhoopLock,SyncBusyError} from '@/lib/whoop/sync';
import {POST} from '@/app/api/admin/members/[user_id]/sync/route';
const id='00000000-0000-4000-8000-000000000001',ctx={params:{user_id:id}};
const request=()=>new NextRequest('https://gyms.thrivv.dev/api/admin/members/'+id+'/sync?date=2000-01-01',{method:'POST',headers:{origin:'https://gyms.thrivv.dev'},body:JSON.stringify({requestId:id,reason:'Member reported failed sync',date:'2000-01-01'})});
let q:any;
beforeEach(()=>{jest.resetAllMocks();(checkAdminAccess as jest.Mock).mockResolvedValue({ok:true,user:{id:'admin'}});q={select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),update:jest.fn().mockReturnThis(),maybeSingle:jest.fn().mockResolvedValue({data:{id,whoop_connected_at:'2026-01-01'},error:null}),then:(r:any)=>Promise.resolve({error:null}).then(r)};(supabase.from as jest.Mock).mockReturnValue(q);(supabase.rpc as jest.Mock).mockResolvedValue({data:true,error:null});});
test('duplicate retry returns prior acknowledgement without running WHOOP again',async()=>{
 (supabase.rpc as jest.Mock).mockResolvedValue({data:false,error:null});expect((await POST(request(),ctx)).status).toBe(200);expect(withWhoopLock).not.toHaveBeenCalled();
});
test('busy sync lock records safe failed status and does not call sync',async()=>{
 (withWhoopLock as jest.Mock).mockRejectedValue(new SyncBusyError());const res=await POST(request(),ctx);expect(res.status).toBe(409);expect(await res.json()).toEqual({status:'failed',code:'sync_busy'});expect(syncDaily).not.toHaveBeenCalled();expect(q.update).toHaveBeenCalledWith(expect.objectContaining({status:'failed',result_code:'sync_busy'}));
});
test('successful retry uses existing lock and ignores caller date overrides',async()=>{
 (withWhoopLock as jest.Mock).mockImplementation((_id,fn)=>fn());(syncDaily as jest.Mock).mockResolvedValue(NextResponse.json({ok:true}));expect((await POST(request(),ctx)).status).toBe(200);expect(withWhoopLock).toHaveBeenCalledWith(id,expect.any(Function));const [req,user]=(syncDaily as jest.Mock).mock.calls[0];expect(req.nextUrl.search).toBe('');expect(user).toBe(id);
});
